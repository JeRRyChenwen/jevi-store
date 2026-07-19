// src/lib/subscribe.ts

function getPublicApiBase(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE
    ?.trim()
    .replace(/\/+$/, "");

  if (!value) {
    throw new Error(
      "[subscribe] Missing required environment variable: NEXT_PUBLIC_API_BASE"
    );
  }

  return value;
}

const API_BASE = getPublicApiBase();

export type SubscribePayload = {
  email: string;
  marketing_opt_in: boolean;
  source?: "checkout" | "signup" | "profile" | "admin" | string;
  user_id?: number | null;
  meta?: Record<string, any>;
};

export async function fetchMe() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as {
      id: string;
      email: string;
      name: string | null;
    };
  } catch {
    return null;
  }
}

export async function subscribeEmail(
  input: SubscribePayload,
  opts?: {
    keepalive?: boolean;
  }
) {
  const payload = {
    email: input.email?.trim().toLowerCase(),
    marketing_opt_in: Boolean(input.marketing_opt_in),
    source: input.source ?? "checkout",
    user_id: input.user_id ?? null,
    meta: input.meta ?? {},
  };

  if (
    !payload.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
  ) {
    throw new Error("invalid email");
  }

  const response = await fetch(`${API_BASE}/subscribe`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    keepalive: opts?.keepalive === true,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");

    throw new Error(
      text || `subscribe failed (${response.status})`
    );
  }

  return response.json();
}