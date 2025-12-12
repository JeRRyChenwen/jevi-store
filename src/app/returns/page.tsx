// src/app/returns/page.tsx
"use client";

import { useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import ReturnItemsSelector, {
  type ReturnOrderDetail,
  type SelectedReturnLine,
} from "./_components/ReturnItemsSelector";

type OrderSummary = {
  id: number;
  order_number?: string | null;
  email: string | null;
  status: string | null;
  currency: string | null;
  grand_total_minor: number;
  created_at_cn?: string | null;
};

export default function ReturnsPage() {
  const search = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [orderNumber, setOrderNumber] = useState(
    search.get("order") || ""
  );
  const [email, setEmail] = useState(search.get("email") || "");

  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);

  // 查到的订单明细（带 items），用于 ReturnItemsSelector
  const [foundOrder, setFoundOrder] = useState<ReturnOrderDetail | null>(
    null
  );
  // 用户选择退哪些商品、各退多少
  const [selectedLines, setSelectedLines] = useState<
    SelectedReturnLine[]
  >([]);

  const [reasonType, setReasonType] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: 根据 orderNumber + email 查询订单
  async function handleFindOrder() {
    setError(null);
    if (!orderNumber.trim() || !email.trim()) {
      setError("Please enter both order number and email.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        `/api/orders/lookup?order_number=${encodeURIComponent(
          orderNumber.trim()
        )}&email=${encodeURIComponent(email.trim().toLowerCase())}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to find order.");
        return;
      }

      // 简要信息
      setOrder(data.order);

      // 明细信息（带 items）给 ReturnItemsSelector 使用
      setFoundOrder({
        ...(data.order || {}),
        items: data.items || [],
      });

      // 重置已选商品（组件在 order 变化时会自己初始化）
      setSelectedLines([]);

      setStep(2);
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: 提交退货
  async function handleSubmitReturn() {
    setError(null);
    if (!order) {
      setError("No order loaded.");
      return;
    }

    // 过滤出 qty > 0 的行
    const lines = selectedLines.filter((l) => l.qty > 0);
    if (!lines.length) {
      setError("Please choose at least one item to return.");
      return;
    }
    if (!reasonType.trim()) {
      setError("Please choose a return reason.");
      return;
    }

    // API 期望的结构：{ order_item_id, qty }
    const selectedItems = lines.map((l) => ({
      order_item_id: l.item_id,
      qty: l.qty,
    }));

    try {
      setSubmitting(true);
      const res = await fetch("/api/returns", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order_number: order.order_number || order.id,
          reason_type: reasonType,
          reason_detail: reasonDetail,
          items: selectedItems,
          email: email.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to submit return.");
        return;
      }
      setSubmitResult(data);
      setStep(3);
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-4">
        Returns &amp; Exchanges
      </h1>

      {error && (
        <div className="mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {step === 1 && (
        <Card className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Please enter your order number and email to
            start a return.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Order number
            </label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. SP20251201-000123"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Email used for this order
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button onClick={handleFindOrder} disabled={loading}>
            {loading ? "Finding your order..." : "Find my order"}
          </Button>
        </Card>
      )}

      {step === 2 && order && (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-medium">
                  Order {order.order_number ?? order.id}
                </div>
                <div className="text-muted-foreground">
                  Placed at: {order.created_at_cn || "N/A"}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                Status: {order.status}
              </div>
            </div>
          </Card>

          {/* 商品选择区域：由 ReturnItemsSelector 负责渲染 */}
          {foundOrder && (
            <ReturnItemsSelector
              order={foundOrder}
              onSelectionChange={setSelectedLines}
            />
          )}

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">
              Return reason
            </h2>
            <div className="space-y-2">
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={reasonType}
                onChange={(e) => setReasonType(e.target.value)}
              >
                <option value="">Select a reason</option>
                <option value="too_large">Too large</option>
                <option value="too_small">Too small</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="wrong_item">
                  Received wrong item
                </option>
                <option value="faulty">Faulty / damaged</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Details (optional)
              </label>
              <textarea
                rows={4}
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="Tell us more so we can improve..."
                value={reasonDetail}
                onChange={(
                  e: ChangeEvent<HTMLTextAreaElement>
                ) => setReasonDetail(e.target.value)}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmitReturn}
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit return request"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {step === 3 && submitResult && (
        <Card className="p-4 space-y-3 mt-4">
          <h2 className="text-lg font-semibold">
            Return request submitted 🎉
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ve received your return request.
            You&apos;ll receive an email once it&apos;s
            reviewed.
          </p>
          <div className="text-sm">
            <div>
              Return ID:{" "}
              <span className="font-mono">
                {submitResult.return?.id}
              </span>
            </div>
            <div>
              Status:{" "}
              <span>
                {submitResult.return?.status || "pending"}
              </span>
            </div>
            <div>
              Created at:{" "}
              {submitResult.return?.created_at_cn || "N/A"}
            </div>
          </div>
          <Button
            className="mt-2"
            onClick={() => {
              setStep(1);
              setOrder(null);
              setFoundOrder(null);
              setSelectedLines([]);
              setSubmitResult(null);
            }}
          >
            Start another return
          </Button>
        </Card>
      )}
    </div>
  );
}
