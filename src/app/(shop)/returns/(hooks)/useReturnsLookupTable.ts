"use client";

import { useEffect, useMemo, useState } from "react";
import type { MyOrderRow, ReturnsBootstrapResp, SortDir } from "../types";
import { cmpText, toTsFromCn } from "../utils";

export type ReturnsSortKey = "order" | "paidAt" | "amount";

type UseReturnsLookupTableParams = {
  pageSize?: number;
};

export function useReturnsLookupTable({
  pageSize = 10,
}: UseReturnsLookupTableParams = {}) {
  const [ordersPage, setOrdersPage] = useState(1);

  const [authed, setAuthed] = useState<boolean>(false);
  const [bootLoading, setBootLoading] = useState<boolean>(true);
  const [bootError, setBootError] = useState<string>("");

  const [myOrders, setMyOrders] = useState<MyOrderRow[]>([]);

  const [sortKey, setSortKey] = useState<ReturnsSortKey>("paidAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function goPage(nextPage: number) {
    setOrdersPage((p) => Math.max(1, Math.floor(nextPage || p)));
  }

  function toggleSort(nextKey: ReturnsSortKey) {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("desc");
    }
  }

  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        setBootLoading(true);
        setBootError("");

        const res = await fetch(`/api/returns/bootstrap`, {
          credentials: "include",
          cache: "no-store",
        });

        const data = (await res.json().catch(() => ({}))) as ReturnsBootstrapResp;

        if (!data?.ok) {
          if (!dead) {
            setAuthed(false);
            setMyOrders([]);
            setBootError(data?.error || "Failed to load your orders.");
          }
          return;
        }

        if (!dead) {
          setAuthed(!!data.authed);
          setMyOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      } catch (e: any) {
        if (!dead) {
          setAuthed(false);
          setMyOrders([]);
          setBootError(String(e?.message || e || "Failed to load your orders."));
        }
      } finally {
        if (!dead) setBootLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    const total = Array.isArray(myOrders) ? myOrders.length : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    setOrdersPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [myOrders, pageSize]);

  const sortedMyOrders = useMemo(() => {
    const arr = Array.isArray(myOrders) ? [...myOrders] : [];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      if (sortKey === "amount") {
        const av = Number(a.total_minor || 0);
        const bv = Number(b.total_minor || 0);
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      }

      if (sortKey === "paidAt") {
        const atSec =
          (typeof a.paid_at_ts === "number" ? a.paid_at_ts : null) ??
          (typeof a.created_at_ts === "number" ? a.created_at_ts : null);

        const btSec =
          (typeof b.paid_at_ts === "number" ? b.paid_at_ts : null) ??
          (typeof b.created_at_ts === "number" ? b.created_at_ts : null);

        const at =
          typeof atSec === "number"
            ? atSec * 1000
            : toTsFromCn(a.paid_at_cn || a.created_at_cn);
        const bt =
          typeof btSec === "number"
            ? btSec * 1000
            : toTsFromCn(b.paid_at_cn || b.created_at_cn);

        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }

      const ao = String(a.order_number || `#${a.id}`);
      const bo = String(b.order_number || `#${b.id}`);
      const c = cmpText(ao, bo);
      if (c === 0) return 0;
      return c > 0 ? dir : -dir;
    });

    return arr;
  }, [myOrders, sortKey, sortDir]);

  const ordersTotal = sortedMyOrders.length;
  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / pageSize));

  const pagedOrders = useMemo(() => {
    const start = (ordersPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedMyOrders.slice(start, end);
  }, [sortedMyOrders, ordersPage, pageSize]);

  const shouldLockListHeight = ordersTotal > pageSize;
  const showingFrom = ordersTotal === 0 ? 0 : (ordersPage - 1) * pageSize + 1;
  const showingTo = Math.min(ordersPage * pageSize, ordersTotal);

  return {
    authed,
    bootLoading,
    bootError,
    myOrders,
    sortKey,
    sortDir,
    ordersPage,
    sortedMyOrders,
    pagedOrders,
    ordersTotal,
    ordersTotalPages,
    shouldLockListHeight,
    showingFrom,
    showingTo,
    goPage,
    toggleSort,
  };
}