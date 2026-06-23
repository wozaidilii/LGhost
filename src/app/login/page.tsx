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

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const authErrors: Record<string, string> = {
  Configuration:
    "認証設定エラー: AUTH_SECRET / Google OAuth / データベース接続を確認してください。Vercel で環境変数追加後に Redeploy が必要です。",
  AccessDenied: "アクセスが拒否されました。",
  OAuthSignin: "Google ログインの開始に失敗しました。",
  OAuthCallback: "Google コールバックに失敗しました。Redirect URI を確認してください。",
  Default: "ログインに失敗しました。もう一度お試しください。",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const { error } = await searchParams;

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
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {authErrors[error] ?? authErrors.Default}
            </div>
          )}
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
            Loamly L-Ghost — ブラウザ音声デモ
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
