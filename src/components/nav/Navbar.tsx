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
import BagButton from "./BagButton";

type User = { id: string; email: string; name?: string | null };

/** ============ API 基址与智能回退 ============ */
const ENV_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").trim();
const ABSOLUTE_RE = /^https?:\/\//i;

function normalizeBase(b: string) {
  if (!b) return "/api";
  return b.endsWith("/") ? b.slice(0, -1) : b;
}

const baseRef: { current: string } = {
  current: normalizeBase(ENV_BASE || "/api"),
};

function buildUrl(path: string, base = baseRef.current) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function safeFetch(
  path: string,
  init?: RequestInit & { retryOnNetworkError?: boolean }
) {
  const retryOnNetworkError = init?.retryOnNetworkError ?? true;

  try {
    const res = await fetch(buildUrl(path), init);
    return res;
  } catch (err: any) {
    const isNetworkError =
      err && (err.name === "TypeError" || err.message?.includes("NetworkError"));

    if (
      retryOnNetworkError &&
      ABSOLUTE_RE.test(baseRef.current) &&
      isNetworkError
    ) {
      baseRef.current = "/api";
      try {
        const res2 = await fetch(buildUrl(path, "/api"), init);
        return res2;
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

/** ============ 其它工具 ============ */
function hasSessionCookie() {
  return (
    typeof document !== "undefined" &&
    document.cookie.split("; ").some((c) => c.startsWith("sp_has_session=1"))
  );
}
function displayName(u: User) {
  if (u.name && u.name.trim()) return u.name.trim().split(/\s+/)[0];
  return u.email.split("@")[0];
}

const ICON_BTN = "!h-12 !w-12 md:!h-14 md:!w-14";
const ICON_SIZE = "!h-6 !w-6 md:!h-6 md:!w-6";

/** ============ 组件 ============ */
export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSearch, setOpenSearch] = useState(false);
  const didInit = useRef(false);
  const pathname = usePathname();

  const fetchMe = async (opts?: { force?: boolean; retries?: number }) => {
    const force = !!opts?.force;
    const retries = opts?.retries ?? 0;

    if (!force && !hasSessionCookie()) {
      setUser(null);
      setLoading(false);
      return;
    }

    let lastErr: unknown = null;
    for (let i = 0; i <= retries; i++) {
      try {
        const r = await safeFetch("/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (r.ok) {
          if (r.status === 204) {
            setUser(null);
          } else {
            const u = (await r.json()) as User;
            setUser(u);
          }
          setLoading(false);
          return;
        }
      } catch (e) {
        lastErr = e;
      }
      if (i < retries) await new Promise((r) => setTimeout(r, i === 0 ? 0 : 100 * i));
    }
    setUser(null);
    setLoading(false);
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetchMe({ force: false });

    const onAuthChanged = () => fetchMe({ force: true, retries: 3 });
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
    if (hasSessionCookie()) fetchMe({ force: true, retries: 2 });
    else {
      setUser(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ⌘K / Ctrl+K 打开搜索 —— 增加空值保护 & 在输入时忽略
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = (el?.tagName ?? "").toLowerCase();
      const isTyping =
        !!el?.isContentEditable ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";

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
      await safeFetch("/auth/logout", {
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
    <nav className="w-full flex items-center h-16 md:h-20 px-4 md:px-8 bg-white border-b border-neutral-200 sticky top-0 z-50">
      {/* 左：Logo */}
      <Link href="/" className="text-xl font-bold whitespace-nowrap">
        SocialPlatform
      </Link>

      {/* 右侧整体（搜索 + 图标）推到右边 */}
      <div className="ml-auto flex items-center gap-1 md:gap-2">
        {/* 桌面端搜索框 */}
        <CompactSearch className="w-[420px] lg:w-[560px] mr-10 md:mr-30" />

        {/* 移动端放大镜按钮（md 以下显示） */}
        <Button
          variant="ghost"
          size="icon"
          className={`${ICON_BTN} md:hidden`}
          aria-label="search"
          onClick={() => setOpenSearch(true)}
        >
          <SearchIcon className={ICON_SIZE} />
        </Button>

        {/* 心愿单 */}
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

        {/* ✅ 背包按钮（点击触发右侧购物袋抽屉） */}
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
          <Button asChild variant="ghost" size="icon" className={ICON_BTN} aria-label="go to login">
            <Link href="/auth/login" title="登录">
              <UserIcon className={ICON_SIZE} />
            </Link>
          </Button>
        )}
      </div>

      {/* 移动端全屏搜索弹层 */}
      <SearchOverlay open={openSearch} onClose={() => setOpenSearch(false)} />
    </nav>
  );
}
