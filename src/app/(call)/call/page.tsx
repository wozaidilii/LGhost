import { PhoneCall, ShieldCheck } from "lucide-react";

import { StartCustomerCallButton } from "~/components/call/StartCustomerCallButton";
import { api } from "~/trpc/server";

export default async function CallLandingPage() {
  const policies = await api.policy.list();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10 md:px-8">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/30">
          <PhoneCall className="h-10 w-10 text-emerald-300" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          契約内容のご照会
        </h1>
        <p className="mt-3 text-base leading-relaxed text-indigo-100/80">
          AI オペレーターが音声でご案内します。
          <br />
          マイクを許可して、下のボタンから通話を開始してください。
        </p>
      </div>

      <div className="mb-8 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-indigo-100/90">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        <p>
          通話では本人確認ののち、契約内容（被保険者・保険金額・お支払い方法など）を順番に確認します。
        </p>
      </div>

      {policies.length === 0 ? (
        <p className="text-center text-sm text-indigo-200/60">
          デモ契約がありません。管理者に seed の実行を依頼してください。
        </p>
      ) : (
        <ul className="space-y-4">
          {policies.map((policy) => (
            <li
              key={policy.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
            >
              <div className="mb-4">
                <p className="text-lg font-semibold text-white">
                  {policy.customer.name} 様
                </p>
                <p className="mt-1 text-sm text-indigo-200/70">
                  被保険者: {policy.insuredChildName}
                </p>
                <p className="text-sm text-indigo-200/70">
                  {policy.premiumAmount.toLocaleString("ja-JP")}円 ·{" "}
                  {policy.paymentMethod}
                </p>
              </div>
              <StartCustomerCallButton policyId={policy.id} className="w-full" />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center text-xs text-indigo-300/50">
        Loamly L-Ghost — ブラウザ音声デモ（お客様向け）
      </p>
    </div>
  );
}
