// src/app/auth/reset-password/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!; // e.g. http://localhost:8787

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string().min(8, "Confirmation must be at least 8 characters."),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

type ResetForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => sp.get("token")?.trim() || "", [sp]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<ResetForm>({ resolver: zodResolver(schema) });

  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ✅ Whenever user types, clear the previous server error to avoid "stacked" messages
  const pwd = watch("password");
  const cfm = watch("confirm");
  useEffect(() => {
    if (errorMessage) setErrorMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pwd, cfm]);

  const hasValidationErrors = !!errors.password || !!errors.confirm;

  const onSubmit = async (data: ResetForm) => {
    setErrorMessage("");

    try {
      if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE in .env.local.");
      if (!token) throw new Error("Invalid reset link: missing token.");

      console.log("[ResetPassword] POST /auth/reset ->", {
        API_BASE,
        hasToken: !!token,
      });

      const res = await fetch(`${API_BASE}/auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // keep consistent; backend may clear cookies
        body: JSON.stringify({ token, password: data.password }),
      });

      const body = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg = body?.error || body?.message || "Reset failed.";
        throw new Error(msg);
      }

      // ✅ success
      setDone(true);
      setErrorMessage("");
      reset({ password: "", confirm: "" });
    } catch (err: any) {
      console.log("[ResetPassword] ERROR ->", err);
      setErrorMessage(err?.message || "Network or server error.");
    }
  };

  // Token missing: show a dedicated state (still in the same upgraded layout)
  if (!token) {
    return (
      <main className="min-h-screen bg-muted/30 flex items-start">
        <div className="mx-auto w-full max-w-5xl px-4 pt-40 pb-16">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            {/* Left */}
            <section className="space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight">
                Reset your password
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This reset link is invalid or incomplete. Please request a new reset
                link and try again.
              </p>

              <div className="rounded-lg border bg-white/70 p-4 text-sm text-muted-foreground">
                <div className="font-medium text-neutral-900 mb-1">
                  What you can do
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Go back to the “Forgot password” page and request a new link.</li>
                  <li>Make sure the link opens with a token parameter.</li>
                  <li>If the link is old, it may have expired.</li>
                </ul>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Need a new link?</span>{" "}
                <Link
                  href="/auth/forgot-password"
                  className="underline underline-offset-4"
                >
                  Back to forgot password
                </Link>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Already have access?</span>{" "}
                <Link href="/auth/login" className="underline underline-offset-4">
                  Back to login
                </Link>
              </div>
            </section>

            {/* Right */}
            <section>
              <Card className="shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle className="text-xl">Invalid reset link</CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="rounded-lg border bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-700">
                      This link is missing the required token parameter.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button asChild className="w-full border border-neutral-300">
                      <Link href="/auth/forgot-password">Request a new link</Link>
                    </Button>

                    <Button asChild variant="outline" className="w-full">
                      <Link href="/auth/login">Back to login</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    );
  }

  // Normal state: token exists
  return (
    <main className="min-h-screen bg-muted/30 flex items-start">
      <div className="mx-auto w-full max-w-5xl px-4 pt-40 pb-16">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          {/* Left: description */}
          <section className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight">
              Set a new password
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose a strong password you don’t use elsewhere. After updating, you
              can sign in with your new password immediately.
            </p>

            <div className="rounded-lg border bg-white/70 p-4 text-sm text-muted-foreground">
              <div className="font-medium text-neutral-900 mb-1">
                Before you continue
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>This reset link may expire for security reasons.</li>
                <li>If it fails, request a new reset link.</li>
                <li>Use at least 8 characters for better security.</li>
              </ul>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Need a new link?</span>{" "}
              <Link
                href="/auth/forgot-password"
                className="underline underline-offset-4"
              >
                Back to forgot password
              </Link>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Remember your password?</span>{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Back to login
              </Link>
            </div>
          </section>

          {/* Right: form card */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-xl">
                  {done ? "Password updated" : "Reset password"}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                {done ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-green-50 px-4 py-3">
                      <p className="text-sm text-green-700">
                        Your password has been reset successfully. Please sign in with your new password.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        onClick={() => router.push("/auth/login")}
                        className="w-full border border-neutral-300"
                      >
                        Go to login
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => router.push("/")}
                        className="w-full"
                      >
                        Back to homepage
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">New password</Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Enter a new password"
                        {...register("password")}
                      />
                      {errors.password && (
                        <p className="text-sm text-red-600">
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirm new password</Label>
                      <Input
                        id="confirm"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Re-enter your new password"
                        {...register("confirm")}
                      />
                      {errors.confirm && (
                        <p className="text-sm text-red-600">
                          {errors.confirm.message}
                        </p>
                      )}
                    </div>

                    {errorMessage && (
                      <div className="rounded-lg border bg-red-50 px-4 py-3">
                        <p className="text-sm text-red-700">{errorMessage}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting || hasValidationErrors}
                      className="w-full border border-neutral-300"
                    >
                      {isSubmitting ? "Updating..." : "Update password"}
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      If your reset link is expired, request a new one from the forgot password page.
                    </p>

                    <div className="pt-2 flex flex-col gap-2">
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/auth/forgot-password">Request a new link</Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/auth/login">Back to login</Link>
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
