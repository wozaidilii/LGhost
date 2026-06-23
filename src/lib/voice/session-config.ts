/** OpenAI Realtime セッション共通設定 */

export const REALTIME_MODEL = "gpt-realtime";

/** client_secrets 用セッション body */
export function buildRealtimeSessionConfig(
  instructions: string,
  tools: readonly unknown[],
) {
  return {
    type: "realtime" as const,
    model: REALTIME_MODEL,
    instructions,
    tools,
    // ユーザー音声転写イベントを確実に受信
    include: ["item.input_audio_transcription.logprobs"] as const,
    audio: {
      input: {
        // 近距離マイク向けノイズ低減（スピーカー再生音の拾い込み軽減）
        noise_reduction: { type: "near_field" as const },
        transcription: {
          model: "gpt-4o-mini-transcribe",
          language: "ja",
        },
        // Semantic VAD: ユーザーが話し終えるまで待つ（ChatGPT 音声に近い）
        turn_detection: {
          type: "semantic_vad" as const,
          eagerness: "low" as const,
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        voice: "shimmer" as const,
      },
    },
  };
}
