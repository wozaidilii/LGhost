import { CallSessionPageClient } from "~/components/voice/CallSessionView";

export default function CustomerCallSessionPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  return <CallSessionPageClient params={params} exitHref="/call" />;
}
