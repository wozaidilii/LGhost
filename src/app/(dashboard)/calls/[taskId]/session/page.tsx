"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { VoiceCallPanel } from "~/components/voice/VoiceCallPanel";
import { api } from "~/trpc/react";

function SessionPageInner({ taskId }: { taskId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const { data: task, isLoading } = api.callTask.getById.useQuery({ id: taskId });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  if (!task || !sessionId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-slate-500">セッションが見つかりません</p>
        <button
          type="button"
          className="text-indigo-600 hover:underline"
          onClick={() =>
            router.push(task ? `/policies/${task.policy.id}` : "/policies")
          }
        >
          契約詳細に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">確認通話</h1>
        <p className="text-sm text-slate-500">
          {task.policy.customer.name} 様 — 学資保険契約確認
        </p>
      </div>

      <VoiceCallPanel
        callTaskId={taskId}
        sessionId={sessionId}
        customerName={task.policy.customer.name}
        onEnded={() => router.push(`/calls/${taskId}`)}
      />
    </div>
  );
}

export default function CallSessionPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const [taskId, setTaskId] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setTaskId(p.taskId));
  }, [params]);

  if (!taskId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-slate-400">接続準備中...</p>
        </div>
      }
    >
      <SessionPageInner taskId={taskId} />
    </Suspense>
  );
}
