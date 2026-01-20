// src/app/(admin)/admin/login/AdminLoginForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, type AlertVariant } from "@/components/ui/alert";

import { adlog } from "@/lib/debug";

type UiMessage = {
  variant: AlertVariant;
  text: string;
};

function mapLoginError(args: {
  status: number;
  errorField?: unknown;
}): UiMessage {
  const { status, errorField } = args;

  const raw = typeof errorField === "string" ? errorField : "";
  const code = raw.trim().toLowerCase();

  // ✅ 统一：优先用后端 error code -> 友好文案
  if (code) {
    switch (code) {
      case "invalid_credentials":
      case "invalid_email_or_password":
      case "bad_credentials":
        return { variant: "error", text: "Incorrect email or password." };

      case "admin_not_found":
        return { variant: "error", text: "Admin account not found." };

      case "admin_inactive":
      case "inactive_admin":
        return {
          variant: "error",
          text: "This admin account is inactive. Please contact support.",
        };

      case "forbidden":
        return { variant: "error", text: "You do not have permission to sign in." };

      case "rate_limited":
      case "too_many_requests":
        return {
          variant: "warning",
          text: "Too many attempts. Please wait a moment and try again.",
        };

      case "internal_error":
        return {
          variant: "error",
          text: "Server error. Please try again later.",
        };

      default:
        // 兜底：如果后端给的是可读信息，也别浪费
        // 但避免把很技术的 code 直接展示给用户，这里做一个简单过滤
        if (code.includes("error") || code.includes("_")) {
          return { variant: "error", text: `Login failed (${status}).` };
        }
        return { variant: "error", text: raw };
    }
  }

  // ✅ 没有 error 字段：按 HTTP 状态码给出行业常见提示
  if (status === 400) {
    return { variant: "error", text: "Please check your input and try again." };
  }
  if (status === 401) {
    return { variant: "error", text: "Incorrect email or password." };
  }
  if (status === 403) {
    return { variant: "error", text: "You do not have permission to sign in." };
  }
  if (status === 429) {
    return {
      variant: "warning",
      text: "Too many attempts. Please wait a moment and try again.",
    };
  }

  return { variant: "error", text: `Login failed (${status}).` };
}

export default function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // ✅ 统一提示：用 message 替代单一 error string
  const [message, setMessage] = useState<UiMessage | null>(null);

  // ✅ 追踪该组件是否被反复挂载（非常关键）
  const mountIdRef = useRef<string>(Math.random().toString(16).slice(2));
  const submitSeqRef = useRef(0);

  useEffect(() => {
    adlog("LoginForm mounted", { mountId: mountIdRef.current, next });
    return () => {
      adlog("LoginForm unmounted", { mountId: mountIdRef.current });
    };
    // next 变化也记录一次（理论上 next 不应频繁变化）
  }, [next]);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const seq = ++submitSeqRef.current;

    adlog("Login submit start", {
      mountId: mountIdRef.current,
      seq,
      next,
      email: normalizedEmail,
    });

    setLoading(true);
    setMessage(null);

    try {
      const r = await fetch("/api/admin/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      adlog("Login submit response", {
        mountId: mountIdRef.current,
        seq,
        status: r.status,
        ok: r.ok,
      });

      const j = await r.json().catch(() => ({} as any));

      adlog("Login submit json", {
        mountId: mountIdRef.current,
        seq,
        hasErrorField: !!j?.error,
      });

      if (!r.ok) {
        const ui = mapLoginError({ status: r.status, errorField: j?.error });
        adlog("Login submit failed", {
          mountId: mountIdRef.current,
          seq,
          status: r.status,
          msg: ui.text,
          rawError: typeof j?.error === "string" ? j.error : undefined,
        });
        setMessage(ui);
        return;
      }

      adlog("Login submit success -> router.replace", {
        mountId: mountIdRef.current,
        seq,
        to: next,
      });

      router.replace(next);
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      adlog("Login submit exception", { mountId: mountIdRef.current, seq, msg });
      setMessage({ variant: "error", text: msg });
    } finally {
      setLoading(false);
      adlog("Login submit end", { mountId: mountIdRef.current, seq });
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Email</div>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="admin@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Password</div>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {message ? (
              <Alert variant={message.variant} className="border p-3 text-sm">
                {message.text}
              </Alert>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
