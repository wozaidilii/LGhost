import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
};

/** 旧 URL → お客様向け通話画面へリダイレクト */
export default async function LegacyCallSessionRedirect({
  params,
  searchParams,
}: Props) {
  const { taskId } = await params;
  const { sessionId } = await searchParams;
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  redirect(`/call/${taskId}/session${query}`);
}
