import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  policyStatusLabels,
  policyStatusVariant,
} from "~/lib/labels";
import { api } from "~/trpc/server";

export default async function PoliciesPage() {
  const policies = await api.policy.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">契約一覧</h1>
        <p className="text-slate-500">学資保険契約の確認管理</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>全契約 ({policies.length})</CardTitle>
          <CardDescription>確認が必要な契約を選択してください</CardDescription>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-sm text-slate-400">
              契約データがありません。seed を実行してください。
            </p>
          ) : (
            <div className="divide-y">
              {policies.map((policy) => (
                <Link
                  key={policy.id}
                  href={`/policies/${policy.id}`}
                  className="flex items-center justify-between py-4 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium">{policy.customer.name} 様</p>
                    <p className="text-sm text-slate-500">
                      被保険者: {policy.insuredChildName} ·{" "}
                      {policy.premiumAmount.toLocaleString("ja-JP")}円 ·{" "}
                      {policy.paymentMethod}
                    </p>
                  </div>
                  <Badge variant={policyStatusVariant(policy.status)}>
                    {policyStatusLabels[policy.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
