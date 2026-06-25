import { redirect } from "next/navigation";

import { CallShell } from "~/components/call/CallShell";
import { auth } from "~/server/auth";

export default async function CallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/call");
  }

  return <CallShell userName={session.user.name}>{children}</CallShell>;
}
