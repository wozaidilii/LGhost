"use client";

import { Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type StartCustomerCallButtonProps = {
  policyId: string;
  label?: string;
  className?: string;
  size?: "default" | "lg";
};

/** 通話セッションを /call 配下で開始 */
export function StartCustomerCallButton({
  policyId,
  label = "通話を開始",
  className,
  size = "lg",
}: StartCustomerCallButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const createCall = api.callTask.create.useMutation();
  const startSession = api.callTask.startSession.useMutation();

  const handleStart = async () => {
    setLoading(true);
    try {
      const task = await createCall.mutateAsync({ policyId });
      const session = await startSession.mutateAsync({ callTaskId: task.id });
      router.push(`/call/${task.id}/session?sessionId=${session.id}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <Button
      size={size}
      className={cn(
        "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400",
        className,
      )}
      onClick={() => void handleStart()}
      disabled={loading}
    >
      <Phone className="mr-2 h-5 w-5" />
      {loading ? "接続準備中..." : label}
    </Button>
  );
}
