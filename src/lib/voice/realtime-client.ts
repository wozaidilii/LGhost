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

/** AI 発話中はマイク入力を一時停止し、スピーカー音の誤検知を防ぐ */
function setMicEnabled(track: MediaStreamTrack | undefined, enabled: boolean) {
  if (track && track.enabled !== enabled) {
    track.enabled = enabled;
  }
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
  let aiSpeaking = false;
  let pendingMicRestore: ReturnType<typeof setTimeout> | null = null;

  const muteMicWhileAiSpeaks = () => {
    if (pendingMicRestore) {
      clearTimeout(pendingMicRestore);
      pendingMicRestore = null;
    }
    aiSpeaking = true;
    setMicEnabled(micTrack, false);
  };

  const scheduleMicRestore = (delayMs = 400) => {
    if (pendingMicRestore) clearTimeout(pendingMicRestore);
    pendingMicRestore = setTimeout(() => {
      aiSpeaking = false;
      setMicEnabled(micTrack, true);
      pendingMicRestore = null;
    }, delayMs);
  };

  dc.onopen = () => {
    onStatusChange("connected");
    // 発信側: AI が最初に短く挨拶する
    dc.send(JSON.stringify({ type: "response.create" }));
  };

  dc.onmessage = (event) => {
    try {
      const msg = JSON.parse(String(event.data)) as Record<string, unknown>;
      handleAiSpeakingEvents(msg, { muteMicWhileAiSpeaks, scheduleMicRestore });
      void handleRealtimeEvent(msg, {
        dc,
        onTranscript,
        onToolCall,
        pendingToolCalls,
        isAiSpeaking: () => aiSpeaking,
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
    if (pendingMicRestore) clearTimeout(pendingMicRestore);
    onStatusChange("ended");
    mediaStream.getTracks().forEach((t) => t.stop());
    pc.close();
    audioEl.remove();
  };
}

/** AI 音声出力の開始/終了を検知してマイクを制御 */
function handleAiSpeakingEvents(
  msg: Record<string, unknown>,
  ctx: {
    muteMicWhileAiSpeaks: () => void;
    scheduleMicRestore: (delayMs?: number) => void;
  },
) {
  const type = String(msg.type ?? "");

  const aiStarted =
    type === "response.created" ||
    type === "response.output_audio.started" ||
    type === "output_audio_buffer.started";

  const aiEnded =
    type === "response.done" ||
    type === "response.output_audio.done" ||
    type === "output_audio_buffer.stopped";

  if (aiStarted) ctx.muteMicWhileAiSpeaks();
  if (aiEnded) ctx.scheduleMicRestore(500);
}

function extractTranscript(msg: Record<string, unknown>): string {
  const direct = msg.transcript ?? msg.text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const item = msg.item as { content?: Array<{ transcript?: string }> } | undefined;
  const fromItem = item?.content?.find((c) => c.transcript)?.transcript;
  return typeof fromItem === "string" ? fromItem.trim() : "";
}

/** 短すぎる・ノイズ由来と思われるユーザー転写を除外 */
function isLikelyValidUserTranscript(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  // 英語のみの短い幻聴（スピーカー漏れ）を除外
  if (/^[a-zA-Z\s.,!?'"()-]+$/.test(trimmed) && trimmed.length < 40) {
    return false;
  }
  return true;
}

async function handleRealtimeEvent(
  msg: Record<string, unknown>,
  ctx: {
    dc: RTCDataChannel;
    onTranscript: (entry: TranscriptEntry) => void;
    onToolCall: ToolCallHandler;
    pendingToolCalls: Set<string>;
    isAiSpeaking: () => boolean;
  },
) {
  const type = String(msg.type ?? "");

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
    // AI 発話中の拾い込み・英語幻聴を UI に出さない
    if (
      transcript &&
      !ctx.isAiSpeaking() &&
      isLikelyValidUserTranscript(transcript)
    ) {
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

    // ツール結果後も AI は短く返答のみ。次の質問はお客様の返答後に
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
