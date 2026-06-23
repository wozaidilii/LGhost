import Link from "next/link";
import { notFound } from "next/navigation";

import { CallTranscript } from "~/components/voice/CallTranscript";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  callTaskStatusLabels,
  callTaskStatusVariant,
  policyStatusLabels,
  sessionOutcomeLabels,
} from "~/lib/labels";
import { DIALOG_STATES } from "~/lib/dialog/states";
import { api } from "~/trpc/server";

type Props = {
  params: Promise<{ taskId: string }>;
};

export default async function CallDetailPage({ params }: Props) {
  const { taskId } = await params;

  let task;
  try {
    task = await api.callTask.getById({ id: taskId });
  } catch {
    notFound();
  }

  const latestSession = task.sessions[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/calls"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← 通話履歴
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {task.policy.customer.name} 様 — 通話詳細
          </h1>
          <p className="text-slate-500">
            {new Date(task.createdAt).toLocaleString("ja-JP")}
          </p>
        </div>
        <Badge variant={callTaskStatusVariant(task.status)}>
          {callTaskStatusLabels[task.status]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>契約情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">被保険者: </span>
              {task.policy.insuredChildName}
            </p>
            <p>
              <span className="text-slate-500">保険金額: </span>
              {task.policy.premiumAmount.toLocaleString("ja-JP")} 円
            </p>
            <p>
              <span className="text-slate-500">支払方法: </span>
              {task.policy.paymentMethod}
            </p>
            <p>
              <span className="text-slate-500">契約状態: </span>
              {policyStatusLabels[task.policy.status]}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>セッション情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {latestSession ? (
              <>
                <p>
                  <span className="text-slate-500">開始: </span>
                  {new Date(latestSession.startedAt).toLocaleString("ja-JP")}
                </p>
                {latestSession.endedAt && (
                  <p>
                    <span className="text-slate-500">終了: </span>
                    {new Date(latestSession.endedAt).toLocaleString("ja-JP")}
                  </p>
                )}
                <p>
                  <span className="text-slate-500">対話フェーズ: </span>
                  {DIALOG_STATES[
                    latestSession.dialogState as keyof typeof DIALOG_STATES
                  ] ?? latestSession.dialogState}
                </p>
                {latestSession.outcome && (
                  <p>
                    <span className="text-slate-500">結果: </span>
                    {sessionOutcomeLabels[latestSession.outcome]}
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-400">セッションなし</p>
            )}
          </CardContent>
        </Card>
      </div>

      {latestSession && (
        <Card>
          <CardHeader>
            <CardTitle>通話転写</CardTitle>
            <CardDescription>AI とお客様の会話記録</CardDescription>
          </CardHeader>
          <CardContent>
            <CallTranscript transcript={latestSession.transcript} />
          </CardContent>
        </Card>
      )}

      {task.status === "PENDING" && (
        <Button asChild>
          <Link href={`/policies/${task.policy.id}`}>通話を開始する</Link>
        </Button>
      )}
    </div>
  );
}
