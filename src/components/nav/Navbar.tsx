// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { User as UserIcon, Settings, Heart, ShoppingBag } from "lucide-react";
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

// 统一尺寸（按钮与图标）
// const ICON_BTN = "h-10 w-10 md:h-12 md:w-12";    // 点击区域更大
// const ICON_SIZE = "w-20 h-20 md:w-21 md:h-21";       // 图标本体更大
const ICON_BTN  = "!h-12 !w-12 md:!h-14 md:!w-14";   // 点击区域：48px / 56px
const ICON_SIZE = "!h-6  !w-6  md:!h-6  md:!w-6";    // 图标本体：28px / 32px



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

  // 首次挂载
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

  // 路由变化
  useEffect(() => {
    if (!didInit.current) return;
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

  // 渲染观测
  useEffect(() => {
    console.log("[Navbar] render state:", { loading, hasUser: !!user, user });
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
    <nav className="w-full flex justify-between items-center h-20 md:h-20 px-6 md:px-8 border-b bg-background">
      <Link href="/" className="text-xl font-bold">SocialPlatform</Link>

      {/* 右侧图标（统一尺寸与间距） */}
      <div className="flex items-center gap-0 md:gap-1">
        {/* 设置 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className={ICON_BTN} aria-label="settings">
              <Settings className={ICON_SIZE} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <div className="w-full"><ModeToggle /></div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

        {/* 用户（加载 / 未登录 / 已登录 -> 全部使用同一 icon 按钮尺寸） */}
        {loading ? (
          <Button variant="ghost" size="icon" className={`${ICON_BTN} opacity-60`} disabled aria-label="account loading">
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
    </nav>
  );
}
