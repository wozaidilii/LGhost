export type TranscriptEntry = {
  role: "user" | "assistant" | "system";
  text: string;
  ts: string;
  itemId?: string;
};

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "ended";

type ToolCallHandler = (
  name: string,
  args: Record<string, unknown>,
  callId: string,
) => Promise<string>;

type RealtimeClientOptions = {
  ephemeralKey: string;
  onTranscript: (entry: TranscriptEntry) => void;
  onToolCall: ToolCallHandler;
  onStatusChange: (status: RealtimeStatus) => void;
  onError: (message: string) => void;
};

function createItemId(): string {
  const rand = Math.random().toString(36).slice(2, 11);
  return `item_${Date.now().toString(36)}${rand}`;
}

/** OpenAI Realtime API WebRTC 接続（GA） */
export async function connectRealtime(
  options: RealtimeClientOptions,
): Promise<() => void> {
  const { ephemeralKey, onTranscript, onToolCall, onStatusChange, onError } =
    options;

  onStatusChange("connecting");

  const pc = new RTCPeerConnection();
  const audioEl = document.createElement("audio");
  audioEl.autoplay = true;

  pc.ontrack = (event) => {
    const stream = event.streams[0];
    if (stream) {
      audioEl.srcObject = stream;
    }
  };

  let mediaStream: MediaStream;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    onError("マイクへのアクセスが拒否されました");
    onStatusChange("error");
    throw new Error("Microphone access denied");
  }

  const track = mediaStream.getTracks()[0];
  if (track) {
    pc.addTrack(track, mediaStream);
  }

  const dc = pc.createDataChannel("oai-events");
  const pendingToolCalls = new Set<string>();

  dc.onopen = () => {
    onStatusChange("connected");
    dc.send(JSON.stringify({ type: "response.create" }));
  };

  dc.onmessage = (event) => {
    try {
      const msg = JSON.parse(String(event.data)) as Record<string, unknown>;
      void handleRealtimeEvent(msg, {
        dc,
        onTranscript,
        onToolCall,
        pendingToolCalls,
      });
    } catch {
      // 解析不能なイベントは無視
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${ephemeralKey}`,
      "Content-Type": "application/sdp",
    },
  });

  if (!sdpResponse.ok) {
    const errText = await sdpResponse.text();
    onError(`WebRTC 接続失敗: ${errText}`);
    onStatusChange("error");
    throw new Error(errText);
  }

  const answerSdp = await sdpResponse.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  return () => {
    onStatusChange("ended");
    mediaStream.getTracks().forEach((t) => t.stop());
    pc.close();
    audioEl.remove();
  };
}

function extractTranscript(msg: Record<string, unknown>): string {
  const direct = msg.transcript ?? msg.text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const item = msg.item as { content?: Array<{ transcript?: string }> } | undefined;
  const fromItem = item?.content?.find((c) => c.transcript)?.transcript;
  return typeof fromItem === "string" ? fromItem.trim() : "";
}

async function handleRealtimeEvent(
  msg: Record<string, unknown>,
  ctx: {
    dc: RTCDataChannel;
    onTranscript: (entry: TranscriptEntry) => void;
    onToolCall: ToolCallHandler;
    pendingToolCalls: Set<string>;
  },
) {
  const type = String(msg.type ?? "");

  // GA / Legacy 双方の AI 転写イベント
  if (
    type === "response.output_audio_transcript.done" ||
    type === "response.audio_transcript.done"
  ) {
    const transcript = extractTranscript(msg);
    if (transcript) {
      ctx.onTranscript({
        role: "assistant",
        text: transcript,
        ts: new Date().toISOString(),
        itemId: createItemId(),
      });
    }
  }

  if (type === "conversation.item.input_audio_transcription.completed") {
    const transcript = extractTranscript(msg);
    if (transcript) {
      ctx.onTranscript({
        role: "user",
        text: transcript,
        ts: new Date().toISOString(),
        itemId: createItemId(),
      });
    }
  }

  if (type === "response.function_call_arguments.done") {
    const callId = String(msg.call_id ?? "");
    const name = String(msg.name ?? "");
    const argsRaw = String(msg.arguments ?? "{}");

    if (!callId || ctx.pendingToolCalls.has(callId)) return;
    ctx.pendingToolCalls.add(callId);

    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsRaw) as Record<string, unknown>;
    } catch {
      args = {};
    }

    const output = await ctx.onToolCall(name, args, callId);

    ctx.dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output,
        },
      }),
    );

    ctx.dc.send(JSON.stringify({ type: "response.create" }));
    ctx.pendingToolCalls.delete(callId);
  }

  if (type === "error") {
    const error = msg.error as { message?: string } | undefined;
    console.error("Realtime error:", error?.message);
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
