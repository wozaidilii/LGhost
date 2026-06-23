/** 学資保険_契約内容照会 シナリオ定義 */

export const SCENARIO_TITLE = "学資保険_契約内容照会";

export const SCENARIO_STEPS = [
  { id: "identity_contract", label: "本人確認・契約情報照会" },
  { id: "info_hearing", label: "入手希望情報ヒアリング・回答" },
  { id: "closing", label: "終話" },
] as const;

export const CHECKLIST_ITEMS = [
  {
    id: "name_registered",
    label: "氏名の登録（必須）",
    tool: "register_customer_name",
  },
  {
    id: "identity_verified",
    label: "本人確認照合の成功（必須）",
    tool: "verify_identity",
  },
] as const;

export type ChecklistState = {
  nameRegistered: boolean;
  identityVerified: boolean;
};

export function initialChecklistState(): ChecklistState {
  return { nameRegistered: false, identityVerified: false };
}

/** dialogState からシナリオステップ番号を推定 */
export function dialogStateToStep(dialogState: string): number {
  switch (dialogState) {
    case "qa":
      return 1;
    case "closing":
    case "completed":
      return 2;
    default:
      return 0;
  }
}
