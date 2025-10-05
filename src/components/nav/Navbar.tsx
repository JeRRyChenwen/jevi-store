// src/components/nav/Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { User as UserIcon, Heart, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import CompactSearch from "@/components/search/CompactSearch";
import SearchOverlay from "@/components/search/SearchOverlay";
// ✅ 用全局单例版的 BagButton
import BagButton from "@/components/bag/BagButton";

type User = { id: string; email: string; name?: string | null };

/* ============ 基址 ============ */
const ENV_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").trim();
const ABSOLUTE_RE = /^https?:\/\//i;
const SECONDARY_BASE = ABSOLUTE_RE.test(ENV_BASE)
  ? (ENV_BASE.endsWith("/") ? ENV_BASE.slice(0, -1) : ENV_BASE)
  : null;

/** 总是优先打本地 /api；只有 /api 返回 404 时，才尝试远端 SECONDARY_BASE */
async function fetchWithFallback(path: string, init?: RequestInit) {
  const p = path.startsWith("/") ? path : `/${path}`;

  // 1) 本地优先
  const resLocal = await fetch(`/api${p}`, init).catch(() => null as unknown as Response);
  if (resLocal) {
    if (resLocal.status !== 404) return resLocal;
  }

  // 2) 本地 404 且配置了远端，再打远端
  if (SECONDARY_BASE) {
    try {
      const resRemote = await fetch(`${SECONDARY_BASE}${p}`, init);
      return resRemote;
    } catch {
      return resLocal!;
    }
  }

  return resLocal!;
}

/* ============ 其它工具 ============ */
function hasSessionCookie() {
  if (typeof document === "undefined") return false;
  const c = document.cookie;
  return c.includes("sp_has_session=1") || /(?:^|;\s*)sp_user=/.test(c);
}
function displayName(u: User) {
  if (u.name && u.name.trim()) return u.name.trim().split(/\s+/)[0];
  return u.email.split("@")[0];
}

const ICON_BTN = "!h-12 !w-12 md:!h-14 md:!w-14";
const ICON_SIZE = "!h-6 !w-6 md:!h-6 md:!w-6";

/* ============ single-flight + 轻缓存（同一标签页） ============ */
declare global {
  interface Window {
    __sp_me_inflight?: Promise<User | null>;
    __sp_me_cache?: { ts: number; data: User | null };
  }
}
const ME_CACHE_TTL = 30_000;

/* ============ 组件 ============ */
export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSearch, setOpenSearch] = useState(false);
  const didInit = useRef(false);
  const pathname = usePathname();

  const fetchMe = async (opts?: { force?: boolean }) => {
    const force = !!opts?.force;

    if (!force && !hasSessionCookie()) {
      setUser(null);
      setLoading(false);
      return;
    }

    const cache = typeof window !== "undefined" ? window.__sp_me_cache : undefined;
    if (!force && cache && Date.now() - cache.ts < ME_CACHE_TTL) {
      setUser(cache.data ?? null);
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined" && window.__sp_me_inflight) {
      try {
        const data = await window.__sp_me_inflight;
        setUser(data ?? null);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (typeof window !== "undefined") {
      window.__sp_me_inflight = (async (): Promise<User | null> => {
        const res = await fetchWithFallback("/auth/me", {
          credentials: "include",
          cache: "no-store",
        }).catch(() => null as unknown as Response);

        if (!res) return null;    // 网络异常
        if (!res.ok) return null; // 401/404/500 等都视作未登录
        if (res.status === 204) return null;

        const u = (await res.json().catch(() => null)) as User | null;
        return u;
      })();
    }

    try {
      const data = await (window.__sp_me_inflight as Promise<User | null>).catch(() => null);
      if (typeof window !== "undefined") {
        window.__sp_me_cache = { ts: Date.now(), data: data ?? null };
      }
      setUser(data ?? null);
    } finally {
      if (typeof window !== "undefined") delete window.__sp_me_inflight;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetchMe({ force: false });

    const onAuthChanged = () => fetchMe({ force: true });
    const onFocus = () => fetchMe({ force: false });
    const onVisibility = () => {
      if (!document.hidden) fetchMe({ force: false });
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

  useEffect(() => {
    if (!didInit.current) return;
    if (hasSessionCookie()) fetchMe({ force: true });
    else {
      setUser(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ⌘K / Ctrl+K 打开搜索（输入时忽略）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = (el?.tagName ?? "").toLowerCase();
      const isTyping =
        !!el?.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
      if (isTyping) return;

      const key = (e.key ?? "").toLowerCase();
      if (!key) return;
      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault();
        setOpenSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const logout = async () => {
    try {
      await fetchWithFallback("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // 忽略网络错误
    } finally {
      setUser(null);
      window.dispatchEvent(new Event("sp-auth-changed"));
      window.location.href = "/auth/login";
    }
  };

  return (
    <>
      {/* 顶部固定且全宽：背景用纯白，避免与页面叠加出现色差 */}
      <div className="fixed top-0 inset-x-0 z-50 bg-white border-b border-neutral-200">
        {/* 内容容器：居中排版，如需内容也全宽，去掉 max-w-[1400px] + mx-auto */}
        <nav className="mx-auto w-full max-w-[1400px] px-4 md:px-8 h-16 md:h-20 flex items-center">
          {/* 左：Logo */}
          <Link href="/" className="text-xl font-bold whitespace-nowrap">
            SocialPlatform
          </Link>

          {/* 右：搜索 + 图标 */}
          <div className="ml-auto flex items-center gap-1 md:gap-2">
            <CompactSearch className="w-[420px] lg:w-[560px] mr-10 md:mr-30" />

            <Button
              variant="ghost"
              size="icon"
              className={`${ICON_BTN} md:hidden`}
              aria-label="search"
              onClick={() => setOpenSearch(true)}
            >
              <SearchIcon className={ICON_SIZE} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={ICON_BTN} aria-label="wishlist">
                  <Heart className={ICON_SIZE} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled>0 saved items</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/wishlist">Open wishlist</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 购物袋按钮（调用全局 bag 单例） */}
            <BagButton />

            {/* 用户 */}
            {loading ? (
              <Button
                variant="ghost"
                size="icon"
                className={`${ICON_BTN} opacity-60`}
                disabled
                aria-label="account loading"
              >
                <UserIcon className={ICON_SIZE} />
              </Button>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={ICON_BTN} aria-label="account menu">
                    <UserIcon className={ICON_SIZE} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>Signed in as {displayName(user)}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">个人资料</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className={ICON_BTN}
                aria-label="go to login"
              >
                <Link href="/auth/login" title="登录">
                  <UserIcon className={ICON_SIZE} />
                </Link>
              </Button>
            )}
          </div>
        </nav>
      </div>

      {/* 搜索浮层（放在 fixed bar 外做兄弟节点更稳） */}
      <SearchOverlay open={openSearch} onClose={() => setOpenSearch(false)} />
    </>
  );
}
