import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const policyRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "PENDING_CONFIRMATION",
              "CONFIRMED",
              "CHANGES_REPORTED",
              "TRANSFERRED",
            ])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.policy.findMany({
        where: input?.status ? { status: input.status } : undefined,
        include: {
          customer: true,
          callTasks: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const policy = await ctx.db.policy.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          callTasks: {
            orderBy: { createdAt: "desc" },
            include: {
              sessions: { orderBy: { startedAt: "desc" } },
              user: { select: { name: true, email: true } },
            },
          },
        },
      });

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "契約が見つかりません" });
      }

      return policy;
    }),
});
