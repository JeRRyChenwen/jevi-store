// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { User as UserIcon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type User = { id: string; email: string; name?: string | null };
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

// 非 HttpOnly 的标志，用于“未登录时不打 /auth/me”
function hasSessionCookie() {
  const has =
    typeof document !== "undefined" &&
    document.cookie.split("; ").some((c) => c.startsWith("sp_has_session=1"));
  return has;
}

function displayName(u: User) {
  if (u.name && u.name.trim()) return u.name.trim().split(/\s+/)[0];
  return u.email.split("@")[0];
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const didInit = useRef(false);
  const pathname = usePathname();

  const fetchMe = async (opts?: { force?: boolean; retries?: number }) => {
    const force = !!opts?.force;
    const retries = opts?.retries ?? 0;

    console.log("[Navbar] fetchMe:start", {
      force,
      retries,
      hasFlag: hasSessionCookie(),
      API_BASE,
      cookie: typeof document !== "undefined" ? document.cookie : "(ssr)",
    });

    // 未登录并且不是强制：不打 /auth/me，直接认为 guest
    if (!force && !hasSessionCookie()) {
      console.log("[Navbar] fetchMe:skip (no sp_has_session flag & not forced)");
      setUser(null);
      setLoading(false);
      return;
    }

    let lastErr: any = null;
    for (let i = 0; i <= retries; i++) {
      try {
        console.log(`[Navbar] /auth/me TRY #${i}`);
        const r = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        console.log(`[Navbar] /auth/me STATUS #${i} =`, r.status);
        if (r.ok) {
          const u = (await r.json()) as User;
          console.log("[Navbar] /auth/me OK user =", u);
          setUser(u);
          setLoading(false);
          return;
        }
      } catch (e) {
        lastErr = e;
        console.log(`[Navbar] /auth/me ERROR #${i}`, e);
      }
      if (i < retries) {
        const wait = i === 0 ? 0 : 100 * i;
        console.log(`[Navbar] /auth/me RETRY in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    if (lastErr) console.log("[Navbar] fetchMe:failed lastErr =", lastErr);
    setUser(null);
    setLoading(false);
  };

  // 首次挂载：根据标志决定是否请求
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    console.log("[Navbar] mounted. will initial fetch (force:false)");
    fetchMe({ force: false });

    const onAuthChanged = () => {
      console.log("[Navbar] EVENT sp-auth-changed");
      fetchMe({ force: true, retries: 3 });
    };
    const onFocus = () => {
      console.log("[Navbar] EVENT window focus");
      fetchMe({ force: false });
    };
    const onVisibility = () => {
      if (!document.hidden) {
        console.log("[Navbar] EVENT visibilitychange -> visible");
        fetchMe({ force: false });
      }
    };

    window.addEventListener("sp-auth-changed", onAuthChanged);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("sp-auth-changed", onAuthChanged);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // 路由变化：只有“看起来已登录”时才强制拉取，避免未登录时的 401 噪音
  useEffect(() => {
    if (!didInit.current) return; // 首次 mount 已在上面处理
    console.log("[Navbar] pathname changed:", pathname);
    if (hasSessionCookie()) {
      console.log("[Navbar] route-change -> has sp_has_session, force fetch");
      fetchMe({ force: true, retries: 2 });
    } else {
      console.log("[Navbar] route-change -> no sp_has_session, skip fetch");
      setUser(null);
      setLoading(false);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // 观测渲染状态变化（调试）
  useEffect(() => {
    console.log("[Navbar] render state:", {
      loading,
      hasUser: !!user,
      user,
    });
  }, [loading, user]);

  const logout = async () => {
    console.log("[Navbar] logout:begin");
    try {
      const r = await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      console.log("[Navbar] logout:status =", r.status);
    } catch (e) {
      console.log("[Navbar] logout:error", e);
    } finally {
      setUser(null);
      window.dispatchEvent(new Event("sp-auth-changed"));
      console.log("[Navbar] logout:redirect -> /auth/login");
      window.location.href = "/auth/login";
    }
  };

  return (
    <nav className="w-full flex justify-between items-center px-6 py-4 border-b bg-background">
      <Link href="/" className="text-xl font-bold">SocialPlatform</Link>

      <div className="flex items-center gap-4">
        {/* 设置 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="settings">
              <Settings className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <div className="w-full"><ModeToggle /></div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 用户 */}
        {loading ? (
          <>
            {console.log("[Navbar] render -> LOADING")}
            <UserIcon className="w-6 h-6 opacity-60" aria-hidden />
          </>
        ) : user ? (
          <>
            {console.log("[Navbar] render -> AUTHED (show name)")}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2" aria-label="account menu">
                  <UserIcon className="w-5 h-5" />
                  <span>Hi, {displayName(user)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link href="/profile">个人资料</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">退出登录</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            {console.log("[Navbar] render -> GUEST (login link)")}
            <Link href="/auth/login" title="登录" aria-label="go to login">
              <UserIcon className="w-6 h-6 hover:text-primary transition-colors cursor-pointer" />
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
