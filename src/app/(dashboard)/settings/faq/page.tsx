import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/server";

export default async function FaqSettingsPage() {
  const faqs = await api.faq.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">FAQ 設定</h1>
        <p className="text-slate-500">
          AI エージェントが参照する学資保険 FAQ（seed データ）
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FAQ 一覧 ({faqs.length})</CardTitle>
          <CardDescription>
            通話中 lookup_faq ツールで検索されます
          </CardDescription>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <p className="text-sm text-slate-400">FAQ がありません</p>
          ) : (
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="rounded-lg border border-slate-100 p-4"
                >
                  <p className="font-medium text-slate-900">{faq.question}</p>
                  <p className="mt-2 text-sm text-slate-600">{faq.answer}</p>
                  <p className="mt-1 text-xs text-slate-400">{faq.category}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
