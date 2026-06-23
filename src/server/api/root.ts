import { callRouter } from "~/server/api/routers/call";
import { dashboardRouter, faqRouter } from "~/server/api/routers/dashboard";
import { policyRouter } from "~/server/api/routers/policy";
import { voiceRouter } from "~/server/api/routers/voice";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  policy: policyRouter,
  callTask: callRouter,
  voice: voiceRouter,
  faq: faqRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
