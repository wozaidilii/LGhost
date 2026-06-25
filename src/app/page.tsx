import Link from "next/link";
import { LayoutDashboard, PhoneCall } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { auth } from "~/server/auth";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">L-Ghost</h1>
          <p className="mt-2 text-indigo-200/80">
            学資保険 AI 音声エージェント — 利用目的を選択してください
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-emerald-500/30 bg-emerald-950/30 shadow-xl backdrop-blur">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                <PhoneCall className="h-6 w-6 text-emerald-300" />
              </div>
              <CardTitle className="text-white">契約確認通話</CardTitle>
              <CardDescription className="text-emerald-100/70">
                お客様向け — AI オペレーターと音声で契約内容を確認
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                className="w-full bg-emerald-500 hover:bg-emerald-400"
                size="lg"
              >
                <Link href="/call">通話を開始</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20">
                <LayoutDashboard className="h-6 w-6 text-indigo-300" />
              </div>
              <CardTitle className="text-white">管理画面</CardTitle>
              <CardDescription className="text-indigo-200/70">
                管理者向け — 契約・通話履歴・FAQ・エージェント設定
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full" size="lg">
                <Link href="/dashboard">管理画面へ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-indigo-300/50">
          {session.user.name ?? session.user.email} としてログイン中
        </p>
      </div>
    </div>
  );
}
