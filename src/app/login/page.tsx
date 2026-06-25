import { LayoutDashboard, PhoneCall } from "lucide-react";
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
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

const authErrors: Record<string, string> = {
  Configuration:
    "サーバー認証設定エラーです。Vercel の AUTH_SECRET / Google OAuth / DATABASE_URL を確認し、Redeploy してください。",
  AccessDenied:
    "Google ログインが拒否されました。OAuth アプリがテストモードの場合、テストユーザーに追加が必要です。",
  OAuthSignin:
    "Google ログインの開始に失敗しました。AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET を確認してください。",
  OAuthCallback:
    "Google コールバック失敗。Redirect URI に https://lghost.loamly.net/api/auth/callback/google を登録してください。",
  Default: "ログインに失敗しました。もう一度お試しください。",
};

function safeCallbackUrl(raw?: string): string {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const { error, callbackUrl: rawCallback } = await searchParams;
  const callbackUrl = safeCallbackUrl(rawCallback);

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>ログイン済み</CardTitle>
            <CardDescription>
              {session.user?.name ?? session.user?.email} としてログイン中
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-500">
              <Link href="/call">
                <PhoneCall className="mr-2 h-4 w-4" />
                契約確認通話へ
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                管理画面へ
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
            <PhoneCall className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">L-Ghost</CardTitle>
          <CardDescription>
            ログイン後、通話デモまたは管理画面をご利用いただけます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {authErrors[error] ?? authErrors.Default}
            </div>
          )}

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: callbackUrl });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              Google でログイン
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400">
            通話デモ: <span className="font-mono">/call</span> · 管理:{" "}
            <span className="font-mono">/dashboard</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
