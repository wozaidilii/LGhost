"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { VoiceCallPanel } from "~/components/voice/VoiceCallPanel";
import { api } from "~/trpc/react";

type CallSessionViewProps = {
  taskId: string;
  /** 通話終了後の遷移先 */
  exitHref: string;
};

function CallSessionInner({ taskId, exitHref }: CallSessionViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const { data: task, isLoading } = api.callTask.getById.useQuery({ id: taskId });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-indigo-200/70">読み込み中...</p>
      </div>
    );
  }

  if (!task || !sessionId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-indigo-200/70">セッションが見つかりません</p>
        <button
          type="button"
          className="text-emerald-300 hover:underline"
          onClick={() => router.push(exitHref)}
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <VoiceCallPanel
        callTaskId={taskId}
        sessionId={sessionId}
        customerName={task.policy.customer.name}
        onEnded={() => router.push(`${exitHref}/${taskId}/done`)}
        variant="customer"
      />
    </div>
  );
}

export function CallSessionView(props: CallSessionViewProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-indigo-200/70">接続準備中...</p>
        </div>
      }
    >
      <CallSessionInner {...props} />
    </Suspense>
  );
}

/** params Promise 対応ラッパー */
export function CallSessionPageClient({
  params,
  exitHref,
}: {
  params: Promise<{ taskId: string }>;
  exitHref: string;
}) {
  const [taskId, setTaskId] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setTaskId(p.taskId));
  }, [params]);

  if (!taskId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-indigo-200/70">読み込み中...</p>
      </div>
    );
  }

  return <CallSessionView taskId={taskId} exitHref={exitHref} />;
}
