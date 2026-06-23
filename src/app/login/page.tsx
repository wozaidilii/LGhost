import { Phone } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { auth, signIn } from "~/server/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>ログイン済み</CardTitle>
            <CardDescription>
              {session.user?.name ?? session.user?.email} としてログイン中
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/dashboard">ダッシュボードへ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
            <Phone className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">L-Ghost</CardTitle>
          <CardDescription>
            AI 音声エージェントによる学資保険契約確認プラットフォーム
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              Google でログイン
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-400">
            Gen-AX X-Ghost MVP — ブラウザ音声デモ
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
