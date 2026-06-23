"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
  CHECKLIST_ITEMS,
  SCENARIO_STEPS,
  SCENARIO_TITLE,
  type ChecklistState,
} from "~/lib/voice/scenario";
import { cn } from "~/lib/utils";

export type FunctionCallRecord = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  output: string;
  ts: string;
};

type CallScenarioSidebarProps = {
  currentStep: number;
  checklist: ChecklistState;
  functionCalls: FunctionCallRecord[];
};

export function CallScenarioSidebar({
  currentStep,
  checklist,
  functionCalls,
}: CallScenarioSidebarProps) {
  const checklistDone: Record<string, boolean> = {
    name_registered: checklist.nameRegistered,
    identity_verified: checklist.identityVerified,
  };

  return (
    <aside className="flex h-full w-full flex-col gap-5 border-l bg-slate-50 p-4 lg:w-80 lg:shrink-0">
      {/* シナリオ */}
      <section>
        <p className="mb-1 text-xs font-medium text-slate-500">シナリオ</p>
        <h2 className="text-sm font-bold text-slate-900">{SCENARIO_TITLE}</h2>
      </section>

      {/* フローステップ */}
      <section>
        <p className="mb-2 text-xs font-medium text-slate-500">プロセス</p>
        <div className="flex flex-col gap-2">
          {SCENARIO_STEPS.map((step, index) => {
            const active = index === currentStep;
            const done = index < currentStep;
            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-500",
                )}
              >
                {step.label}
              </div>
            );
          })}
        </div>
      </section>

      {/* チェックリスト */}
      <section>
        <p className="mb-2 text-xs font-medium text-slate-500">チェックリスト</p>
        <ul className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const done = checklistDone[item.id] ?? false;
            return (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg border bg-white px-3 py-2"
              >
                {done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      done ? "text-emerald-800" : "text-slate-700",
                    )}
                  >
                    {item.label}
                  </p>
                  <Badge
                    variant="secondary"
                    className="mt-1 h-5 bg-emerald-100 px-1.5 text-[10px] text-emerald-700"
                  >
                    Function
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Function 呼び出し履歴 */}
      <section className="min-h-0 flex-1">
        <p className="mb-2 text-xs font-medium text-slate-500">
          Function呼び出し履歴
        </p>
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border bg-white p-2">
          {functionCalls.length === 0 ? (
            <p className="px-1 py-2 text-xs text-slate-400">
              実行されたFunctionはありません
            </p>
          ) : (
            functionCalls.map((call) => (
              <div
                key={call.id}
                className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-mono font-medium text-indigo-700">
                    {call.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {formatTime(call.ts)}
                  </span>
                </div>
                <pre className="mt-1 max-h-16 overflow-hidden text-[10px] text-slate-500">
                  {JSON.stringify(call.args, null, 0)}
                </pre>
              </div>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("ja-JP", { hour12: false });
  } catch {
    return "";
  }
}
