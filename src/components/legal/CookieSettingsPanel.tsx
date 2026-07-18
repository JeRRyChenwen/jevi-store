"use client";

import { useEffect, useMemo, useState } from "react";

type ConsentChoice = "accept_all" | "reject_non_essential";

const STORAGE_KEY = "jevi_cookie_consent_v1";
const STOREFRONT_CODE = String(process.env.NEXT_PUBLIC_STOREFRONT_CODE || "AU")
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
      }),
    );
  } catch {}
}

export default function CookieSettingsPanel() {
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<ConsentChoice | null>(null);

  useEffect(() => {
    setMounted(true);
    setConsent(readConsent());

    function handleConsentChanged(event: Event) {
      const customEvent = event as CustomEvent<{ value?: string }>;
      const next = customEvent?.detail?.value;

      if (next === "accept_all" || next === "reject_non_essential") {
        setConsent(next);
        return;
      }

      setConsent(readConsent());
    }

    function handleStorageChange() {
      setConsent(readConsent());
    }

    window.addEventListener(
      "jevi-cookie-consent-changed",
      handleConsentChanged as EventListener,
    );
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "jevi-cookie-consent-changed",
        handleConsentChanged as EventListener,
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const currentStatus = useMemo(() => {
    if (!mounted) {
      return <>Loading current cookie setting...</>;
    }

    if (consent === "accept_all") {
      return (
        <>
          Current setting:{" "}
          <span className="font-semibold text-neutral-900">
            Accepted all cookies and similar technologies
          </span>
          .
        </>
      );
    }

    if (consent === "reject_non_essential") {
      return (
        <>
          Current setting:{" "}
          <span className="font-semibold text-neutral-900">
            Rejected non-essential cookies and similar technologies
          </span>
          .
        </>
      );
    }

    return (
      <>
        Current setting:{" "}
        <span className="font-semibold text-neutral-900">
          No preference selected yet
        </span>
        .
      </>
    );
  }, [mounted, consent]);

  const helperText = useMemo(() => {
    if (isEuStorefront()) {
      if (consent === "reject_non_essential" || consent === null) {
        return "On the EU storefront, non-essential cookies and similar technologies remain disabled unless you choose to allow them. This may affect certain third-party technologies, including PayPal in checkout.";
      }

      return "Your current EU storefront setting allows non-essential cookies and similar technologies where configured.";
    }

    if (consent === "reject_non_essential") {
      return "Your current storefront setting disables non-essential cookies and similar technologies. This may disable certain third-party technologies, including PayPal in checkout.";
    }

    if (consent === "accept_all") {
      return "Your current storefront setting allows non-essential cookies and similar technologies where configured.";
    }

    return "No cookie preference has been saved yet. You can use the setting below to allow or reject non-essential cookies and similar technologies.";
  }, [consent]);

  function handleAcceptAll() {
    writeConsent("accept_all");
    setConsent("accept_all");
  }

  function handleRejectNonEssential() {
    writeConsent("reject_non_essential");
    setConsent("reject_non_essential");
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5 shadow-sm">
      <div className="space-y-3">
        <p className="text-sm leading-6 text-neutral-700">{currentStatus}</p>

        <p className="min-h-[72px] text-sm leading-6 text-neutral-600">
          {helperText}
        </p>

        <div className="flex items-center gap-3 pt-1 min-h-[64px]">
          <button
            type="button"
            role="switch"
            aria-checked={consent === "accept_all"}
            aria-label="Allow non-essential cookies and similar technologies"
            onClick={() => {
              if (consent === "accept_all") {
                handleRejectNonEssential();
              } else {
                handleAcceptAll();
              }
            }}
            className={[
              "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2",
              consent === "accept_all" ? "bg-neutral-900" : "bg-neutral-300",
            ].join(" ")}
            title="Allow non-essential cookies and similar technologies"
          >
            <span
              className={[
                "inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200",
                consent === "accept_all" ? "translate-x-7" : "translate-x-1",
              ].join(" ")}
            />
          </button>

          <p className="text-sm leading-6 text-neutral-700">
            <span className="font-semibold text-neutral-900">
              Allow non-essential cookies and similar technologies.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
