"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  orderNumber: string;
  email: string;
  loading: boolean;
  isLookupCoolingDown: boolean;

  setOrderNumber: (v: string) => void;
  setEmail: (v: string) => void;

  handleFindOrder: () => void;
};

export default function ReturnsLookupForm({
  orderNumber,
  email,
  loading,
  isLookupCoolingDown,
  setOrderNumber,
  setEmail,
  handleFindOrder,
}: Props) {
  return (
    <div className="border-t pt-6 space-y-4">
      <div>
        <div className="text-sm font-medium">
          Find an order by order number and email
        </div>
        <div className="text-xs text-muted-foreground">
          Use this if you want to start a return for a different email/order.
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Order number</label>
        <Input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="e.g. SP20251201-000123"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email used for this order</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. name@example.com"
        />
      </div>

      <Button
        variant="outline"
        className="px-6"
        onClick={handleFindOrder}
        disabled={loading || isLookupCoolingDown}
      >
        {loading ? "Finding your order..." : "Find my order"}
      </Button>
    </div>
  );
}