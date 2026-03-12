// src/app/(shop)/checkout/stepper.ts

import type { StepKey } from "./types";

export function isStepKey(v: unknown): v is StepKey {
  return v === "bag" || v === "address" || v === "delivery" || v === "payment";
}