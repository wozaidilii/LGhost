import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

async function main() {
  // FAQ データ
  const faqs = [
    {
      question: "学資保険とは何ですか",
      answer:
        "学資保険は、お子様の将来の教育費に備えるための保険です。満期時に所定の学資金をお受け取りいただけます。",
      category: "学資保険",
    },
    {
      question: "解約返戻金について",
      answer:
        "解約返戻金は、ご契約期間やお支払い状況により異なります。詳細は契約証書をご確認いただくか、オペレーターにお問い合わせください。",
      category: "学資保険",
    },
    {
      question: "払込免除とは",
      answer:
        "契約者が亡くなられた場合や所定の障害状態になられた場合、以後の保険料のお支払いが免除される制度です。",
      category: "学資保険",
    },
    {
      question: "月払と年払の違い",
      answer:
        "月払は毎月定額をお支払いいただく方法、年払は年1回まとめてお支払いいただく方法です。年払の方が総支払額が少なくなる場合があります。",
      category: "学資保険",
    },
    {
      question: "契約内容を変更したい",
      answer:
        "契約内容の変更をご希望の場合は、オペレーターにお繋ぎいたします。変更内容によっては書面でのお手続きが必要です。",
      category: "学資保険",
    },
    {
      question: "満期金はいつ受け取れますか",
      answer:
        "満期金は、お子様が所定の年齢に達した時点、または満期日にお受け取りいただけます。詳細はご契約内容により異なります。",
      category: "学資保険",
    },
    {
      question: "保険料の支払い方法を変更できますか",
      answer:
        "はい、月払から年払への変更などが可能な場合があります。オペレーターにてご確認ください。",
      category: "学資保険",
    },
    {
      question: "受取人の変更",
      answer:
        "受取人の変更は所定の手続きが必要です。詳しくはオペレーターにお問い合わせください。",
      category: "学資保険",
    },
  ];

  await db.faqEntry.deleteMany();
  await db.faqEntry.createMany({ data: faqs });

  // デモ顧客・契約
  await db.callSession.deleteMany();
  await db.callTask.deleteMany();
  await db.policy.deleteMany();
  await db.customer.deleteMany();

  const customer = await db.customer.create({
    data: {
      name: "田中 太郎",
      nameKana: "たなか たろう",
      phone: "090-1234-5678",
    },
  });

  await db.policy.create({
    data: {
      customerId: customer.id,
      insuredChildName: "田中 花子（小学3年）",
      premiumAmount: 3_000_000,
      paymentMethod: "月払 15,000円",
      hasChanges: false,
      status: "PENDING_CONFIRMATION",
      notes: "X-Ghost デモ用契約",
    },
  });

  // 追加デモデータ
  const customer2 = await db.customer.create({
    data: {
      name: "佐藤 美咲",
      nameKana: "さとう みさき",
      phone: "080-9876-5432",
    },
  });

  await db.policy.create({
    data: {
      customerId: customer2.id,
      insuredChildName: "佐藤 健太（中学1年）",
      premiumAmount: 2_000_000,
      paymentMethod: "年払 180,000円",
      hasChanges: false,
      status: "PENDING_CONFIRMATION",
    },
  });

  console.log("Seed completed: FAQ + 2 demo policies");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
