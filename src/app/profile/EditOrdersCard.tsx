// src/app/profile/EditOrdersCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type OrderRow = {
  id: number;
  order_number?: string | null;
  email: string | null;
  currency: string | null;
  total_minor: number;        // worker 返回字段别名：total_minor
  status: string | null;
  created_at: string | number | null; // 兼容“北京时间字符串”或早期的秒时间戳
  item_count: number;
};

type MyOrdersResp = {
  ok: boolean;
  email: string | null;
  orders: OrderRow[];
  worker_version?: string;
};

function fmtCurrency(minor: number, ccy: string | null) {
  const code = (ccy || "AUD").toUpperCase();
  const major = (minor || 0) / 100;
  // 为了稳定得到 “AUD 13.80” 的形态，数值与代码分开格式化再拼接
  const num = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
  return `${code} ${num}`;
}

function fmtDate(v: string | number | null) {
  if (v == null) return "";
  // 支持两种：1) "YYYY-MM-DD HH:mm:ss" 2) 秒时间戳
  if (typeof v === "number") {
    const d = new Date(v * 1000);
    return d.toLocaleString();
  }
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(v)) {
    // 直接显示北京时间字符串
    return v;
  }
  // 其它字符串尽力解析
  const d = new Date(v);
  return isNaN(+d) ? String(v) : d.toLocaleString();
}

export default function EditOrdersCard() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busySearch, setBusySearch] = useState(false);
  const [resultOne, setResultOne] = useState<OrderRow | null>(null);

  // 首次加载—我的订单
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch("/api/my/orders", {
          method: "GET",
          credentials: "include",
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(`/api/my/orders ${r.status}: ${t}`);
        }
        const data = (await r.json()) as MyOrdersResp;
        if (!dead) setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (e: any) {
        if (!dead) setErr(e?.message || String(e));
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, []);

  // 本地过滤（当不是纯数字检索时）
  const filtered = useMemo(() => {
    if (!orders) return [];
    const s = q.trim().toLowerCase();
    if (!s) return orders;
    if (/^\d+$/.test(s)) return orders; // 数字时交给“精确查询”按钮
    return orders.filter(o => {
      const num = (o.order_number || "").toLowerCase();
      const id = String(o.id);
      const st = (o.status || "").toLowerCase();
      return num.includes(s) || id.includes(s) || st.includes(s);
    });
  }, [orders, q]);

  async function doExactSearch() {
    setResultOne(null);
    setErr(null);

    const s = q.trim();
    if (!s) return;

    // 识别两类可精确查询的输入：
    // 1) 纯数字 ID： /^\d+$/
    // 2) 订单号（字母/数字/短横线组合）：/^[A-Za-z0-9-]{3,}$/
    const isNumericId = /^\d+$/.test(s);
    const isOrderNumber = /^[A-Za-z0-9-]{3,}$/.test(s) && !isNumericId;

    if (!(isNumericId || isOrderNumber)) {
      // 其它情况：清空精确结果，依赖下方“本地过滤”表格
      setResultOne(null);
      return;
    }

    try {
      setBusySearch(true);
      const endpoint = `/api/orders/${encodeURIComponent(s)}`;
      const r = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`${endpoint} ${r.status}: ${t}`);
      }
      const data = await r.json();
      // 后端返回结构：{ ok: true, order, items, payments, ... }
      if (data?.order) {
        const o = data.order as any;
        const shaped: OrderRow = {
          id: Number(o.id),
          order_number: o.order_number ?? null,
          email: o.email ?? null,
          currency: (o.currency ?? "AUD") as string,
          total_minor: Number(o.grand_total_minor ?? o.total_minor ?? 0) | 0,
          status: o.status ?? null,
          created_at: o.created_at ?? null,
          item_count: Array.isArray(data.items)
            ? data.items.reduce((acc: number, it: any) => acc + (Number(it?.qty ?? 0) | 0), 0)
            : 0,
        };
        setResultOne(shaped);
      } else {
        setResultOne(null);
        setErr("Not found");
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusySearch(false);
    }
  }

  return (
    <div className="px-4 pb-4">
      {/* 搜索行 */}
      <div className="flex items-center gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") doExactSearch(); }}
          placeholder="按订单号 / ID 过滤列表（本地过滤；点击 Search 进行精确查询）"
          className="h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
        />
        <button
          onClick={doExactSearch}
          disabled={busySearch}
          className="h-9 rounded-md border px-3 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {/* 错误提示 */}
      {err && (
        <div className="mb-3 text-sm text-red-600">{err}</div>
      )}

      {/* 加载中 */}
      {loading && (
        <div className="text-sm text-neutral-500">Loading orders…</div>
      )}

      {/* 精确单条结果（当输入纯数字并点击 Search 时） */}
      {resultOne && (
        <div className="mb-4 rounded-lg border p-3">
          <div className="text-sm mb-2 font-medium">精确匹配</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="py-2 pr-4">订单号 / ID</th>
                  <th className="py-2 pr-4">创建时间</th>
                  <th className="py-2 pr-4">金额</th>
                  <th className="py-2 pr-4">状态</th>
                  <th className="py-2 pr-4">件数</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="py-2 pr-4">
                    <div className="font-medium" title={`ID: ${resultOne.id}`}>
                      {resultOne.order_number || "-"}
                    </div>
                  </td>
                  <td className="py-2 pr-4">{fmtDate(resultOne.created_at)}</td>
                  <td className="py-2 pr-4">{fmtCurrency(resultOne.total_minor, resultOne.currency)}</td>
                  <td className="py-2 pr-4">{resultOne.status || "-"}</td>
                  <td className="py-2 pr-4">{resultOne.item_count}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 我的订单列表（本地过滤） */}
      {!loading && orders && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-2 pl-3 pr-4">订单号 / ID</th>
                <th className="py-2 pr-4">创建时间</th>
                <th className="py-2 pr-4">金额</th>
                <th className="py-2 pr-4">状态</th>
                <th className="py-2 pr-4">件数</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="py-6 pl-3 pr-4 text-neutral-500" colSpan={5}>
                    暂无订单。
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="py-2 pl-3 pr-4">
                      <div className="font-medium" title={`ID: ${o.id}`}>
                        {o.order_number || "-"}
                      </div>
                    </td>
                    <td className="py-2 pr-4">{fmtDate(o.created_at)}</td>
                    <td className="py-2 pr-4">{fmtCurrency(o.total_minor, o.currency)}</td>
                    <td className="py-2 pr-4">{o.status || "-"}</td>
                    <td className="py-2 pr-4">{o.item_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
