// src/app/(shop)/auth/login/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import AuthShell from "@/components/auth/AuthShell";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { useFormAlert } from "@/hooks/useFormAlert";
import { FieldMessage } from "@/components/ui/field-message";

const AUTH_BASE = "/api";
const buildAuth = (p: string) =>
  `${AUTH_BASE}${p.startsWith("/") ? p : `/${p}`}`;

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type LoginFormData = z.infer<typeof schema>;

/** 将对象序列化为 x-www-form-urlencoded */
function toForm(data: Record<string, string>) {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

type LoginAttemptResult = {
  res: Response;
  body: any;
};

/** 尝试登录（JSON -> 必要时 fallback 到 x-www-form-urlencoded） */
async function attemptLogin(payload: {
  login: string;
  password: string;
}): Promise<LoginAttemptResult> {
  // ---- 尝试 1：application/json
  let res = await fetch(buildAuth("/auth/login"), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  // 尝试解析返回体（可能不是 JSON，所以 clone）
  let body: any = null;
  try {
    body = await res.clone().json();
  } catch {}

  // 如果后端返回了“缺少字段”的固定文案，则自动回退为 x-www-form-urlencoded 再试一次
  if (
    res.status === 400 &&
    (body?.error || body?.message || "")
      .toString()
      .toLowerCase()
      .includes("missing email/identifier or password")
  ) {
    // ---- 尝试 2：application/x-www-form-urlencoded
    res = await fetch(buildAuth("/auth/login"), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        accept: "application/json",
      },
      credentials: "include",
      cache: "no-store",
      body: toForm(payload),
    });

    body = null;
    try {
      body = await res.clone().json();
    } catch {}
  }

  return { res, body };
}

function LoginPageContent() {
  const sp = useSearchParams();
  const nextUrl = sp.get("next") || "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(schema) });

  const [showPassword, setShowPassword] = useState(false);

  // ✅ 统一 error/success 状态（并做后端文案映射）
  const { alert, clear, setAlert } = useFormAlert({
    mapMessage: (raw) => {
      const s = (raw || "").trim().toLowerCase();

      // 常见后端：invalid credentials / invalid email or password
      if (
        s.includes("invalid credentials") ||
        s.includes("invalid email or password")
      ) {
        return "Incorrect email or password. Please try again.";
      }

      return (raw || "").trim();
    },
    defaultNetworkError: "Network or server error.",
  });

  const onSubmit = async (data: LoginFormData) => {
    // ✅ 每次提交前先清掉旧提示
    clear();

    const email = data.email.trim().toLowerCase();
    const payload = { login: email, password: data.password }; // ✅ 后端只认 login + password

    try {
      const { res, body } = await attemptLogin(payload);

      // ✅ 业务失败：401 = 用户账号/密码错误（预期结果：不 throw，不 console.error）
      if (res.status === 401) {
        setAlert({
          type: "error",
          message: body?.error || body?.message || "Invalid credentials",
        });
        return;
      }

      // ✅ 其他非 2xx：当作“系统/请求失败”
      if (!res.ok) {
        const msg =
          body?.error || body?.message || `Login failed (${res.status})`;
        throw new Error(msg);
      }

      // ✅ 登录成功后，轮询 /auth/me 几次，确保 Cookie 生效（代理&时序下更稳）
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (const delay of [0, 80, 160, 320, 480]) {
        try {
          const r = await fetch(buildAuth("/auth/me"), {
            credentials: "include",
            cache: "no-store",
            headers: { accept: "application/json" },
          });
          if (r.status === 200) break;
        } catch {}
        await sleep(delay);
      }

      try {
        window.dispatchEvent(new Event("sp-auth-changed"));
        localStorage.setItem("sp_auth_ping", `${Date.now()}`);
      } catch {}

      // 可选：调试输出（HttpOnly 的 cookie 不会显示在 document.cookie，这是正常的）
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[login] success. cookies (non-HttpOnly only):",
          document.cookie,
        );
      }

      window.location.href = nextUrl;
    } catch (err: any) {
      // ✅ 只有“真正异常”才提示（网络/500/解析异常等）
      if (process.env.NODE_ENV !== "production") {
        console.error("Login exception:", err);
      }
      setAlert({
        type: "error",
        message: err?.message || "Network or server error.",
      });
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Access your saved items and orders."
      footer={
        <div className="text-center text-sm text-muted-foreground font-semibold space-y-4">
          <p>
            Don’t have an account?{" "}
            <a
              href="/auth/register"
              className="underline hover:text-primary font-semibold"
            >
              Create one
            </a>
          </p>
          <div className="h-8" aria-hidden />
          <p>
            <a
              href="/auth/forgot-password"
              className="underline hover:text-primary font-semibold"
            >
              Forgot password?
            </a>
          </p>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        autoComplete="on"
      >
        <div className="grid gap-3">
          <Label htmlFor="email" className="block">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email", { onChange: () => clear() })}
          />
          {errors.email?.message && (
            <FieldMessage variant="error">{errors.email.message}</FieldMessage>
          )}
        </div>

        <div className="grid gap-3">
          <Label htmlFor="password" className="block">
            Password
          </Label>

          {/* ✅ Password + eye icon */}
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-10"
              {...register("password", { onChange: () => clear() })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {errors.password?.message && (
            <FieldMessage variant="error">
              {errors.password.message}
            </FieldMessage>
          )}
        </div>

        {/* ✅ 表单级提示块：后续 success 也复用同一组件 */}
        {alert?.message && (
          <Alert variant={alert.type === "success" ? "success" : "error"}>
            {alert.message}
          </Alert>
        )}

        {/* ⬇️ 两行空白（每行约 2rem） */}
        <div className="h-8" aria-hidden />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-auto px-10 h-11 rounded-xl border border-input mx-auto block"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4 py-10">
          <div className="w-full rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            Loading login...
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
