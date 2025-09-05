// src/app/api/strapi/route.ts
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_URL = "http://localhost:1337";
const SERVER_URL = (process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? DEFAULT_URL).replace(/\/+$/, "");
const TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * 客户端 POST /api/strapi
 * body: { path: string, opts?: RequestInit & { noCache?: boolean } }
 * 服务器转发到 Strapi，并注入 Authorization 头
 */
export async function POST(req: NextRequest) {
  try {
    const { path, opts } = await req.json().catch(() => ({}));
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Missing 'path' in body." }, { status: 400 });
    }
    if (!TOKEN) {
      return NextResponse.json({ error: "Server missing STRAPI_API_TOKEN." }, { status: 500 });
    }

    // 只允许转发到我们的 Strapi
    const url = path.startsWith("http")
      ? path
      : `${SERVER_URL}${path.startsWith("/") ? "" : "/"}${path}`;

    if (!url.startsWith(SERVER_URL)) {
      return NextResponse.json({ error: "Blocked: target not allowed." }, { status: 400 });
    }

    const method = (opts?.method || "GET").toUpperCase();
    const noCache = !!opts?.noCache;

    // 组装请求头（禁止客户端自带 Authorization）
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(opts?.headers || {}),
    };
    delete (headers as any).authorization;
    delete (headers as any).Authorization;
    headers.Authorization = `Bearer ${TOKEN}`;

    const fetchOpts: RequestInit & { next?: RequestInit["next"] } = {
      method,
      headers,
    };

    if (opts?.body) {
      fetchOpts.body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
    }

    if (noCache) fetchOpts.cache = "no-store";
    const defaultRevalidate = noCache ? 0 : 60;
    fetchOpts.next = { revalidate: defaultRevalidate };

    const res = await fetch(url, fetchOpts);
    const contentType = res.headers.get("content-type") || "";
    const isJSON = contentType.includes("application/json");

    if (!res.ok) {
      const errBody = isJSON ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
      return NextResponse.json(
        typeof errBody === "string" ? { error: errBody } : errBody,
        { status: res.status }
      );
    }

    if (isJSON) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      // 极少数接口不是 JSON（几乎不会发生），兜底
      const text = await res.text();
      return new NextResponse(text, { status: res.status, headers: { "content-type": contentType } });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Proxy error" }, { status: 500 });
  }
}
