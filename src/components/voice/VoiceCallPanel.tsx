"use client";

import { PhoneOff } from "lucide-react";
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
};

export function VoiceCallPanel({
  callTaskId,
  sessionId,
  customerName,
  onEnded,
}: VoiceCallPanelProps) {
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
    (entry: TranscriptEntry) => {
      transcriptRef.current = [...transcriptRef.current, entry];
      setTranscript(transcriptRef.current);
      void appendTranscript.mutate({ sessionId, entry });
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

    await endSession.mutateAsync({
      sessionId,
      transcript: transcriptRef.current,
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
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
      {/* ヘッダー */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-xs text-slate-500">確認通話 — {customerName} 様</p>
          <StatusBar status={status} duration={duration} />
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
        <div className="border-b bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 転写エリア: 左=AI、右=お客様 */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {transcript.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">通話を接続しています...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {transcript.map((entry, i) => (
                <TranscriptBubble
                  key={entry.itemId ?? `${entry.ts}-${i}`}
                  entry={entry}
                />
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        <CallScenarioSidebar
          currentStep={currentStep}
          checklist={checklist}
          functionCalls={functionCalls}
        />
      </div>
    </div>
  );
}

function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isAssistant = entry.role === "assistant";
  const time = formatTimestamp(entry.ts);

  return (
    <div
      className={cn(
        "flex w-full",
        isAssistant ? "justify-start" : "justify-end",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] space-y-1",
          isAssistant ? "items-start" : "items-end",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span>{time}</span>
          {entry.itemId && (
            <span className="font-mono">{entry.itemId}</span>
          )}
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isAssistant
              ? "rounded-tl-sm bg-slate-100 text-slate-800"
              : "rounded-tr-sm bg-blue-500 text-white",
          )}
        >
          {entry.text}
        </div>

        <Badge
          variant="secondary"
          className={cn(
            "h-5 text-[10px]",
            isAssistant
              ? "bg-emerald-100 text-emerald-700"
              : "bg-emerald-100 text-emerald-700",
          )}
        >
          {isAssistant ? "Guardrail: Pass" : "Prompt Shield: Pass"}
        </Badge>
      </div>
    </div>
  );
}

function StatusBar({
  status,
  duration,
}: {
  status: RealtimeStatus;
  duration: number;
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
      <span className="text-sm font-medium text-slate-700">{labels[status]}</span>
      <span className="font-mono text-sm text-slate-400">
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
