import type { TranscriptEntry } from "~/lib/voice/realtime-client";
import { cn } from "~/lib/utils";

type CallTranscriptProps = {
  transcript: TranscriptEntry[] | unknown;
  className?: string;
};

function parseTranscript(raw: unknown): TranscriptEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is TranscriptEntry =>
      typeof item === "object" &&
      item !== null &&
      "role" in item &&
      "text" in item,
  );
}

export function CallTranscript({ transcript, className }: CallTranscriptProps) {
  const entries = parseTranscript(transcript);

  if (entries.length === 0) {
    return (
      <p className={cn("text-sm text-slate-400", className)}>
        転写データがありません
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {entries.map((entry, i) => (
        <div key={`${entry.ts}-${i}`} className="flex gap-3">
          <time className="shrink-0 text-xs text-slate-400">
            {new Date(entry.ts).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </time>
          <div
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm",
              entry.role === "assistant"
                ? "bg-indigo-50 text-indigo-900"
                : entry.role === "user"
                  ? "bg-slate-50"
                  : "bg-amber-50 text-amber-900",
            )}
          >
            <span className="mr-2 text-xs font-semibold uppercase opacity-60">
              {entry.role === "assistant"
                ? "AI"
                : entry.role === "user"
                  ? "お客様"
                  : "SYS"}
            </span>
            {entry.text}
          </div>
        </div>
      ))}
    </div>
  );
}
