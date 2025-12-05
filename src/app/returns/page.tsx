// src/app/returns/page.tsx
"use client";

import { useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrderItem = {
  id: number;
  product_title: string | null;
  variant_title: string | null;
  qty: number;
  currency: string | null;
  unit_price_minor: number;
  line_total_minor: number;
};

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
  const [items, setItems] = useState<OrderItem[]>([]);
  const [returnQty, setReturnQty] = useState<Record<number, number>>({});

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
      setOrder(data.order);
      setItems(data.items || []);
      const q: Record<number, number> = {};
      (data.items || []).forEach((it: OrderItem) => {
        q[it.id] = 0;
      });
      setReturnQty(q);
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
    const selectedItems = items
      .map((it) => ({
        order_item_id: it.id,
        qty: returnQty[it.id] || 0,
      }))
      .filter((it) => it.qty > 0);

    if (!selectedItems.length) {
      setError("Please choose at least one item to return.");
      return;
    }
    if (!reasonType.trim()) {
      setError("Please choose a return reason.");
      return;
    }

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

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">
              Select items to return
            </h2>
            <div className="space-y-3">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {it.product_title}
                    </div>
                    {it.variant_title && (
                      <div className="text-xs text-muted-foreground">
                        {it.variant_title}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Purchased qty: {it.qty}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Return qty
                    </span>
                    <Input
                      type="number"
                      className="w-20 h-8"
                      min={0}
                      max={it.qty}
                      value={returnQty[it.id] ?? 0}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        setReturnQty((prev) => ({
                          ...prev,
                          [it.id]:
                            v < 0 ? 0 : v > it.qty ? it.qty : v,
                        }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

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
              setItems([]);
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
