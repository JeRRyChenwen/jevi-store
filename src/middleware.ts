// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE_NAME = "sp_admin";
const DEBUG = true;

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) 放行 Next.js 内部资源
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // 2) 放行 admin 登录页（以及其子路径，比如你将来放 AdminLoginForm 之类）
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    const res = NextResponse.next();
    if (DEBUG) res.headers.set("x-admin-mw", "pass:login_page");
    return res;
  }

  // 3) 放行 admin auth API（注意：matcher 目前不会拦 /api，但留着防未来改 matcher）
  if (pathname.startsWith("/api/admin/auth/")) {
    const res = NextResponse.next();
    if (DEBUG) res.headers.set("x-admin-mw", "pass:admin_auth_api");
    return res;
  }

  // 4) 保护 /admin/**
  if (pathname.startsWith("/admin")) {
    const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;

    if (!cookie) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", pathname + search);

      const res = NextResponse.redirect(loginUrl);
      if (DEBUG) res.headers.set("x-admin-mw", "redirect:no_cookie");
      return res;
    }

    const res = NextResponse.next();
    if (DEBUG) res.headers.set("x-admin-mw", "pass:has_cookie");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
