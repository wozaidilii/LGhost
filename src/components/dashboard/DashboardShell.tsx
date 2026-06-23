"use client";

import {
  FileText,
  LayoutDashboard,
  LogOut,
  Phone,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/policies", label: "契約一覧", icon: FileText },
  { href: "/calls", label: "通話履歴", icon: Phone },
  { href: "/settings/faq", label: "FAQ設定", icon: Settings },
];

type DashboardShellProps = {
  children: React.ReactNode;
  userName?: string | null;
};

export function DashboardShell({ children, userName }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 flex-col border-r bg-white">
        <div className="border-b px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              X
            </div>
            <div>
              <p className="font-bold text-slate-900">L-Ghost</p>
              <p className="text-xs text-slate-500">Loamly · L-Ghost</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === href || pathname.startsWith(`${href}/`)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t p-4">
          {userName && (
            <p className="mb-2 truncate text-sm text-slate-600">{userName}</p>
          )}
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/api/auth/signout">
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </Link>
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-8">{children}</div>
      </main>
    </div>
  );
}
