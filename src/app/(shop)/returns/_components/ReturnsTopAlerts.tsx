// src/app/(shop)/returns/_components/ReturnsTopAlerts.tsx
"use client";

import { Alert } from "@/components/ui/alert";

type AlertType = "error" | "warning" | "success" | "info";

type Props = {
  step: 1 | 2 | 3;
  isLookupCoolingDown: boolean;
  showInlineBlock: boolean;
  lookupCooldownLeftSec: number;
  hasAlert: boolean;
  alert?: {
    type: AlertType;
    message: string;
  } | null;
};

export default function ReturnsTopAlerts({
  step,
  isLookupCoolingDown,
  showInlineBlock,
  lookupCooldownLeftSec,
  hasAlert,
  alert,
}: Props) {
  return (
    <>
      {step === 1 && isLookupCoolingDown && !showInlineBlock && (
        <div className="mb-4">
          <Alert variant="error">
            {`Too many attempts. Please wait ${lookupCooldownLeftSec} ${
              lookupCooldownLeftSec === 1 ? "second" : "seconds"
            } and try again.`}
          </Alert>
        </div>
      )}

      {hasAlert && !showInlineBlock && !isLookupCoolingDown && alert?.message && (
        <div className="mb-4">
          <Alert variant={alert.type}>{alert.message}</Alert>
        </div>
      )}
    </>
  );
}