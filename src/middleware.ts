// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Storefront app no longer serves admin pages.
  // Keep this as an explicit blocker so old /admin links do not silently behave strangely.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.json(
      {
        ok: false,
        error: "admin_moved",
        message: "Admin is no longer served by the storefront app.",
      },
      {
        status: 410,
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};