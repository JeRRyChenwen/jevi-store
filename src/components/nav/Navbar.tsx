// src/components/nav/Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
// ⬇️ 已移除 ModeToggle
import {
  User as UserIcon,
  // ⬇️ 已移除 Settings
  Heart,
  ShoppingBag,
  Search as SearchIcon,
} from "lucide-react";
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

type User = { id: string; email: string; name?: string | null };
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

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

// 统一尺寸（按钮与图标）
const ICON_BTN = "!h-12 !w-12 md:!h-14 md:!w-14"; // 48/56 点击区域
const ICON_SIZE = "!h-6 !w-6 md:!h-6 md:!w-6";    // 24/24 图标

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
    let lastErr: any = null;
    for (let i = 0; i <= retries; i++) {
      try {
        const r = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (r.ok) {
          const u = (await r.json()) as User;
          setUser(u);
          setLoading(false);
          return;
        }
      } catch (e) {
        lastErr = e;
      }
      if (i < retries) await new Promise((r) => setTimeout(r, i === 0 ? 0 : 100 * i));
    }
    if (lastErr) console.log("[Navbar] fetchMe:failed lastErr =", lastErr);
    setUser(null);
    setLoading(false);
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetchMe({ force: false });

    const onAuthChanged = () => fetchMe({ force: true, retries: 3 });
    const onFocus = () => fetchMe({ force: false });
    const onVisibility = () => { if (!document.hidden) fetchMe({ force: false }); };

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
    else { setUser(null); setLoading(false); }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ⌘K / Ctrl+K 打开搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
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
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    finally {
      setUser(null);
      window.dispatchEvent(new Event("sp-auth-changed"));
      window.location.href = "/auth/login";
    }
  };

  return (
    <nav className="w-full flex items-center h-16 md:h-20 px-4 md:px-8 bg-white border-b border-neutral-200 sticky top-0 z-50">
      {/* 左：Logo */}
      <Link href="/" className="text-xl font-bold whitespace-nowrap">SocialPlatform</Link>

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

        {/* ⬇️ 已移除“设置”图标及其下拉菜单与 ModeToggle */}

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

        {/* 购物袋 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={ICON_BTN} aria-label="cart">
              <ShoppingBag className={ICON_SIZE} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-0">
            <div className="p-3 text-sm text-muted-foreground">Your bag is empty.</div>
            <DropdownMenuSeparator />
            <div className="p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              <Link href="/cart"><Button variant="outline" className="w-full">View cart</Button></Link>
              <Link href="/checkout"><Button className="w-full">Checkout</Button></Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
              <DropdownMenuItem asChild><Link href="/profile">个人资料</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600">退出登录</DropdownMenuItem>
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
