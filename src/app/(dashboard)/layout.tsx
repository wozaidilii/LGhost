import { redirect } from "next/navigation";

import { DashboardShell } from "~/components/dashboard/DashboardShell";
import { auth } from "~/server/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell userName={session.user.name}>
      {children}
    </DashboardShell>
  );
}
