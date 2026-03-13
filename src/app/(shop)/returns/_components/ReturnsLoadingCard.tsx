// src/app/(shop)/returns/_components/ReturnsLoadingCard.tsx
"use client";

import { Card } from "@/components/ui/card";

export default function ReturnsLoadingCard() {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">Loading your orders…</div>
    </Card>
  );
}