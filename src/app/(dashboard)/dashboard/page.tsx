import { CheckCircle, Clock, PhoneForwarded, FileText } from "lucide-react";
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
  policyStatusLabels,
} from "~/lib/labels";
import { api } from "~/trpc/server";

export default async function DashboardPage() {
  const stats = await api.dashboard.stats();

  const statCards = [
    {
      title: "確認待ち契約",
      value: stats.pendingPolicies,
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "本日完了",
      value: stats.completedToday,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "本日転送",
      value: stats.transferredToday,
      icon: PhoneForwarded,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "総通話数",
      value: stats.totalCalls,
      icon: Clock,
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="text-slate-500">学資保険契約確認の概要</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ title, value, icon: Icon, color, bg }) => (
          <Card key={title}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-xl p-3 ${bg}`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近の通話</CardTitle>
          <CardDescription>直近5件の通話タスク</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentTasks.length === 0 ? (
            <p className="text-sm text-slate-400">通話履歴がありません</p>
          ) : (
            <div className="divide-y">
              {stats.recentTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/calls/${task.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium">
                      {task.policy.customer.name} 様
                    </p>
                    <p className="text-sm text-slate-500">
                      {policyStatusLabels[task.policy.status]} ·{" "}
                      {new Date(task.createdAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <Badge variant={callTaskStatusVariant(task.status)}>
                    {callTaskStatusLabels[task.status]}
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
