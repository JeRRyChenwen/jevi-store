// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // 你可以保留；如果你不需要 edge，也可以删掉

const WORKER_BASE =
  (process.env.API_PROXY || "").replace(/\/+$/, "") || "http://127.0.0.1:8787";

// 安全拆分多条 Set-Cookie（不会被 Expires 的逗号误伤）
function splitSetCookie(header: string): string[] {
  const out: string[] = [];
  let i = 0,
    part = "",
    inExpires = false;

  while (i < header.length) {
    const ch = header[i];

    if (ch === ",") {
      // 只有在 Expires=Sat, 这种逗号才视为同一条；否则视为分隔两条 cookie
      if (!inExpires) {
        out.push(part.trim());
        part = "";
        i++;
        continue;
      }
    }

    part += ch;

    // 进入/退出 Expires 的逗号保护区
    if (part.toLowerCase().endsWith("expires=")) inExpires = true;
    if (inExpires && ch === ";") inExpires = false;

    i++;
  }

  if (part.trim()) out.push(part.trim());
  return out;
}

function parseSetCookie(c: string) {
  const [kv, ...attrs] = c.split(";").map((s) => s.trim());
  const [name, ...valParts] = kv.split("=");
  const value = valParts.join("=");

  const attrMap = new Map<string, string | true>();
  for (const a of attrs) {
    const [k, ...v] = a.split("=");
    const key = k.toLowerCase();
    const vStr = v.join("=");
    attrMap.set(key, vStr === "" ? true : vStr);
  }

  return { name, value, attrs: attrMap };
}

function normalizeSameSite(v: unknown): "lax" | "strict" | "none" {
  const s = String(v || "").toLowerCase();
  if (s === "strict") return "strict";
  if (s === "none") return "none";
  return "lax";
}

export async function POST(req: NextRequest) {
  // ✅ 不要透传 req.body 流，直接读取为 text 再转发（兼容 JSON / x-www-form-urlencoded）
  const bodyText = await req.text();

  const upstream = await fetch(`${WORKER_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") || "application/json",
      accept: req.headers.get("accept") || "application/json",
      "x-debug": req.nextUrl.searchParams.get("debug") === "1" ? "1" : "0",
    },
    body: bodyText,
    cache: "no-store",
    redirect: "manual",
  });

  // ✅ 读成 text，再返回（不要在这里 upstream.json()）
  const text = await upstream.text();

  const res = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });

  // ✅ 多条 Set-Cookie：用 NextResponse.cookies.set 落地（不要用 cookies() from next/headers）
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) {
    for (const raw of splitSetCookie(setCookie)) {
      const { name, value, attrs } = parseSetCookie(raw);

      res.cookies.set({
        name,
        value,
        httpOnly: attrs.has("httponly"),
        secure: attrs.has("secure"),
        sameSite: normalizeSameSite(attrs.get("samesite")),
        path: (attrs.get("path") as string) || "/",
        expires: attrs.get("expires")
          ? new Date(attrs.get("expires") as string)
          : undefined,
        maxAge: attrs.get("max-age")
          ? Number(attrs.get("max-age"))
          : undefined,
      });
    }
  }

  return res;
}
