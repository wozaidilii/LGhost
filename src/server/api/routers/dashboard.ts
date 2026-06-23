import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      pendingPolicies,
      completedToday,
      transferredToday,
      totalCalls,
      recentTasks,
    ] = await Promise.all([
      ctx.db.policy.count({
        where: { status: "PENDING_CONFIRMATION" },
      }),
      ctx.db.callTask.count({
        where: {
          status: "COMPLETED",
          updatedAt: { gte: todayStart },
        },
      }),
      ctx.db.callTask.count({
        where: {
          status: "TRANSFERRED",
          updatedAt: { gte: todayStart },
        },
      }),
      ctx.db.callTask.count(),
      ctx.db.callTask.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          policy: { include: { customer: true } },
          sessions: { orderBy: { startedAt: "desc" }, take: 1 },
        },
      }),
    ]);

    return {
      pendingPolicies,
      completedToday,
      transferredToday,
      totalCalls,
      recentTasks,
    };
  }),
});

export const faqRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.faqEntry.findMany({ orderBy: { question: "asc" } });
  }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.faqEntry.findMany();
      const q = input.query.toLowerCase();

      const matched = entries.filter(
        (e) =>
          e.question.toLowerCase().includes(q) ||
          e.answer.toLowerCase().includes(q),
      );

      if (matched.length === 0) {
        return {
          found: false as const,
          answer:
            "申し訳ございません。該当する情報が見つかりませんでした。オペレーターにお繋ぎすることも可能です。",
        };
      }

      return {
        found: true as const,
        answer: matched.map((m) => m.answer).join("\n\n"),
        matches: matched,
      };
    }),
});
