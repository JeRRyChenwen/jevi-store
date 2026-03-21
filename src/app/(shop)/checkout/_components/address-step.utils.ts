// src/app/(shop)/checkout/_components/address-step.utils.ts

import type { AddressErr } from "./address-step.types";

export const baseInput =
  "w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10";

export function hasAnyErr(errs: AddressErr, includeEmail: boolean) {
  const keys: (keyof AddressErr)[] = includeEmail
    ? [
        "firstName",
        "lastName",
        "phone",
        "line1",
        "city",
        "state",
        "postcode",
        "country",
        "email",
      ]
    : ["firstName", "lastName", "phone", "line1", "city", "state", "postcode", "country"];

  return keys.some((k) => !!errs[k]);
}

export function fieldErrorText(key: keyof AddressErr): string {
  if (key === "email") return "Please enter a valid email address.";
  if (key === "phone") return "Please enter a valid phone number.";
  if (key === "postcode") return "Please enter a valid postcode.";

  /**
   * ✅ 当前网站只面向 Australia / New Zealand
   * country 字段除了“必填”之外，还承担“限制可配送国家”的校验
   */
  if (key === "country") {
    return "We currently only ship to Australia and New Zealand.";
  }

  return "This field is required.";
}

export function clsInput(showErrors: boolean, bad: boolean) {
  return showErrors && bad ? `${baseInput} border-red-500` : `${baseInput} border-neutral-300`;
}