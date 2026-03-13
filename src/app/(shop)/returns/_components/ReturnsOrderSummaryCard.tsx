// src/app/(shop)/returns/_components/ReturnsOrderSummaryCard.tsx
"use client";

import { Card } from "@/components/ui/card";
import { UserTime } from "@/components/datetime/Time";
import type { OrderSummary } from "../types";

type Props = {
  order: OrderSummary;
};

export default function ReturnsOrderSummaryCard({ order }: Props) {
  return (
    <Card className="p-4">
      <div className="flex justify-between text-sm">
        <div>
          <div className="font-medium">Order {order.order_number ?? order.id}</div>
          <div className="text-muted-foreground">
            Placed at:{" "}
            {"created_at_ts" in (order as any) &&
            typeof (order as any).created_at_ts === "number" ? (
              <UserTime ts={(order as any).created_at_ts} fallback="N/A" />
            ) : (
              order.created_at_cn || "N/A"
            )}
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          Status: {order.status}
        </div>
      </div>
    </Card>
  );
}