"use client";

import { useEffect, useMemo, useState } from "react";

type ConsentChoice = "accept_all" | "reject_non_essential";

const STORAGE_KEY = "jevi_cookie_consent_v1";
const STOREFRONT_CODE = String(
  process.env.NEXT_PUBLIC_STOREFRONT_CODE || "AU"
)
  .trim()
  .toUpperCase();

function isEuStorefront() {
  return STOREFRONT_CODE === "EU";
}

function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "accept_all" || raw === "reject_non_essential") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

function writeConsent(value: ConsentChoice) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(
      new CustomEvent("jevi-cookie-consent-changed", {
        detail: { value },
      })
    );
  } catch {}
}

export default function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<ConsentChoice | null>(null);

  const shouldShow = useMemo(() => {
    if (!mounted) return false;
    if (!isEuStorefront()) return false;
    return consent === null;
  }, [mounted, consent]);

  useEffect(() => {
    setMounted(true);
    setConsent(readConsent());
  }, []);

  function handleAcceptAll() {
    writeConsent("accept_all");
    setConsent("accept_all");
  }

  function handleRejectNonEssential() {
    writeConsent("reject_non_essential");
    setConsent("reject_non_essential");
  }

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] px-4 pb-4 md:px-6 md:pb-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-neutral-200 bg-white shadow-2xl">
        <div className="p-4 md:p-5">
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">
              Cookie preferences
            </h2>

            <p className="text-sm leading-6 text-neutral-700">
              We use strictly necessary cookies to keep the storefront working.
              With your permission, we may also use non-essential cookies or
              similar technologies for analytics, performance, and user
              experience improvements on the EU storefront.
            </p>

            <p className="text-sm leading-6 text-neutral-700">
              You can review our{" "}
              <a
                href="/cookies"
                className="font-medium underline underline-offset-2"
              >
                Cookie Policy
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="font-medium underline underline-offset-2"
              >
                Privacy Policy
              </a>{" "}
              for more information.
            </p>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
              >
                Reject non-essential
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}