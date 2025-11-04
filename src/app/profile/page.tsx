// src/app/profile/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logoutAction } from "./_actions";
import EditProfileCard from "./EditProfileCard";
import {
  User as UserIcon,
  ShoppingBag,
  MapPin,
  Mail,
  ChevronDown,
} from "lucide-react";
import EditOrdersCard from "./EditOrdersCard";

/** base64url -> string */
function b64urlToString(input: string): string {
  try {
    let s = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4;
    if (pad) s += "=".repeat(4 - pad);
    return Buffer.from(s, "base64").toString("utf8");
  } catch {
    return "";
  }
}

type SessionUser = {
  id: string | number | null;
  email: string | null;
  name: string | null;
};

async function readUserFromCookies(): Promise<SessionUser | null> {
  const jar = await cookies();
  const rawUser = jar.get("sp_user")?.value || "";
  const hasPresence = jar.get("sp_has_session")?.value === "1";
  const jwt = jar.get("sp_session")?.value || "";

  if (rawUser) {
    try {
      const json = Buffer.from(rawUser, "base64").toString("utf8");
      const u = JSON.parse(json);
      const shaped: SessionUser = {
        id: u?.id ?? null,
        email: typeof u?.email === "string" ? u.email : null,
        name: typeof u?.name === "string" ? u.name : null,
      };
      if (shaped.email) return shaped;
    } catch {}
  }

  if (hasPresence && jwt) {
    const parts = jwt.split(".");
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(b64urlToString(parts[1] || "")) as any;
        const shaped: SessionUser = {
          id: payload?.sub ?? null,
          email: typeof payload?.email === "string" ? payload.email : null,
          name: typeof payload?.name === "string" ? payload.name : null,
        };
        if (shaped.email) return shaped;
      } catch {}
    }
  }
  return null;
}

async function apiGet<T>(path: string): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(path, {
    method: "GET",
    headers: { accept: "application/json", cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail: any = null;
    try {
      detail = await res.json();
    } catch {}
    throw new Error(
      `GET ${path} failed: ${res.status} ${res.statusText} ${detail ? JSON.stringify(detail) : ""}`
    );
  }
  return (await res.json()) as T;
}

type MeResp = {
  ok: boolean;
  user: { id: number; email: string | null; name: string | null } | null;
  worker_version?: string;
};

export default async function ProfilePage() {
  // A) 先从 cookie 取
  let user = await readUserFromCookies();
  if (!user) {
    redirect("/auth/login?next=/profile");
  }

  // B) cookie 没有 name → 从后端 /auth/me 兜底拉取
  if (user && (!user.name || !user.name.trim())) {
    try {
      const me = await apiGet<MeResp>("/api/auth/me");
      if (me?.ok && me.user?.email) {
        user = {
          id: me.user.id ?? user.id,
          email: me.user.email ?? user.email,
          name: (me.user.name ?? "").trim() || user.email?.split("@")[0] || null,
        };
      }
    } catch {
      user = {
        ...user!,
        name: user?.name?.trim() || user?.email?.split("@")[0] || null,
      };
    }
  }

  const displayName =
    (user?.name || "").trim() || (user?.email ? user.email.split("@")[0] : "") || "User";

  const [guessedFirst, guessedLast] = (() => {
    const n = (user?.name || "").trim();
    if (!n) return ["", ""];
    const parts = n.split(/\s+/);
    return [parts[0] || "", parts.slice(1).join(" ") || ""];
  })();

  // === UI ===
  return (
    <main className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Hi, {displayName}</h1>

      {/* 折叠区块 */}
      <div className="mt-6 border rounded-lg divide-y">
        {/* Profile */}
        <details open className="group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none hover:bg-neutral-50">
            <span className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-neutral-700" />
              <span>Profile</span>
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-500 group-open:rotate-180 transition-transform" />
          </summary>

          <EditProfileCard
            initialFirstName={guessedFirst}
            initialLastName={guessedLast}
            initialEmail={user?.email || ""}
          />
        </details>

        {/* Orders */}
        <details open className="group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none hover:bg-neutral-50">
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-neutral-700" />
              <span>Orders</span>
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-500 group-open:rotate-180 transition-transform" />
          </summary>
          <EditOrdersCard />
        </details>

        {/* 其他占位 */}
        {[{ label: "Delivery Address", icon: MapPin }, { label: "Subscriptions", icon: Mail }].map(
          (item) => {
            const Icon = item.icon;
            return (
              <details key={item.label} className="group">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-neutral-700" />
                    <span>{item.label}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-neutral-500 group-open:rotate-180 transition-transform" />
                </summary>
              </details>
            );
          }
        )}
      </div>

      {/* 退出登录 */}
      <form action={logoutAction} className="mt-6">
        <button
          type="submit"
          className="rounded-full border px-5 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          退出登录
        </button>
      </form>
    </main>
  );
}
