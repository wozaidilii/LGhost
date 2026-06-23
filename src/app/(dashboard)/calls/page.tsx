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
  callTaskStatusLabels,
  callTaskStatusVariant,
} from "~/lib/labels";
import { api } from "~/trpc/server";

export default async function CallsPage() {
  const calls = await api.callTask.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">通話履歴</h1>
        <p className="text-slate-500">すべての確認通話タスク</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>通話一覧 ({calls.length})</CardTitle>
          <CardDescription>クリックして詳細・転写を確認</CardDescription>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="text-sm text-slate-400">通話履歴がありません</p>
          ) : (
            <div className="divide-y">
              {calls.map((call) => (
                <Link
                  key={call.id}
                  href={`/calls/${call.id}`}
                  className="flex items-center justify-between py-4 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium">
                      {call.policy.customer.name} 様
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(call.createdAt).toLocaleString("ja-JP")} ·{" "}
                      担当: {call.user.name ?? "—"}
                    </p>
                  </div>
                  <Badge variant={callTaskStatusVariant(call.status)}>
                    {callTaskStatusLabels[call.status]}
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
