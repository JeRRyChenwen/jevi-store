// src/app/(admin)/admin/(protected)/returns/[id]/return-detail.utils.ts

import type {
  RejectReasonGroup,
  RejectReasonOption,
} from "./return-detail.types";

export const RETURN_REASON_LABELS: Record<string, string> = {
  changed_mind: "Changed my mind",
  wrong_item: "Received wrong item",
  faulty: "Faulty / damaged",
  other: "Other",
};

export const REJECT_REASON_GROUPS: RejectReasonGroup[] = [
  {
    label: "流程/系统类 / Process & system",
    options: [
      {
        value: "already_refunded_or_processed",
        label: "已退款或已处理过 / Already refunded or already processed",
      },
      {
        value: "request_no_longer_processable",
        label: "已超过可处理时效 / Request can no longer be processed",
      },
      {
        value: "duplicate_return_request",
        label: "重复提交申请 / Duplicate return request",
      },
    ],
  },

  {
    label: "信息/证据类 / Information & evidence",
    options: [
      {
        value: "insufficient_photos_or_evidence",
        label: "图片或证据不足 / Insufficient photos or evidence",
      },
      {
        value: "incomplete_submission_information",
        label: "提交信息不完整 / Incomplete submission information",
      },
      {
        value: "order_information_mismatch",
        label: "订单信息不匹配 / Order information does not match",
      },
      {
        value: "returned_item_mismatch",
        label: "退回商品与申请商品不一致 / Returned item does not match the request",
      },
    ],
  },

  {
    label: "商品状态类 / Item condition",
    options: [
      {
        value: "does_not_meet_return_conditions",
        label: "商品不符合退货条件 / Item does not meet return conditions",
      },
      {
        value: "visible_signs_of_use",
        label: "商品存在明显使用痕迹 / Item shows visible signs of use",
      },
      {
        value: "damage_not_caused_by_shipping",
        label: "商品损坏并非运输导致 / Damage not caused by shipping",
      },
      {
        value: "missing_original_packaging_or_tags",
        label: "缺少原包装或吊牌 / Missing original packaging or tags",
      },
      {
        value: "missing_accessories_or_included_parts",
        label: "缺少配件、赠品或附件 / Missing accessories, gifts, or included parts",
      },
    ],
  },

  {
    label: "商品政策类 / Item policy",
    options: [
      {
        value: "non_returnable_item",
        label: "属于不可退商品 / Non-returnable item",
      },
      {
        value: "final_sale_not_returnable",
        label: "折扣商品不可退 / Final sale item is not returnable",
      },
      {
        value: "customised_item_not_returnable",
        label: "定制商品不可退 / Customised item is not returnable",
      },
      {
        value: "hygiene_sensitive_item_not_returnable",
        label: "贴身/卫生类商品不可退 / Hygiene-sensitive item is not returnable",
      },
      {
        value: "does_not_meet_policy_requirements",
        label: "不符合退货政策 / Does not meet return policy requirements",
      },
    ],
  },

  {
    label: "时效类 / Timing",
    options: [
      {
        value: "return_window_expired",
        label: "超过退货时限 / Return window expired",
      },
    ],
  },

  {
    label: "其他 / Other",
    options: [
      {
        value: "other",
        label: "其他 / Other",
      },
    ],
  },
];

export const REJECT_REASON_OPTIONS_FLAT: RejectReasonOption[] =
  REJECT_REASON_GROUPS.flatMap((group) => group.options);

export function titleCaseFromSnake(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getRejectReasonLabel(reasonCode: string | null | undefined) {
  const code = String(reasonCode || "").trim();
  if (!code) return "-";

  const found = REJECT_REASON_OPTIONS_FLAT.find((x) => x.value === code);
  return found?.label ?? titleCaseFromSnake(code);
}

export function getReasonLabel(reasonType: string | null) {
  if (!reasonType) return "-";
  return RETURN_REASON_LABELS[reasonType] ?? titleCaseFromSnake(reasonType);
}

export function toLocalTime(tsSec?: number | null) {
  if (typeof tsSec !== "number") return "-";
  try {
    return new Date(tsSec * 1000).toLocaleString();
  } catch {
    return "-";
  }
}

export function prettifyErrorMessage(raw: string) {
  const s = (raw || "").trim();
  const lower = s.toLowerCase();
  if (!s) return "";

  if (lower === "unauthorized" || lower === "http_401") {
    return "Admin session expired. Please sign in again.";
  }
  if (lower === "not_found" || lower === "http_404") {
    return "This return request does not exist.";
  }
  if (lower === "bad_payload") {
    return "Server returned an unexpected response. Please try again.";
  }

  const m1 = s.match(/^failed\s*\((\d{3})\)$/i);
  if (m1?.[1]) return `Request failed (${m1[1]}). Please try again.`;

  const m2 = s.match(/^http_(\d{3})$/i);
  if (m2?.[1]) return `Request failed (${m2[1]}). Please try again.`;

  return s;
}

export function formatMoney(minor?: number | null, currency?: string | null) {
  if (typeof minor !== "number") return "N/A";
  return `${(minor / 100).toFixed(2)}${currency ? ` ${currency}` : ""}`;
}