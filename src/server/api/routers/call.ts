import { TRPCError } from "@trpc/server";
import {
  type CallTaskStatus,
  type PolicyStatus,
  type SessionOutcome,
  Prisma,
} from "../../../../generated/prisma";
import { z } from "zod";

import { isDialogState } from "~/lib/dialog/states";
import type { ToolName } from "~/lib/voice/tools";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const transcriptEntrySchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  text: z.string(),
  ts: z.string(),
});

export const callRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.callTask.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        policy: { include: { customer: true } },
        sessions: { orderBy: { startedAt: "desc" }, take: 1 },
        user: { select: { name: true } },
      },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.callTask.findUnique({
        where: { id: input.id },
        include: {
          policy: { include: { customer: true } },
          sessions: { orderBy: { startedAt: "desc" } },
          user: { select: { name: true, email: true } },
        },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "通話タスクが見つかりません" });
      }

      return task;
    }),

  create: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.db.policy.findUnique({
        where: { id: input.policyId },
      });

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "契約が見つかりません" });
      }

      return ctx.db.callTask.create({
        data: {
          policyId: input.policyId,
          createdBy: ctx.session.user.id,
          status: "PENDING",
        },
        include: {
          policy: { include: { customer: true } },
        },
      });
    }),

  startSession: protectedProcedure
    .input(z.object({ callTaskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.callTask.findUnique({
        where: { id: input.callTaskId },
        include: { sessions: { where: { endedAt: null } } },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "通話タスクが見つかりません" });
      }

      if (task.sessions.length > 0) {
        return task.sessions[0]!;
      }

      const [session] = await ctx.db.$transaction([
        ctx.db.callSession.create({
          data: {
            callTaskId: input.callTaskId,
            dialogState: "greeting",
          },
        }),
        ctx.db.callTask.update({
          where: { id: input.callTaskId },
          data: { status: "IN_PROGRESS" },
        }),
      ]);

      return session;
    }),

  endSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        transcript: z.array(transcriptEntrySchema),
        outcome: z
          .enum([
            "CONFIRMED",
            "CHANGES_REPORTED",
            "TRANSFERRED",
            "NO_ANSWER",
            "FAILED",
          ])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.callSession.findUnique({
        where: { id: input.sessionId },
        include: { callTask: true },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "セッションが見つかりません" });
      }

      const taskStatus: CallTaskStatus =
        input.outcome === "TRANSFERRED"
          ? "TRANSFERRED"
          : input.outcome === "FAILED" || input.outcome === "NO_ANSWER"
            ? "FAILED"
            : "COMPLETED";

      let policyStatus: PolicyStatus | undefined;
      if (input.outcome === "CONFIRMED") {
        policyStatus = "CONFIRMED";
      } else if (input.outcome === "CHANGES_REPORTED") {
        policyStatus = "CHANGES_REPORTED";
      } else if (input.outcome === "TRANSFERRED") {
        policyStatus = "TRANSFERRED";
      }

      await ctx.db.$transaction([
        ctx.db.callSession.update({
          where: { id: input.sessionId },
          data: {
            endedAt: new Date(),
            outcome: input.outcome ?? null,
            transcript: input.transcript,
          },
        }),
        ctx.db.callTask.update({
          where: { id: session.callTaskId },
          data: { status: taskStatus },
        }),
        ...(policyStatus
          ? [
              ctx.db.policy.update({
                where: { id: session.callTask.policyId },
                data: { status: policyStatus },
              }),
            ]
          : []),
      ]);

      return { success: true };
    }),

  executeTool: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        toolName: z.string(),
        args: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.callSession.findUnique({
        where: { id: input.sessionId },
        include: {
          callTask: { include: { policy: { include: { customer: true } } } },
        },
      });

      if (!session) {
        return { output: JSON.stringify({ error: "Session not found" }) };
      }

      const toolName = input.toolName as ToolName;
      const args = input.args;
      const fieldChecks =
        (session.fieldChecks as Record<string, unknown>) ?? {};

      switch (toolName) {
        case "verify_identity": {
          const verified = Boolean(args.verified);
          fieldChecks.identityVerified = verified;
          if (isDialogState(String(args.dialogState ?? ""))) {
            // noop
          }
          await ctx.db.callSession.update({
            where: { id: input.sessionId },
            data: {
              fieldChecks: fieldChecks as Prisma.InputJsonValue,
              dialogState: verified ? "identity_check" : "transfer",
            },
          });
          return {
            output: JSON.stringify({
              success: true,
              verified,
              message: verified
                ? "本人確認を記録しました"
                : "本人確認失敗を記録しました",
            }),
          };
        }

        case "confirm_policy_field": {
          const field = String(args.field ?? "");
          fieldChecks[field] = {
            confirmed: Boolean(args.confirmed),
            value: args.value ?? null,
            at: new Date().toISOString(),
          };
          await ctx.db.callSession.update({
            where: { id: input.sessionId },
            data: {
              fieldChecks: fieldChecks as Prisma.InputJsonValue,
              dialogState: "contract_confirm",
            },
          });
          return {
            output: JSON.stringify({
              success: true,
              field,
              recorded: true,
            }),
          };
        }

        case "lookup_faq": {
          const query = String(args.query ?? "");
          const entries = await ctx.db.faqEntry.findMany();
          const q = query.toLowerCase();
          const matched = entries.filter(
            (e) =>
              e.question.toLowerCase().includes(q) ||
              e.answer.toLowerCase().includes(q),
          );

          if (matched.length === 0) {
            return {
              output: JSON.stringify({
                found: false,
                answer:
                  "該当するFAQが見つかりませんでした。詳細はオペレーターにお繋ぎできます。",
              }),
            };
          }

          return {
            output: JSON.stringify({
              found: true,
              answer: matched.map((m) => `${m.question}: ${m.answer}`).join("\n"),
            }),
          };
        }

        case "update_call_status": {
          const dialogState = String(args.dialogState ?? "greeting");
          const outcome = args.outcome as SessionOutcome | undefined;

          const updates: {
            dialogState: string;
            outcome?: SessionOutcome;
          } = {
            dialogState: isDialogState(dialogState)
              ? dialogState
              : session.dialogState,
          };

          if (outcome) {
            updates.outcome = outcome;
          }

          await ctx.db.callSession.update({
            where: { id: input.sessionId },
            data: updates,
          });

          if (outcome === "CONFIRMED") {
            await ctx.db.callTask.update({
              where: { id: session.callTaskId },
              data: { status: "COMPLETED" },
            });
            await ctx.db.policy.update({
              where: { id: session.callTask.policyId },
              data: { status: "CONFIRMED" },
            });
          } else if (outcome === "CHANGES_REPORTED") {
            await ctx.db.policy.update({
              where: { id: session.callTask.policyId },
              data: { status: "CHANGES_REPORTED", hasChanges: true },
            });
          }

          return {
            output: JSON.stringify({ success: true, dialogState, outcome }),
          };
        }

        case "request_human_transfer": {
          const reason = String(args.reason ?? "お客様希望");
          await ctx.db.$transaction([
            ctx.db.callSession.update({
              where: { id: input.sessionId },
              data: {
                dialogState: "transfer",
                outcome: "TRANSFERRED",
              },
            }),
            ctx.db.callTask.update({
              where: { id: session.callTaskId },
              data: { status: "TRANSFERRED" },
            }),
            ctx.db.policy.update({
              where: { id: session.callTask.policyId },
              data: { status: "TRANSFERRED" },
            }),
          ]);

          return {
            output: JSON.stringify({
              success: true,
              transferred: true,
              reason,
              message: "オペレーターへの転送を記録しました",
            }),
          };
        }

        default:
          return {
            output: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
          };
      }
    }),

  appendTranscript: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        entry: transcriptEntrySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.callSession.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) return { success: false };

      const transcript = Array.isArray(session.transcript)
        ? (session.transcript as z.infer<typeof transcriptEntrySchema>[])
        : [];

      transcript.push(input.entry);

      await ctx.db.callSession.update({
        where: { id: input.sessionId },
        data: { transcript },
      });

      return { success: true };
    }),
});
