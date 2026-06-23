export const DIALOG_STATES = {
  greeting: "挨拶",
  identity_check: "本人確認",
  contract_confirm: "契約内容確認",
  qa: "質疑応答",
  closing: "終了確認",
  completed: "完了",
  transfer: "転送",
} as const;

export type DialogState = keyof typeof DIALOG_STATES;

export function isDialogState(value: string): value is DialogState {
  return value in DIALOG_STATES;
}
