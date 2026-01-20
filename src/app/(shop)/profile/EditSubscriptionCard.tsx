// src/app/profile/EditSubscriptionCard.tsx
"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { useFormAlert } from "@/hooks/useFormAlert";

type SubscriptionRow = {
  id: number;
  user_id?: number | null;
  email: string | null;
  status: string | null; // 'subscribed' | 'unsubscribed' | 其它
  marketing_opt_in?: boolean | null;
  source?: string | null;

  consent_at_ts?: number | null;
  unsubscribed_at_ts?: number | null;
  created_at_ts?: number | null;
  updated_at_ts?: number | null;

  consent_at_cn?: string | null;
  unsubscribed_at_cn?: string | null;
  created_at_cn?: string | null;
  updated_at_cn?: string | null;
};

type SubscriptionsResp =
  | {
      ok: true;
      subscription: SubscriptionRow | null;
      worker_version?: string;
    }
  | {
      ok?: false;
      error?: string;
      worker_version?: string;
    };

type Props = {
  userEmail: string; // 从 ProfilePage 传进来的当前用户邮箱
};

function getStatusText(sub: SubscriptionRow | null): string {
  if (!sub) return "Not subscribed";
  if (sub.status) {
    const s = sub.status.toLowerCase();
    if (s === "subscribed") return "Subscribed";
    if (s === "unsubscribed") return "Unsubscribed";
    return sub.status;
  }
  if (sub.marketing_opt_in != null) {
    return sub.marketing_opt_in ? "Subscribed" : "Unsubscribed";
  }
  return "Unknown";
}

function alertVariantOf(type?: string): "error" | "success" | "warning" | "info" {
  if (type === "success") return "success";
  if (type === "warning") return "warning";
  if (type === "info") return "info";
  return "error";
}

export default function EditSubscriptionCard({ userEmail }: Props) {
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  // ✅ 统一提示：替代 err state
  const pageAlert = useFormAlert();

  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        setLoading(true);
        pageAlert.clear();

        const r = await fetch("/api/subscriptions", {
          method: "GET",
          credentials: "include",
          headers: { accept: "application/json" },
          cache: "no-store",
        });

        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          throw new Error(`/api/subscriptions ${r.status}: ${txt}`);
        }

        const data = (await r.json()) as SubscriptionsResp;

        if ("ok" in data && data.ok === false) {
          throw new Error(data.error || "failed to load subscription");
        }

        if (!dead) {
          setSub((data as any).subscription ?? null);
        }
      } catch (e: any) {
        if (!dead) pageAlert.error(e?.message || "Failed to load subscription");
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = getStatusText(sub);
  const isSubscribed = status.toLowerCase() === "subscribed";

  async function handleToggle() {
    if (toggling) return;

    // ✅ 用户触发操作时清理旧提示，避免“黏住”
    if (pageAlert.hasAlert) pageAlert.clear();

    const email = (sub?.email || userEmail || "").trim();
    if (!email) {
      pageAlert.error("Missing email for subscription.");
      return;
    }

    const nextOptIn = !isSubscribed;

    setToggling(true);

    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          email,
          marketing_opt_in: nextOptIn,
          source: "profile-toggle",
        }),
      });

      const data = await r.json().catch(() => ({} as any));
      if (!r.ok || data?.ok === false) {
        throw new Error(data?.error || `POST /api/subscribe ${r.status}`);
      }

      const newStatus = nextOptIn ? "subscribed" : "unsubscribed";

      // 直接在前端更新本地状态（不依赖返回的字段）
      setSub((prev) => ({
        ...(prev || { id: 0, user_id: null }),
        email,
        status: newStatus,
        marketing_opt_in: nextOptIn,
      }));

      // ✅ 这里是否需要 success 提示取决于你想不想“弹一下”
      // 不改变逻辑：只是给一个轻量确认
      pageAlert.success(nextOptIn ? "Subscribed successfully." : "Unsubscribed successfully.");
    } catch (e: any) {
      pageAlert.error(e?.message || "Failed to update subscription");
    } finally {
      setToggling(false);
    }
  }

  const description = isSubscribed
    ? "You’ll receive updates on new arrivals, sales, and exclusive offers."
    : "You won’t receive updates on new arrivals, sales, and exclusive offers.";

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* ✅ Alert */}
      {pageAlert.hasAlert && pageAlert.alert?.message ? (
        <Alert variant={alertVariantOf(pageAlert.alert.type)}>
          {pageAlert.alert.message}
        </Alert>
      ) : null}

      {loading && (
        <div className="text-sm text-neutral-500">Loading subscription…</div>
      )}

      {!loading && (
        <div className="rounded-lg border p-3 text-sm space-y-1 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 滑动开关 */}
              <button
                type="button"
                onClick={handleToggle}
                disabled={toggling}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isSubscribed ? "bg-emerald-500" : "bg-neutral-300"
                } ${toggling ? "opacity-60 cursor-default" : "cursor-pointer"}`}
                aria-pressed={isSubscribed}
                aria-label="Toggle email subscription"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isSubscribed ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>

              <div className="font-medium">Email subscription</div>
            </div>

            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                isSubscribed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-neutral-200 text-neutral-800"
              }`}
            >
              {status}
            </span>
          </div>

          <div>Email: {sub?.email || userEmail || "-"}</div>

          {/* 说明文字，根据是否订阅切换 */}
          <div className="mt-1 text-xs text-neutral-600">{description}</div>
        </div>
      )}
    </div>
  );
}
