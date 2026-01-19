"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

const schema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

type ForgotPasswordFormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(schema),
  });

  const [sent, setSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`${API_BASE}/auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: data.email.trim().toLowerCase() }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.error || "Request failed.");
      }

      setSent(true);
      setSuccessMessage(
        "If an account with that email exists, we’ve sent a password reset link."
      );
    } catch (err: any) {
      setErrorMessage(err?.message || "Network or server error.");
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 flex items-start">
      <div className="mx-auto w-full max-w-5xl px-4 pt-40 pb-16">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          {/* Left: description */}
          <section className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight">
              Reset your password
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter the email address associated with your account. We’ll send
              you a link to set a new password.
            </p>

            <div className="rounded-lg border bg-white/70 p-4 text-sm text-muted-foreground">
              <div className="font-medium text-neutral-900 mb-1">
                Before you continue
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Check your inbox and spam/junk folder.</li>
                <li>The reset link may take a few minutes to arrive.</li>
                <li>
                  For security, we don’t confirm whether an email exists in our
                  system.
                </li>
              </ul>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">
                Remember your password?
              </span>{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Back to login
              </Link>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">New here?</span>{" "}
              <Link
                href="/auth/register"
                className="underline underline-offset-4"
              >
                Create an account
              </Link>
            </div>
          </section>

          {/* Right: form card */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-xl">
                  {sent ? "Check your email" : "Forgot password"}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                {sent ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-green-50 px-4 py-3">
                      <p className="text-sm text-green-700">
                        {successMessage}
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Click the link in the email to reset your password.
                    </p>

                    <div className="flex gap-2">
                      <Button asChild variant="secondary" className="w-full">
                        <Link href="/auth/login">Back to login</Link>
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSent(false);
                          setErrorMessage("");
                          setSuccessMessage("");
                        }}
                      >
                        Send again
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email address</Label>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600">
                          {errors.email.message}
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
                      disabled={isSubmitting}
                      className="w-full border border-neutral-300"
                    >
                      {isSubmitting ? "Sending..." : "Send reset link"}
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      We’ll send a secure link to reset your password. If you
                      don’t see it, check your spam folder.
                    </p>
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
