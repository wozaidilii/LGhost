"use client";

import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  UserRound,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  connectRealtime,
  formatDuration,
  type RealtimeStatus,
  type TranscriptEntry,
} from "~/lib/voice/realtime-client";
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
  const [muted, setMuted] = useState(false);
  const disconnectRef = useRef<(() => void) | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const outcomeRef = useRef<
    "CONFIRMED" | "CHANGES_REPORTED" | "TRANSFERRED" | "FAILED" | undefined
  >(undefined);

  const createSession = api.voice.createSession.useMutation();
  const executeTool = api.callTask.executeTool.useMutation();
  const appendTranscript = api.callTask.appendTranscript.useMutation();
  const endSession = api.callTask.endSession.useMutation();

  const handleToolCall = useCallback(
    async (name: string, args: Record<string, unknown>, _callId: string) => {
      const result = await executeTool.mutateAsync({
        sessionId,
        toolName: name,
        args,
      });

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
        model: session.model,
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

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      {/* 着信 UI */}
      <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Badge variant="secondary" className="bg-white/10 text-white">
            X-Ghost AI
          </Badge>
          <span className="font-mono text-sm text-slate-300">
            {formatDuration(duration)}
          </span>
        </div>

        <div className="mb-8 flex flex-col items-center gap-4">
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center rounded-full bg-indigo-500/20",
              status === "connected" && "animate-pulse",
            )}
          >
            <UserRound className="h-12 w-12 text-indigo-300" />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-400">発信先</p>
            <h2 className="text-2xl font-bold">{customerName} 様</h2>
            <p className="mt-1 text-sm text-slate-400">学資保険 契約内容確認</p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2 text-sm">
          <StatusIndicator status={status} />
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 p-3 text-center text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-6">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setMuted((m) => !m)}
            disabled={status !== "connected"}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="h-16 w-16 rounded-full"
            onClick={() => void hangUp()}
            disabled={status === "ended" || endSession.isPending}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
            disabled
          >
            <Volume2 className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* リアルタイム転写 */}
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4 text-indigo-600" />
          <h3 className="font-semibold">通話内容</h3>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {transcript.length === 0 ? (
            <p className="text-sm text-slate-400">通話を開始しています...</p>
          ) : (
            transcript.map((entry, i) => (
              <div
                key={`${entry.ts}-${i}`}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  entry.role === "assistant"
                    ? "bg-indigo-50 text-indigo-900"
                    : "bg-slate-50 text-slate-800",
                )}
              >
                <span className="mr-2 text-xs font-medium opacity-60">
                  {entry.role === "assistant" ? "AI" : "お客様"}
                </span>
                {entry.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusIndicator({ status }: { status: RealtimeStatus }) {
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
    <>
      <span className={cn("h-2 w-2 rounded-full", colors[status])} />
      <span className="text-slate-300">{labels[status]}</span>
    </>
  );
}
