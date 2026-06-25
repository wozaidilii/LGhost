import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/server";

type Props = {
  params: Promise<{ taskId: string }>;
};

export default async function CallDonePage({ params }: Props) {
  const { taskId } = await params;

  let customerName = "お客様";
  try {
    const task = await api.callTask.getById({ id: taskId });
    customerName = task.policy.customer.name;
  } catch {
    // タスク取得失敗時も完了画面は表示
  }

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <CheckCircle2 className="mb-6 h-16 w-16 text-emerald-400" />
      <h1 className="text-2xl font-bold text-white">通話が終了しました</h1>
      <p className="mt-3 text-indigo-100/80">
        {customerName} 様 — ご利用ありがとうございました。
      </p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <Button
          asChild
          className="w-full bg-emerald-500 hover:bg-emerald-400"
        >
          <Link href="/call">もう一度通話する</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
        >
          <Link href="/dashboard">管理画面へ</Link>
        </Button>
      </div>
    </div>
  );
}
