/** OpenAI Realtime API 用ツール定義 */
export const REALTIME_TOOLS = [
  {
    type: "function" as const,
    name: "verify_identity",
    description: "本人確認の結果を記録する",
    parameters: {
      type: "object",
      properties: {
        verified: {
          type: "boolean",
          description: "本人確認が成功したか",
        },
        note: {
          type: "string",
          description: "補足メモ",
        },
      },
      required: ["verified"],
    },
  },
  {
    type: "function" as const,
    name: "confirm_policy_field",
    description: "契約項目の確認結果を記録する",
    parameters: {
      type: "object",
      properties: {
        field: {
          type: "string",
          enum: [
            "policyholder_name",
            "insured_child_name",
            "premium_amount",
            "payment_method",
            "has_changes",
          ],
          description: "確認した項目",
        },
        confirmed: {
          type: "boolean",
          description: "顧客が内容を確認したか",
        },
        value: {
          type: "string",
          description: "確認された値",
        },
      },
      required: ["field", "confirmed"],
    },
  },
  {
    type: "function" as const,
    name: "lookup_faq",
    description: "学資保険に関するFAQを検索する",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "顧客の質問内容",
        },
      },
      required: ["query"],
    },
  },
  {
    type: "function" as const,
    name: "update_call_status",
    description: "通話・契約のステータスを更新する",
    parameters: {
      type: "object",
      properties: {
        dialogState: {
          type: "string",
          description: "現在の対話フェーズ",
        },
        outcome: {
          type: "string",
          enum: ["CONFIRMED", "CHANGES_REPORTED", "TRANSFERRED", "NO_ANSWER"],
          description: "通話結果（任意）",
        },
      },
      required: ["dialogState"],
    },
  },
  {
    type: "function" as const,
    name: "request_human_transfer",
    description: "オペレーターへの転送を要求する",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "転送理由",
        },
      },
      required: ["reason"],
    },
  },
] as const;

export type ToolName = (typeof REALTIME_TOOLS)[number]["name"];
