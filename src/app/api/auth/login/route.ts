// src/app/api/auth/login/route.ts
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'edge'; // 或删掉，按你的部署环境

const WORKER_BASE = process.env.API_PROXY || 'http://127.0.0.1:8787';

// 安全拆分多条 Set-Cookie（不会被 Expires 的逗号误伤）
function splitSetCookie(header: string): string[] {
  const out: string[] = [];
  let i = 0, part = '', inExpires = false;
  while (i < header.length) {
    const ch = header[i];
    if (ch === ',') {
      // 只有在 Expires=Sat, 这种逗号才视为同一条；否则视为分隔两条 cookie
      if (!inExpires) {
        out.push(part.trim());
        part = '';
        i++; continue;
      }
    }
    part += ch;
    // 进入/退出 Expires 的逗号保护区
    if (part.toLowerCase().endsWith('expires=')) inExpires = true;
    if (inExpires && ch === ';') inExpires = false;
    i++;
  }
  if (part.trim()) out.push(part.trim());
  return out;
}

function parseSetCookie(c: string) {
  const [kv, ...attrs] = c.split(';').map(s => s.trim());
  const [name, ...valParts] = kv.split('=');
  const value = valParts.join('=');
  const attrMap = new Map<string, string | true>();
  for (const a of attrs) {
    const [k, ...v] = a.split('=');
    const key = k.toLowerCase();
    const vStr = v.join('=');
    attrMap.set(key, vStr === '' ? true : vStr);
  }
  return { name, value, attrs: attrMap };
}

export async function POST(req: NextRequest) {
  // 透传 body/headers 到 Worker
  const upstream = await fetch(`${WORKER_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': req.headers.get('content-type') || 'application/json',
      'x-debug': req.nextUrl.searchParams.get('debug') === '1' ? '1' : '0',
      // 需要的话透传其它头
    },
    body: req.body,       // 直接透传流
    redirect: 'manual',
  });

  // 先把上游响应体直接透传
  const res = new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers, // 先带上大多数字段
  });

  // 但「多条 Set-Cookie」需要单独处理（避免被合并/丢失）
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) {
    const jar = cookies(); // Next 的服务端写 cookie API
    for (const raw of splitSetCookie(setCookie)) {
      const { name, value, attrs } = parseSetCookie(raw);
      // 用 upstream 的属性落地（HttpOnly/SameSite/Secure/Path/Expires/Max-Age）
      jar.set({
        name,
        value,
        httpOnly: attrs.has('httponly'),
        secure: attrs.has('secure'),
        sameSite: (attrs.get('samesite') as any) || 'lax',
        path: (attrs.get('path') as string) || '/',
        expires: attrs.get('expires') ? new Date(attrs.get('expires') as string) : undefined,
        maxAge: attrs.get('max-age') ? Number(attrs.get('max-age')) : undefined,
      });
    }
    // **重要**：把上游合并过的一条 set-cookie 从 header 里删掉，避免重复/冲突
    res.headers.delete('set-cookie');
  }

  return res;
}
