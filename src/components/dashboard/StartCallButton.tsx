"use client";

import { Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

type StartCallButtonProps = {
  policyId: string;
};

export function StartCallButton({ policyId }: StartCallButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const createCall = api.callTask.create.useMutation();
  const startSession = api.callTask.startSession.useMutation();

  const handleStart = async () => {
    setLoading(true);
    try {
      const task = await createCall.mutateAsync({ policyId });
      const session = await startSession.mutateAsync({ callTaskId: task.id });
      router.push(`/calls/${task.id}/session?sessionId=${session.id}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <Button size="lg" onClick={() => void handleStart()} disabled={loading}>
      <Phone className="mr-2 h-5 w-5" />
      {loading ? "接続準備中..." : "確認通話を開始"}
    </Button>
  );
}
