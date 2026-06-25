"use client";

import { LayoutDashboard, LogOut, Phone } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";

type CallShellProps = {
  children: React.ReactNode;
  userName?: string | null;
};

/** お客様向け通話 UI — 管理サイドバーなし */
export function CallShell({ children, userName }: CallShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-8">
        <Link href="/call" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/30">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">L-Ghost</p>
            <p className="text-xs text-indigo-200/80">学資保険 契約内容照会</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {userName && (
            <span className="hidden text-xs text-indigo-200/70 sm:inline">
              {userName}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-indigo-100 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href="/dashboard">
              <LayoutDashboard className="mr-1.5 h-4 w-4" />
              管理画面
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-indigo-100 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href="/api/auth/signout" aria-label="ログアウト">
              <LogOut className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
