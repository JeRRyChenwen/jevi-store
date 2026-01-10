// src/app/(admin)/admin/AdminAuthGate.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { adlog } from "@/lib/debug";

type AdminMeResp = {
  ok: boolean;
  admin: null | {
    admin_id: number;
    email: string;
    name: string | null;
    role: string;
    actor: string;
  };
  error?: string;
};

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [ready, setReady] = useState(false);

  // ✅ 防 StrictMode/热更新重复触发
  const startedRef = useRef(false);

  // ✅ 用于追踪是否“反复挂载”
  const mountIdRef = useRef<string>(Math.random().toString(16).slice(2));
  const reqSeqRef = useRef(0);

  useEffect(() => {
    adlog("Gate mounted", { mountId: mountIdRef.current, pathname, search: sp?.toString() });
    return () => {
      adlog("Gate unmounted", { mountId: mountIdRef.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 如果 gate 被包进了 /admin/login，直接放行
    if (pathname === "/admin/login") {
      adlog("Gate bypass on /admin/login", { mountId: mountIdRef.current });
      setReady(true);
      return;
    }

    if (startedRef.current) {
      adlog("Gate effect skipped (already started)", {
        mountId: mountIdRef.current,
        pathname,
        search: sp?.toString(),
      });
      return;
    }
    startedRef.current = true;

    const next = `${pathname}${sp?.toString() ? `?${sp.toString()}` : ""}`;
    const seq = ++reqSeqRef.current;

    adlog("Gate check start", { mountId: mountIdRef.current, seq, next });

    (async () => {
      try {
        const r = await fetch("/api/admin/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        adlog("Gate check response", {
          mountId: mountIdRef.current,
          seq,
          status: r.status,
          ok: r.ok,
        });

        if (r.status === 401) {
          const to = `/admin/login?next=${encodeURIComponent(next)}`;
          adlog("Gate redirect (401) ->", { mountId: mountIdRef.current, seq, to });
          router.replace(to);
          return;
        }

        if (!r.ok) {
          const to = `/admin/login?next=${encodeURIComponent(next)}`;
          adlog("Gate redirect (!ok) ->", { mountId: mountIdRef.current, seq, to });
          router.replace(to);
          return;
        }

        const j = (await r.json().catch(() => ({}))) as AdminMeResp;
        adlog("Gate check json", { mountId: mountIdRef.current, seq, ok: j?.ok, hasAdmin: !!j?.admin });

        if (j?.ok && j?.admin) {
          adlog("Gate pass -> ready", { mountId: mountIdRef.current, seq });
          setReady(true);
          return;
        }

        const to = `/admin/login?next=${encodeURIComponent(next)}`;
        adlog("Gate redirect (no admin) ->", { mountId: mountIdRef.current, seq, to });
        router.replace(to);
      } catch (e: any) {
        const to = `/admin/login?next=${encodeURIComponent(next)}`;
        adlog("Gate fetch exception -> redirect", {
          mountId: mountIdRef.current,
          seq,
          msg: String(e?.message || e),
          to,
        });
        router.replace(to);
      }
    })();
  }, [router, pathname, sp]);

  if (!ready) {
    return <div className="p-6 text-sm text-slate-500">Checking admin session...</div>;
  }
  return <>{children}</>;
}
