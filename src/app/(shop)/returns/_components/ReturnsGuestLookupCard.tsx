"use client";

import { Card } from "@/components/ui/card";
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

export default function ReturnsGuestLookupCard({
  orderNumber,
  email,
  loading,
  isLookupCoolingDown,
  setOrderNumber,
  setEmail,
  handleFindOrder,
}: Props) {
  return (
    <Card className="p-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Please enter your order number and email to start a return.
      </p>

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
    </Card>
  );
}