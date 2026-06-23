import {
  type CallTaskStatus,
  type PolicyStatus,
  type SessionOutcome,
} from "../../generated/prisma";

export const policyStatusLabels: Record<PolicyStatus, string> = {
  PENDING_CONFIRMATION: "確認待ち",
  CONFIRMED: "確認済み",
  CHANGES_REPORTED: "変更あり",
  TRANSFERRED: "転送済み",
};

export const callTaskStatusLabels: Record<CallTaskStatus, string> = {
  PENDING: "待機中",
  IN_PROGRESS: "通話中",
  COMPLETED: "完了",
  TRANSFERRED: "転送",
  FAILED: "失敗",
};

export const sessionOutcomeLabels: Record<SessionOutcome, string> = {
  CONFIRMED: "確認完了",
  CHANGES_REPORTED: "変更報告",
  TRANSFERRED: "オペレーター転送",
  NO_ANSWER: "応答なし",
  FAILED: "失敗",
};

export function policyStatusVariant(
  status: PolicyStatus,
): "default" | "secondary" | "success" | "warning" | "destructive" {
  switch (status) {
    case "CONFIRMED":
      return "success";
    case "PENDING_CONFIRMATION":
      return "warning";
    case "CHANGES_REPORTED":
      return "destructive";
    case "TRANSFERRED":
      return "secondary";
    default:
      return "default";
  }
}

export function callTaskStatusVariant(
  status: CallTaskStatus,
): "default" | "secondary" | "success" | "warning" | "destructive" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "IN_PROGRESS":
      return "default";
    case "TRANSFERRED":
      return "secondary";
    case "FAILED":
      return "destructive";
    case "PENDING":
      return "warning";
    default:
      return "default";
  }
}
