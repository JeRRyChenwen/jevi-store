// src/app/(admin)/admin/login/AdminLoginForm.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { adlog } from "@/lib/debug";

export default function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const seq = ++submitSeqRef.current;

    adlog("Login submit start", {
      mountId: mountIdRef.current,
      seq,
      next,
      email: email.trim().toLowerCase(),
    });

    setLoading(true);
    setError("");

    try {
      const r = await fetch("/api/admin/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
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
        const msg = j?.error || `Login failed (${r.status})`;
        adlog("Login submit failed", { mountId: mountIdRef.current, seq, msg });
        setError(msg);
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
      setError(msg);
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

            {error ? (
              <div className="rounded-md border p-3 text-sm text-red-600">
                {error}
              </div>
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
