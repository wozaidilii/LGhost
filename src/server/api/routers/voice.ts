import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { buildSystemPrompt } from "~/lib/voice/system-prompt";
import { REALTIME_TOOLS } from "~/lib/voice/tools";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/** GA Realtime API モデル */
const REALTIME_MODEL = "gpt-realtime";

type ClientSecretResponse = {
  value?: string;
  client_secret?: { value?: string };
};

export const voiceRouter = createTRPCRouter({
  createSession: protectedProcedure
    .input(z.object({ callTaskId: z.string(), sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!env.OPENAI_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "OPENAI_API_KEY が設定されていません。.env ファイルを確認してください。",
        });
      }

      const task = await ctx.db.callTask.findUnique({
        where: { id: input.callTaskId },
        include: { policy: { include: { customer: true } } },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "通話タスクが見つかりません" });
      }

      const instructions = buildSystemPrompt(task.policy);

      const response = await fetch(
        "https://api.openai.com/v1/realtime/client_secrets",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session: {
              type: "realtime",
              model: REALTIME_MODEL,
              instructions,
              tools: REALTIME_TOOLS,
              audio: {
                input: {
                  transcription: { model: "whisper-1" },
                  turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500,
                    create_response: true,
                    interrupt_response: true,
                  },
                },
                output: {
                  voice: "shimmer",
                },
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `OpenAI Realtime セッション作成失敗: ${errorText}`,
        });
      }

      const data = (await response.json()) as ClientSecretResponse;
      const ephemeralKey = data.value ?? data.client_secret?.value;

      if (!ephemeralKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Ephemeral key の取得に失敗しました",
        });
      }

      return {
        ephemeralKey,
        model: REALTIME_MODEL,
        sessionId: input.sessionId,
        callTaskId: input.callTaskId,
        customerName: task.policy.customer.name,
        policyId: task.policy.id,
      };
    }),
});
