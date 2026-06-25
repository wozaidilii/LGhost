"use client";

import { Loader2, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  CallScenarioSidebar,
  type FunctionCallRecord,
} from "~/components/voice/CallScenarioSidebar";
import {
  connectRealtime,
  formatDuration,
  type RealtimeStatus,
  type TranscriptEntry,
} from "~/lib/voice/realtime-client";
import {
  dialogStateToStep,
  initialChecklistState,
  type ChecklistState,
} from "~/lib/voice/scenario";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type VoiceCallPanelProps = {
  callTaskId: string;
  sessionId: string;
  customerName: string;
  onEnded?: () => void;
  /** admin: サイドバー付き管理 UI / customer: お客様向けシンプル UI */
  variant?: "admin" | "customer";
};

export function VoiceCallPanel({
  callTaskId,
  sessionId,
  customerName,
  onEnded,
  variant = "admin",
}: VoiceCallPanelProps) {
  const isCustomer = variant === "customer";
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [duration, setDuration] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistState>(initialChecklistState);
  const [functionCalls, setFunctionCalls] = useState<FunctionCallRecord[]>([]);

  const disconnectRef = useRef<(() => void) | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<
    "CONFIRMED" | "CHANGES_REPORTED" | "TRANSFERRED" | "FAILED" | undefined
  >(undefined);

  const createSession = api.voice.createSession.useMutation();
  const executeTool = api.callTask.executeTool.useMutation();
  const appendTranscript = api.callTask.appendTranscript.useMutation();
  const endSession = api.callTask.endSession.useMutation();

  const handleToolCall = useCallback(
    async (name: string, args: Record<string, unknown>, callId: string) => {
      const result = await executeTool.mutateAsync({
        sessionId,
        toolName: name,
        args,
      });

      setFunctionCalls((prev) => [
        ...prev,
        {
          id: callId,
          name,
          args,
          output: result.output,
          ts: new Date().toISOString(),
        },
      ]);

      if (name === "register_customer_name") {
        setChecklist((c) => ({ ...c, nameRegistered: true }));
      }
      if (name === "verify_identity" && args.verified) {
        setChecklist((c) => ({ ...c, identityVerified: true }));
      }
      if (name === "update_call_status") {
        const step = dialogStateToStep(String(args.dialogState ?? ""));
        setCurrentStep(step);
      }
      if (name === "confirm_policy_field") {
        setCurrentStep((s) => (s < 1 ? 0 : s));
      }
      if (name === "lookup_faq") {
        setCurrentStep((s) => Math.max(s, 1));
      }

      if (name === "request_human_transfer") {
        outcomeRef.current = "TRANSFERRED";
      } else if (name === "update_call_status" && args.outcome) {
        outcomeRef.current = args.outcome as typeof outcomeRef.current;
      }

      return result.output;
    },
    [executeTool, sessionId],
  );

  const handleTranscript = useCallback(
    (entry: TranscriptEntry, action: "append" | "upsert") => {
      const items = [...transcriptRef.current];

      if (action === "upsert" && entry.itemId) {
        const idx = items.findIndex((e) => e.itemId === entry.itemId);
        if (idx >= 0) {
          // 空の final はプレースホルダー削除
          if (entry.status === "final" && !entry.text.trim()) {
            items.splice(idx, 1);
          } else {
            items[idx] = { ...items[idx], ...entry };
          }
        } else if (!(entry.status === "final" && !entry.text.trim())) {
          items.push(entry);
        }
      } else {
        items.push(entry);
      }

      transcriptRef.current = items;
      setTranscript(items);

      if (
        entry.status === "final" &&
        entry.text.trim() &&
        (entry.role === "user" || entry.role === "assistant")
      ) {
        void appendTranscript.mutate({
          sessionId,
          entry: {
            role: entry.role,
            text: entry.text,
            ts: entry.ts,
            itemId: entry.itemId,
          },
        });
      }
    },
    [appendTranscript, sessionId],
  );

  const startCall = useCallback(async () => {
    setError(null);
    try {
      const session = await createSession.mutateAsync({
        callTaskId,
        sessionId,
      });

      const disconnect = await connectRealtime({
        ephemeralKey: session.ephemeralKey,
        onTranscript: handleTranscript,
        onToolCall: handleToolCall,
        onStatusChange: setStatus,
        onError: setError,
      });

      disconnectRef.current = disconnect;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "接続に失敗しました");
    }
  }, [callTaskId, sessionId, createSession, handleTranscript, handleToolCall]);

  const hangUp = useCallback(async () => {
    disconnectRef.current?.();
    disconnectRef.current = null;

    const finalTranscript = transcriptRef.current.filter(
      (e) => e.status === "final" || !e.status,
    );

    await endSession.mutateAsync({
      sessionId,
      transcript: finalTranscript,
      outcome: outcomeRef.current,
    });

    onEnded?.();
  }, [endSession, sessionId, onEnded]);

  useEffect(() => {
    void startCall();
    return () => {
      disconnectRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border shadow-sm",
        isCustomer
          ? "h-[calc(100vh-5rem)] border-white/10 bg-slate-900/80"
          : "h-[calc(100vh-8rem)] bg-white",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between border-b px-4 py-3",
          isCustomer && "border-white/10",
        )}
      >
        <div>
          <p
            className={cn(
              "text-xs",
              isCustomer ? "text-indigo-200/70" : "text-slate-500",
            )}
          >
            確認通話 — {customerName} 様
          </p>
          <StatusBar status={status} duration={duration} dark={isCustomer} />
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="gap-2"
          onClick={() => void hangUp()}
          disabled={status === "ended" || endSession.isPending}
        >
          <PhoneOff className="h-4 w-4" />
          通話終了
        </Button>
      </header>

      {error && (
        <div
          className={cn(
            "border-b px-4 py-2 text-sm",
            isCustomer
              ? "border-red-500/30 bg-red-950/50 text-red-200"
              : "bg-red-50 text-red-700",
          )}
        >
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 lg:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          {status === "connecting" ? (
            <div className="flex h-full items-center justify-center">
              <p
                className={cn(
                  "text-sm",
                  isCustomer ? "text-indigo-200/60" : "text-slate-400",
                )}
              >
                通話を接続しています...
              </p>
            </div>
          ) : transcript.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p
                className={cn(
                  "text-sm",
                  isCustomer ? "text-indigo-200/60" : "text-slate-400",
                )}
              >
                会話が始まるとここに表示されます
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              {transcript.map((entry, i) => (
                <TranscriptBubble
                  key={entry.itemId ?? `${entry.ts}-${i}`}
                  entry={entry}
                  dark={isCustomer}
                />
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {!isCustomer && (
          <CallScenarioSidebar
            currentStep={currentStep}
            checklist={checklist}
            functionCalls={functionCalls}
          />
        )}
      </div>
    </div>
  );
}

function TranscriptBubble({
  entry,
  dark = false,
}: {
  entry: TranscriptEntry;
  dark?: boolean;
}) {
  const isAssistant = entry.role === "assistant";
  const time = formatTimestamp(entry.ts);
  const isTranscribing =
    entry.status === "transcribing" || entry.status === "partial";

  return (
    <div
      className={cn(
        "flex w-full",
        isAssistant ? "justify-start" : "justify-end",
      )}
    >
      <div
        className={cn(
          "max-w-[min(85%,36rem)] space-y-1",
          isAssistant ? "items-start" : "items-end",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 text-[10px]",
            dark ? "text-indigo-300/50" : "text-slate-400",
            !isAssistant && "justify-end",
          )}
        >
          <span>{time}</span>
          {entry.itemId && <span className="font-mono">{entry.itemId}</span>}
        </div>

        {isTranscribing ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm",
              isAssistant
                ? "rounded-tl-md bg-slate-100 text-slate-500"
                : "rounded-tr-md border border-blue-200 bg-blue-50 text-blue-600",
            )}
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span className="font-medium">【Transcribing】</span>
            {entry.status === "partial" && entry.text && (
              <span className="text-blue-400">{entry.text}</span>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
              isAssistant
                ? "rounded-tl-md bg-slate-100 text-slate-800"
                : "rounded-tr-md bg-blue-500 text-white",
            )}
          >
            {entry.text}
          </div>
        )}

        {!isTranscribing && !dark && (
          <Badge
            variant="secondary"
            className="h-5 bg-emerald-100 text-[10px] text-emerald-700"
          >
            {isAssistant ? "Guardrail: Pass" : "Prompt Shield: Pass"}
          </Badge>
        )}
      </div>
    </div>
  );
}

function StatusBar({
  status,
  duration,
  dark = false,
}: {
  status: RealtimeStatus;
  duration: number;
  dark?: boolean;
}) {
  const labels: Record<RealtimeStatus, string> = {
    idle: "待機中",
    connecting: "接続中...",
    connected: "通話中",
    error: "エラー",
    ended: "終了",
  };

  const colors: Record<RealtimeStatus, string> = {
    idle: "bg-slate-400",
    connecting: "bg-amber-400 animate-pulse",
    connected: "bg-emerald-400 animate-pulse",
    error: "bg-red-400",
    ended: "bg-slate-400",
  };

  return (
    <div className="mt-0.5 flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full", colors[status])} />
      <span
        className={cn(
          "text-sm font-medium",
          dark ? "text-indigo-100" : "text-slate-700",
        )}
      >
        {labels[status]}
      </span>
      <span
        className={cn(
          "font-mono text-sm",
          dark ? "text-indigo-300/60" : "text-slate-400",
        )}
      >
        {formatDuration(duration)}
      </span>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("ja-JP", { hour12: false });
  } catch {
    return "";
  }
}
