import Link from "next/link";
import { notFound } from "next/navigation";

import { StartCallButton } from "~/components/dashboard/StartCallButton";
import { Badge } from "~/components/ui/badge";
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
  policyStatusVariant,
} from "~/lib/labels";
import { api } from "~/trpc/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PolicyDetailPage({ params }: Props) {
  const { id } = await params;

  let policy;
  try {
    policy = await api.policy.getById({ id });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {policy.customer.name} 様
          </h1>
          <p className="text-slate-500">学資保険 契約詳細</p>
        </div>
        <Badge variant={policyStatusVariant(policy.status)}>
          {policyStatusLabels[policy.status]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>契約情報</CardTitle>
            <CardDescription>確認が必要な項目</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="契約者" value={policy.customer.name} />
            <InfoRow label="電話番号" value={policy.customer.phone} />
            <InfoRow label="被保険者（お子様）" value={policy.insuredChildName} />
            <InfoRow
              label="保険金額"
              value={`${policy.premiumAmount.toLocaleString("ja-JP")} 円`}
            />
            <InfoRow label="お支払い方法" value={policy.paymentMethod} />
            <InfoRow
              label="契約変更"
              value={policy.hasChanges ? "あり" : "なし"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>確認通話</CardTitle>
            <CardDescription>
              AI エージェントが契約内容を確認します
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-6">
            <StartCallButton policyId={policy.id} />
            <p className="text-center text-xs text-slate-400">
              ブラウザのマイクを使用した音声デモです
            </p>
          </CardContent>
        </Card>
      </div>

      {policy.callTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>通話履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {policy.callTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/calls/${task.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(task.createdAt).toLocaleString("ja-JP")}
                    </p>
                    <p className="text-xs text-slate-500">
                      担当: {task.user.name ?? task.user.email}
                    </p>
                  </div>
                  <Badge variant={callTaskStatusVariant(task.status)}>
                    {callTaskStatusLabels[task.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
