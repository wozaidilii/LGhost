export type TranscriptStatus = "transcribing" | "partial" | "final";

export type TranscriptEntry = {
  role: "user" | "assistant" | "system";
  text: string;
  ts: string;
  itemId?: string;
  status?: TranscriptStatus;
};

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "ended";

type TranscriptHandler = (
  entry: TranscriptEntry,
  action: "append" | "upsert",
) => void;

type ToolCallHandler = (
  name: string,
  args: Record<string, unknown>,
  callId: string,
) => Promise<string>;

type RealtimeClientOptions = {
  ephemeralKey: string;
  onTranscript: TranscriptHandler;
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
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
      },
    });
  } catch {
    onError("マイクへのアクセスが拒否されました");
    onStatusChange("error");
    throw new Error("Microphone access denied");
  }

  const micTrack = mediaStream.getAudioTracks()[0];
  if (micTrack) {
    pc.addTrack(micTrack, mediaStream);
  }

  const dc = pc.createDataChannel("oai-events");
  const pendingToolCalls = new Set<string>();
  /** 発話中のユーザー itemId（転写完了まで追跡） */
  let activeUserItemId: string | null = null;
  /** 部分転写の累積 */
  const partialTexts = new Map<string, string>();

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
        getActiveUserItemId: () => activeUserItemId,
        setActiveUserItemId: (id) => {
          activeUserItemId = id;
        },
        partialTexts,
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

function extractItemId(msg: Record<string, unknown>): string {
  const id = msg.item_id ?? msg.itemId;
  return typeof id === "string" && id.length > 0 ? id : "";
}

/** 明らかなスピーカー漏れ幻聴のみ除外 */
function isLikelyValidUserTranscript(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 1) return false;
  if (/^[a-zA-Z\s.,!?'"()-]+$/.test(trimmed) && trimmed.length < 25) {
    return false;
  }
  return true;
}

function upsertUserTranscript(
  ctx: {
    onTranscript: TranscriptHandler;
    partialTexts: Map<string, string>;
  },
  itemId: string,
  patch: Partial<TranscriptEntry>,
) {
  ctx.onTranscript(
    {
      role: "user",
      text: patch.text ?? "",
      ts: patch.ts ?? new Date().toISOString(),
      itemId,
      status: patch.status ?? "transcribing",
    },
    "upsert",
  );
}

async function handleRealtimeEvent(
  msg: Record<string, unknown>,
  ctx: {
    dc: RTCDataChannel;
    onTranscript: TranscriptHandler;
    onToolCall: ToolCallHandler;
    pendingToolCalls: Set<string>;
    getActiveUserItemId: () => string | null;
    setActiveUserItemId: (id: string | null) => void;
    partialTexts: Map<string, string>;
  },
) {
  const type = String(msg.type ?? "");

  // --- ユーザー発話開始 → Transcribing 表示 ---
  if (type === "input_audio_buffer.speech_started") {
    const itemId = extractItemId(msg) || createItemId();
    ctx.setActiveUserItemId(itemId);
    ctx.partialTexts.delete(itemId);
    upsertUserTranscript(ctx, itemId, {
      text: "",
      status: "transcribing",
      ts: new Date().toISOString(),
    });
  }

  // --- ユーザー発話終了 → 転写待ち ---
  if (type === "input_audio_buffer.speech_stopped") {
    const itemId = extractItemId(msg) || ctx.getActiveUserItemId();
    if (itemId) {
      upsertUserTranscript(ctx, itemId, {
        text: ctx.partialTexts.get(itemId) ?? "",
        status: "transcribing",
      });
    }
  }

  // --- ユーザー部分転写 ---
  if (
    type === "conversation.item.input_audio_transcription.delta" ||
    type === "input_audio_transcription.delta"
  ) {
    const itemId = extractItemId(msg) || ctx.getActiveUserItemId();
    const delta = String(msg.delta ?? msg.text ?? "");
    if (!itemId || !delta) return;

    const accumulated = (ctx.partialTexts.get(itemId) ?? "") + delta;
    ctx.partialTexts.set(itemId, accumulated);
    upsertUserTranscript(ctx, itemId, {
      text: accumulated,
      status: "partial",
    });
  }

  // --- ユーザー転写完了 ---
  if (
    type === "conversation.item.input_audio_transcription.completed" ||
    type === "input_audio_transcription.completed"
  ) {
    const itemId =
      extractItemId(msg) || ctx.getActiveUserItemId() || createItemId();
    const transcript =
      extractTranscript(msg) || ctx.partialTexts.get(itemId) || "";

    ctx.partialTexts.delete(itemId);
    ctx.setActiveUserItemId(null);

    if (isLikelyValidUserTranscript(transcript)) {
      ctx.onTranscript(
        {
          role: "user",
          text: transcript,
          ts: new Date().toISOString(),
          itemId,
          status: "final",
        },
        "upsert",
      );
    } else if (transcript.length === 0) {
      // 空転写は Transcribing プレースホルダーを削除
      ctx.onTranscript(
        {
          role: "user",
          text: "",
          ts: new Date().toISOString(),
          itemId,
          status: "final",
        },
        "upsert",
      );
    }
  }

  // --- AI 転写 ---
  if (
    type === "response.output_audio_transcript.done" ||
    type === "response.audio_transcript.done"
  ) {
    const transcript = extractTranscript(msg);
    if (transcript) {
      ctx.onTranscript(
        {
          role: "assistant",
          text: transcript,
          ts: new Date().toISOString(),
          itemId: createItemId(),
          status: "final",
        },
        "append",
      );
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
