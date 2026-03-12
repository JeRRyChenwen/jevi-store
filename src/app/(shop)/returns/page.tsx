// src/app/(shop)/returns/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UserTime } from "@/components/datetime/Time";

// ✅ 复用你现有的 Strapi 工具
import { api } from "@/lib/strapi";

// ✅ 复用统一的 PageBack（你要的 Back）
import BackButton from "@/components/navigation/BackButton";

import ReturnItemsSelector, {
  type ReturnOrderDetail,
  type SelectedReturnLine,
} from "./_components/ReturnItemsSelector";

// ✅ 统一提示：useFormAlert + Alert
import { useFormAlert } from "@/hooks/useFormAlert";
import { Alert } from "@/components/ui/alert";

import type {
  OrderSummary,
  MyOrderRow,
  ReturnsBootstrapResp,
  SortDir,
  SelectedImg,
} from "./types";

import {
  firstImageUrlFromRel,
  fmtMoney,
  toTsFromCn,
  mapReturnError,
  mapLookupError,
  cmpText,
  isAllowedImage,
} from "./utils";

/** ✅ 与 admin 一致的排序 icon（文本 ↕ / ↑ / ↓） */
function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1 text-slate-500">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function ReturnsPage() {
  const search = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [orderNumber, setOrderNumber] = useState(search.get("order") || "");
  const [email, setEmail] = useState(search.get("email") || "");

  // ✅ NEW: 前端分页（因为 /api/returns/bootstrap 目前返回的是全量 orders，
  // 且 worker 并没有真的根据 page/page_size 做分页）
  const PAGE_SIZE = 10;
  const [ordersPage, setOrdersPage] = useState(1);

  function goPage(nextPage: number) {
    // ✅ 纯前端分页：不改 URL，不走 router.push
    setOrdersPage((p) => Math.max(1, Math.floor(nextPage || p)));
  }

  // ✅ 登录态引导（bootstrap）
  const [authed, setAuthed] = useState<boolean>(false);
  const [bootLoading, setBootLoading] = useState<boolean>(true);
  const [bootError, setBootError] = useState<string>("");

  const [myOrders, setMyOrders] = useState<MyOrderRow[]>([]);

  // ✅ NEW：表头排序（替代 FilterButton / DropdownMenu）
  type SortKey = "order" | "paidAt" | "amount";
  const [sortKey, setSortKey] = useState<SortKey>("paidAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc"); // 默认：Paid at 新到旧（desc）

  const [loading, setLoading] = useState(false);
  const lookupCooldownUntilRef = useRef<number>(0);

  // ✅ NEW: 用一个“当前时间”tick 驱动倒计时 UI 重新渲染
  const [cooldownNow, setCooldownNow] = useState<number>(Date.now());

  // ✅ NEW: 只要处于 cooldown，就每 250ms 刷新一次 UI（让秒数实时跳动）
  useEffect(() => {
    const id = setInterval(() => {
      // 仅在冷却期内才更新，避免无意义刷新
      if (Date.now() < lookupCooldownUntilRef.current) {
        setCooldownNow(Date.now());
      }
    }, 250);

    return () => clearInterval(id);
  }, []);

  // ✅ NEW: 计算还剩几秒
  // - 用 floor：能正常显示 0（不会卡在 1）
  // - 再用 isLookupCoolingDown 控制 banner：>0 才显示，到 0 自动消失
  const lookupCooldownLeftSec = Math.max(
    0,
    Math.floor((lookupCooldownUntilRef.current - cooldownNow) / 1000)
  );
  const isLookupCoolingDown = lookupCooldownLeftSec > 0;
  
  const [order, setOrder] = useState<OrderSummary | null>(null);

  // 查到的订单明细（带 items），用于 ReturnItemsSelector
  const [foundOrder, setFoundOrder] = useState<ReturnOrderDetail | null>(null);

  // ✅ itemId -> thumbnail url
  const [thumbByItemId, setThumbByItemId] = useState<Record<number, string | null>>(
    {}
  );

  // 用户选择退哪些商品、各退多少
  const [selectedLines, setSelectedLines] = useState<SelectedReturnLine[]>([]);

  const [reasonType, setReasonType] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // ✅ 用 code 表示“不可重复提交类”的错误（逻辑保持你原来那套）
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // ✅ 上传图片 state
  const [images, setImages] = useState<SelectedImg[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // ✅ 统一提示：替代原来的 error + displayError useMemo
  const { alert, hasAlert, clear: clearAlert, error: showError, fromError } =
    useFormAlert({
      mapMessage: (raw) => mapReturnError(raw),
      defaultNetworkError: "Network or server error.",
    });

  // ✅ 两类“不可重复”的错误
  const isDuplicateError = errorCode === "duplicate_return_request"; // pending 审核中（active）
  const isAlreadyReturnedError = errorCode === "item_already_returned"; // 曾经 approved（永久禁止）

  // ✅ 若用户调整了选择或原因，则清掉“提示”，避免提示卡住造成误解
  useEffect(() => {
    if (isDuplicateError || isAlreadyReturnedError) {
      setErrorCode(null);
      clearAlert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLines, reasonType, reasonDetail]);

  // ✅ NEW：当用户修改 orderNumber / email 时，清掉上一次 lookup 产生的提示（比如 rate_limited）
  // 否则你会看到旧的 “Too many attempts...” 一直残留，看起来像“没变化”
  useEffect(() => {
    clearAlert();
    setErrorCode(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    console.log("[returns] cleared alert because order/email changed");
  }, [orderNumber, email]);

  // ✅ NEW: bootstrap 只需要拉一次（当前 /api/returns/bootstrap 实际返回全量 orders）
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

  // ✅ NEW: 当订单数量变化时，修正当前页（避免越界）
  // 注意：这里用 myOrders.length 即可，因为 sortedMyOrders 是由 myOrders 派生
  useEffect(() => {
    const total = Array.isArray(myOrders) ? myOrders.length : 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    setOrdersPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [myOrders, PAGE_SIZE]);

  // ✅ NEW：点击表头切换排序（与 admin 一致：切列默认 desc）
  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("desc");
    }
  }

  const headerBtn = "inline-flex items-center select-none hover:text-slate-900";

  // ✅ myOrders -> 排序后的数组（按表头逻辑）
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
      // ✅ 优先 epoch 秒（更准、更快、更统一）
      const atSec =
        (typeof a.paid_at_ts === "number" ? a.paid_at_ts : null) ??
        (typeof a.created_at_ts === "number" ? a.created_at_ts : null);

      const btSec =
        (typeof b.paid_at_ts === "number" ? b.paid_at_ts : null) ??
        (typeof b.created_at_ts === "number" ? b.created_at_ts : null);

      // 转成毫秒用于比较；没有 ts 就用旧 cn 兜底
      const at =
        typeof atSec === "number" ? atSec * 1000 : toTsFromCn(a.paid_at_cn || a.created_at_cn);
      const bt =
        typeof btSec === "number" ? btSec * 1000 : toTsFromCn(b.paid_at_cn || b.created_at_cn);

      if (at === bt) return 0;
      return at > bt ? dir : -dir;
    }

      // sortKey === "order"
      const ao = String(a.order_number || `#${a.id}`);
      const bo = String(b.order_number || `#${b.id}`);
      const c = cmpText(ao, bo);
      if (c === 0) return 0;
      return c > 0 ? dir : -dir;
    });

    return arr;
  }, [myOrders, sortKey, sortDir]);


  // ✅ NEW: 前端分页切片（基于排序后的数组）
  const ordersTotal = sortedMyOrders.length;
  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / PAGE_SIZE));

  const pagedOrders = useMemo(() => {
    const start = (ordersPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return sortedMyOrders.slice(start, end);
  }, [sortedMyOrders, ordersPage, PAGE_SIZE]);

  // ✅ 最终规则：
  // - 总订单数 <= 10（只有 1 页）时：自适应高度
  // - 总订单数 > 10（已经进入“满页 + 后续页”场景）时：
  //   从第一页开始把整个列表高度锁定，后续所有页保持一致
  const shouldLockListHeight = ordersTotal > PAGE_SIZE;

  const showingFrom = ordersTotal === 0 ? 0 : (ordersPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(ordersPage * PAGE_SIZE, ordersTotal);

  // ✅ 上传：选择图片
  function onPickImages(e: ChangeEvent<HTMLInputElement>) {
    clearAlert();

    const files = Array.from(e.target.files || []);
    // 允许重复选择同一张图：重置 input
    e.target.value = "";

    if (!files.length) return;

    const MAX_FILES = 6;
    const MAX_EACH_BYTES = 5 * 1024 * 1024; // 5MB
    const current = images.length;

    const accepted: SelectedImg[] = [];
    for (const f of files) {
      if (!isAllowedImage(f)) {
        showError("Only image files are allowed: png/jpg/webp/gif.");
        continue;
      }
      if ((f.size || 0) <= 0) {
        showError("Empty file is not allowed.");
        continue;
      }
      if ((f.size || 0) > MAX_EACH_BYTES) {
        showError("Each image must be <= 5MB.");
        continue;
      }
      if (current + accepted.length >= MAX_FILES) {
        showError(`You can upload up to ${MAX_FILES} images.`);
        break;
      }

      const previewUrl = URL.createObjectURL(f);
      accepted.push({
        id: crypto.randomUUID(),
        file: f,
        previewUrl,
      });
    }

    if (accepted.length) {
      setImages((prev) => [...prev, ...accepted]);
    }
  }

  // ✅ 上传：移除图片
  function removeImage(id: string) {
    setImages((prev) => {
      const hit = prev.find((x) => x.id === id);
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  // ✅ step 切换/重置时：回收 objectURL，避免内存泄漏
  useEffect(() => {
    return () => {
      for (const img of images) {
        try {
          URL.revokeObjectURL(img.previewUrl);
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1: 根据 orderNumber + email 查询订单
  async function handleFindOrder(nextOrderNumber?: string, nextEmail?: string) {
    setErrorCode(null);
    clearAlert();

    const on = String(nextOrderNumber ?? orderNumber ?? "").trim();
    const em = String(nextEmail ?? email ?? "").trim().toLowerCase();

    if (!on || !em) {
      showError("Please enter both order number and email.");
      return;
    }

    // ✅ NEW: 正在请求中就忽略（避免重复触发）
    if (loading) return;

    // ✅ NEW: 冷却期内禁止重复 lookup（避免打到 worker rate limit）
    const now = Date.now();
    if (now < lookupCooldownUntilRef.current) {
      // 触发 UI 刷新（让顶部倒计时立刻显示）
      setCooldownNow(Date.now());
      return;
    }

    // 同步回 state（确保后续 submit 用到一致的 email/orderNumber）
    setOrderNumber(on);
    setEmail(em);

    try {
      setLoading(true);

      const res = await fetch(
        `/api/returns/lookup?order_number=${encodeURIComponent(on)}&email=${encodeURIComponent(
          em
        )}`,
        { credentials: "include", cache: "no-store" }
      );

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data.ok) {
        const code = String(data?.error || "").trim();
        const serverMsg = typeof data?.message === "string" ? data.message.trim() : "";

        // ✅ NEW: retry-after 优先从 body，其次从 header（有些实现只写 header）
        const retryAfterFromBody = Number(data?.retry_after_sec ?? 0);
        const retryAfterHeader = res.headers.get("retry-after");
        const retryAfterFromHeader = retryAfterHeader ? Number(retryAfterHeader) : 0;

        const retryAfterSec =
          (Number.isFinite(retryAfterFromBody) && retryAfterFromBody > 0
            ? retryAfterFromBody
            : 0) ||
          (Number.isFinite(retryAfterFromHeader) && retryAfterFromHeader > 0
            ? retryAfterFromHeader
            : 0);

        console.warn("[returns][lookup] failed", {
          status: res.status,
          code,
          serverMsg,
          retryAfterSec,
          upstream_status: data?.upstream_status,
          upstream_error: data?.upstream_error,
        });

        // ✅ NEW: 设置前端冷却
        // - 429 / rate_limited：用 retryAfterSec（没有就默认 10s）
        // - 404 not_found：也给一个短冷却 2s，防止用户疯狂连点
        const lc = code.toLowerCase();
        const isRateLimited =
          res.status === 429 || lc === "rate_limited" || lc === "too_many_requests";

        if (isRateLimited) {
          const cool = retryAfterSec > 0 ? retryAfterSec : 60; // ✅ 你后端是 60s，这里默认也对齐
          lookupCooldownUntilRef.current = Date.now() + cool * 1000;
          setCooldownNow(Date.now());

          // ✅ 进入冷却期：保证界面只显示黄条（不残留任何红条）
          clearAlert();
          setErrorCode(null);

          return;
        }

        // ✅ 关键：优先展示后端已经拼好的 message（最准确）
        if (serverMsg) {
          showError(serverMsg);
          return;
        }

        // ✅ 其次：前端映射（会安全地把 not_found 映射成人话）
        showError(code ? mapLookupError(code, retryAfterSec || undefined) : mapLookupError("no_match"));
        return;
      }

      setOrder(data.order);

      const nextFoundOrder: ReturnOrderDetail = {
        ...(data.order || {}),
        items: data.items || [],
      };
      setFoundOrder(nextFoundOrder);

      setSelectedLines([]);

      setThumbByItemId({});

      // ✅ 每次进入 Step 2：清空原因 & 图片
      setReasonType("");
      setReasonDetail("");
      setUploadResult(null);
      setUploading(false);
      // 回收旧预览
      setImages((prev) => {
        prev.forEach((x) => {
          try {
            URL.revokeObjectURL(x.previewUrl);
          } catch {}
        });
        return [];
      });

      // ✅ 批量拉图（方案B）：用 product_title 去 Strapi 查 Product.title
      try {
        const items = Array.isArray(nextFoundOrder.items) ? nextFoundOrder.items : [];

        const titles = Array.from(
          new Set(
            items
              .map((it: any) => String(it?.product_title || "").trim())
              .filter((s: string) => !!s)
          )
        );

        if (titles.length > 0) {
          const p = new URLSearchParams();
          titles.forEach((t, i) => {
            p.append(`filters[$or][${i}][title][$eqi]`, t);
          });

          p.append("fields[0]", "title");
          p.append("fields[1]", "slug");
          p.append("publicationState", "live");
          p.append("populate[color_galleries][populate][images]", "true");

          const qs = `/api/products?${p.toString()}`;

          const strapiRes: any = await api(qs, { noCache: true });
          const products: any[] = strapiRes?.data ?? [];

          const productIndex: Record<
            string,
            { def: string | null; colors: Record<string, string> }
          > = {};

          for (const row of products) {
            const attrs = row?.attributes ?? row;
            const title = String(attrs?.title ?? "").trim();
            if (!title) continue;

            const galleries = Array.isArray(attrs?.color_galleries)
              ? attrs.color_galleries
              : Array.isArray(attrs?.color_gallery)
              ? attrs.color_gallery
              : [];

            const colors: Record<string, string> = {};
            let def: string | null = null;

            for (const g of galleries) {
              const c = String(g?.color ?? "").trim().toLowerCase();
              const u = firstImageUrlFromRel(g?.images as any);

              if (!def && u) def = u;
              if (c && u) colors[c] = u;
            }

            if (!def) {
              for (const g of galleries) {
                const u = firstImageUrlFromRel(g?.images as any);
                if (u) {
                  def = u;
                  break;
                }
              }
            }

            productIndex[title.toLowerCase()] = { def, colors };
          }

          const nextThumb: Record<number, string | null> = {};
          for (const it of items as any[]) {
            const itemId = Number(it?.id);
            if (!Number.isFinite(itemId) || itemId <= 0) continue;

            const t = String(it?.product_title || "").trim().toLowerCase();
            const idx = t ? productIndex[t] : null;

            const rawVariant = String(it?.variant_title ?? "");
            const color = rawVariant.split("/")[0]?.trim().toLowerCase();

            nextThumb[itemId] =
              color && idx?.colors?.[color] ? idx.colors[color] : idx?.def ?? null;
          }

          setThumbByItemId(nextThumb);
        }
      } catch (e) {
        console.error("[returns] fetch strapi thumbs failed:", e);
      }

      setStep(2);
    } catch (e: any) {
      fromError(e);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAttachments(returnId: number) {
    if (!images.length) return null;

    const fd = new FormData();
    // ✅ 关键：字段名必须是 files（对应 worker: form.getAll("files")）
    for (const img of images) {
      fd.append("files", img.file);
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const res = await fetch(`/api/returns/${returnId}/attachments`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.ok) {
        throw new Error(String(data?.error || "upload_failed"));
      }

      setUploadResult(data);
      return data;
    } finally {
      setUploading(false);
    }
  }

  // Step 2: 提交退货（成功后：再上传图片）
  async function handleSubmitReturn() {
    setErrorCode(null);
    clearAlert();
    setUploadResult(null);

    if (!order) {
      showError("No order loaded.");
      return;
    }

    const lines = selectedLines.filter((l) => l.qty > 0);
    if (!lines.length) {
      showError("Please choose at least one item to return.");
      return;
    }
    if (!reasonType.trim()) {
      showError("Please choose a return reason.");
      return;
    }

    const selectedItems = lines.map((l) => ({
      order_item_id: l.item_id,
      qty: l.qty,
    }));

    try {
      setSubmitting(true);

      const res = await fetch("/api/returns", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order_number: order.order_number || order.id,
          reason_type: reasonType,
          reason_detail: reasonDetail,
          items: selectedItems,
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data.ok) {
        const errCode = String(data?.error || "");

        if (res.status === 409) {
          if (errCode === "item_already_returned") {
            setErrorCode("item_already_returned");
          } else {
            setErrorCode("duplicate_return_request");
          }
          showError(errCode || "duplicate_return_request");
          return;
        }

        if (errCode) showError(errCode);
        else showError("Failed to submit return.");
        return;
      }

      // ✅ 先进入成功态
      setSubmitResult(data);

      // ✅ 拿 returnId（你后端返回通常是 data.return.id）
      const returnId = Number(data?.return?.id);
      if (images.length && Number.isFinite(returnId) && returnId > 0) {
        try {
          await uploadAttachments(returnId);
        } catch (e: any) {
          // 图片上传失败：不阻止 return 成功，但要提示
          showError(`Return submitted, but image upload failed: ${String(e?.message || e)}`);
        }
      }

      setStep(3);
    } catch (e: any) {
      fromError(e);
    } finally {
      setSubmitting(false);
    }
  }

  const showInlineBlock = isDuplicateError || isAlreadyReturnedError;

  const inlineTitle = isAlreadyReturnedError
    ? "Item already returned"
    : "Return request in review";

  const inlineVariant = isAlreadyReturnedError ? "error" : "warning";

  const inlineMessage = alert?.message ? alert.message : mapReturnError(errorCode || "");

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="text-sm text-slate-500">
        <BackButton variant="link" fallbackHref="/" fallbackLabel="Shopping" />
      </div>

      <h1 className="text-2xl font-semibold mb-4">Returns &amp; Exchanges</h1>

      {/* ✅ NEW: Lookup 冷却倒计时（不依赖 hasAlert） */}
      {step === 1 && isLookupCoolingDown && !showInlineBlock && (
        <div className="mb-4">
          <Alert variant="error">
            {`Too many attempts. Please wait ${lookupCooldownLeftSec} ${
              lookupCooldownLeftSec === 1 ? "second" : "seconds"
            } and try again.`}
          </Alert>
        </div>
      )}

      {/* ✅ 顶部统一提示：冷却期由上面的 cooldown banner 接管，避免红黄叠加 */}
      {hasAlert && !showInlineBlock && !isLookupCoolingDown && alert?.message && (
        <div className="mb-4">
          <Alert variant={alert.type}>{alert.message}</Alert>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {bootLoading ? (
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Loading your orders…</div>
            </Card>
          ) : authed ? (
            <Card className="p-4 space-y-6">
              {/* ===== 登录态：订单列表 ===== */}
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Your orders</div>
                  <div className="text-xs text-muted-foreground">
                    Select an order to start a return.
                  </div>
                </div>

                {bootError && <div className="text-sm text-red-600">{bootError}</div>}

                {sortedMyOrders.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No orders found.</div>
                ) : (
                  <div
                    className={[
                      "flex flex-col gap-3 transition-[min-height] duration-200",
                      shouldLockListHeight
                        ? "min-h-[590px]"
                        : "h-auto min-h-[220px]",
                    ].join(" ")}
                  >
                    {/* ✅ 最终规则：
                        - 总订单数 <= 10（只有 1 页）时：自适应高度
                        - 总订单数 > 10（进入“满页 + 后续页”场景）时：
                          只保留一个较稳的最小高度，避免全屏时裁掉第 10 条，
                          但不要强行把表格容器本身拉伸到占满剩余空间。 */}

                    {/* ✅ 表格容器：始终按内容自然高度显示，避免底部出现大块空白 */}
                    <div className="overflow-hidden rounded-lg border bg-white">
                      <div className="h-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="sticky top-0 z-10 border-b bg-slate-50 text-xs text-slate-600">
                            <tr>
                              <th className="py-2 pl-3 pr-4">
                                <button
                                  type="button"
                                  className={headerBtn}
                                  onClick={() => toggleSort("order")}
                                  title="Sort by Order"
                                >
                                  Order number
                                  <SortIcon dir={sortKey === "order" ? sortDir : null} />
                                </button>
                              </th>

                              <th className="py-2 pr-4">
                                <button
                                  type="button"
                                  className={headerBtn}
                                  onClick={() => toggleSort("paidAt")}
                                  title="Sort by Paid at"
                                >
                                  Paid at
                                  <SortIcon dir={sortKey === "paidAt" ? sortDir : null} />
                                </button>
                              </th>

                              <th className="py-2 pr-4">
                                <button
                                  type="button"
                                  className={headerBtn}
                                  onClick={() => toggleSort("amount")}
                                  title="Sort by Amount"
                                >
                                  Amount
                                  <SortIcon dir={sortKey === "amount" ? sortDir : null} />
                                </button>
                              </th>

                              <th className="py-2 pr-4">Status</th>
                              <th className="py-2 pr-3"></th>
                            </tr>
                          </thead>

                          <tbody>
                            {pagedOrders.map((o) => (
                              <tr key={o.id} className="border-t">
                                <td className="py-2 pl-3 pr-4 font-medium">
                                  {o.order_number || `#${o.id}`}
                                  <div className="text-xs text-muted-foreground">
                                    Items: {o.item_count}
                                  </div>
                                </td>
                                <td className="py-2 pr-4">
                                  {/* ✅ 用户侧：优先 epoch 秒 → 浏览器本地时间 */}
                                  {typeof o.paid_at_ts === "number" ||
                                  typeof o.created_at_ts === "number" ? (
                                    <UserTime
                                      ts={(o.paid_at_ts ?? o.created_at_ts) ?? null}
                                      fallback="-"
                                    />
                                  ) : (
                                    // ✅ 兜底：如果后端暂时没给 *_ts，就先显示旧的 cn 字符串（以后可以删）
                                    o.paid_at_cn || o.created_at_cn || "-"
                                  )}
                                </td>
                                <td className="py-2 pr-4">
                                  {fmtMoney(o.total_minor, o.currency)}
                                </td>
                                <td className="py-2 pr-4 text-muted-foreground">
                                  {o.status || "-"}
                                </td>
                                <td className="py-2 pr-3 text-right">
                                  <Button
                                    variant="outline"
                                    className="px-4"
                                    disabled={
                                      loading ||
                                      isLookupCoolingDown ||
                                      !o.order_number ||
                                      !o.email
                                    }
                                    onClick={() =>
                                      handleFindOrder(
                                        String(o.order_number || ""),
                                        String(o.email || "")
                                      )
                                    }
                                  >
                                    {loading ? "Loading…" : "Start Return"}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* ✅ 分页：永远贴底 */}
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {ordersTotal > 0 ? (
                          <>
                            Showing <span className="font-medium">{showingFrom}</span>
                            {"–"}
                            <span className="font-medium">{showingTo}</span> of{" "}
                            <span className="font-medium">{ordersTotal}</span>
                          </>
                        ) : (
                          <>Showing 0</>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-9 px-0 rounded-lg"
                          disabled={bootLoading || ordersPage <= 1}
                          onClick={() => goPage(ordersPage - 1)}
                          aria-label="Previous page"
                          title="Previous"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-2">
                          {(() => {
                            const totalPages = Math.max(1, Number(ordersTotalPages || 1));
                            const cur = Math.max(1, Math.min(ordersPage, totalPages));

                            const pages: Array<number | "ellipsis"> = [];
                            if (totalPages <= 5) {
                              for (let i = 1; i <= totalPages; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              const start = Math.max(2, cur - 1);
                              const end = Math.min(totalPages - 1, cur + 1);

                              if (start > 2) pages.push("ellipsis");
                              for (let i = start; i <= end; i++) pages.push(i);
                              if (end < totalPages - 1) pages.push("ellipsis");

                              pages.push(totalPages);
                            }

                            return pages.map((p, idx) => {
                              if (p === "ellipsis") {
                                return (
                                  <span
                                    key={`e-${idx}`}
                                    className="px-1 text-sm text-muted-foreground select-none"
                                  >
                                    …
                                  </span>
                                );
                              }

                              const isActive = p === cur;

                              const base = "h-9 w-9 px-0 rounded-lg border";
                              const active =
                                "bg-slate-100 border-slate-400 text-slate-900 pointer-events-none";
                              const idle =
                                "bg-white border-slate-200 text-slate-900 hover:bg-slate-50";

                              return (
                                <button
                                  key={p}
                                  type="button"
                                  className={[base, isActive ? active : idle].join(" ")}
                                  onClick={() => goPage(p)}
                                  aria-current={isActive ? "page" : undefined}
                                  aria-label={`Page ${p}`}
                                  title={`Page ${p}`}
                                  disabled={bootLoading}
                                >
                                  {p}
                                </button>
                              );
                            });
                          })()}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-9 px-0 rounded-lg"
                          disabled={bootLoading || ordersPage >= (ordersTotalPages || 1)}
                          onClick={() => goPage(ordersPage + 1)}
                          aria-label="Next page"
                          title="Next"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ===== 查单输入 ===== */}
              <div className="border-t pt-6 space-y-4">
                <div>
                  <div className="text-sm font-medium">Find an order by order number and email</div>
                  <div className="text-xs text-muted-foreground">
                    Use this if you want to start a return for a different email/order.
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Order number</label>
                  <Input
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. SP20251201-000123"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email used for this order</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                  />
                </div>

                <Button
                  variant="outline"
                  className="px-6"
                  onClick={() => handleFindOrder()}
                  disabled={loading || isLookupCoolingDown}
                >
                  {loading ? "Finding your order..." : "Find my order"}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Please enter your order number and email to start a return.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Order number</label>
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. SP20251201-000123"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email used for this order</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <Button
                variant="outline"
                className="px-6"
                onClick={() => handleFindOrder()}
                disabled={loading || isLookupCoolingDown}
              >
                {loading ? "Finding your order..." : "Find my order"}
              </Button>

            </Card>
          )}
        </div>
      )}

      {step === 2 && order && (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-medium">Order {order.order_number ?? order.id}</div>
                <div className="text-muted-foreground">
                  Placed at:{" "}
                  {"created_at_ts" in (order as any) && typeof (order as any).created_at_ts === "number" ? (
                    <UserTime ts={(order as any).created_at_ts} fallback="N/A" />
                  ) : (
                    (order.created_at_cn || "N/A")
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">Status: {order.status}</div>
            </div>
          </Card>

          {foundOrder && (
            <ReturnItemsSelector
              order={foundOrder}
              onSelectionChange={setSelectedLines}
              thumbByItemId={thumbByItemId}
            />
          )}

          {/* ✅ NEW: 上传图片（可选） */}
          <Card className="p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold">Upload images (optional)</div>
              <div className="text-xs text-muted-foreground">
                Add up to 6 photos (png/jpg/webp/gif). Each image up to 5MB.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="px-4"
                onClick={() => document.getElementById("return-upload-input")?.click()}
                disabled={submitting || uploading}
              >
                Add photos
              </Button>

              <input
                id="return-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={onPickImages}
              />

              {images.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Selected: {images.length} / 6
                </div>
              )}
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.previewUrl}
                      alt={img.file.name}
                      className="w-full h-24 object-cover"
                    />

                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-white/90 border border-neutral-200 px-2 py-1 text-xs"
                      onClick={() => removeImage(img.id)}
                      disabled={submitting || uploading}
                      title="Remove"
                    >
                      ✕
                    </button>

                    <div className="px-2 py-1 text-[10px] text-neutral-600 truncate">
                      {img.file.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Return reason</h2>
            <div className="space-y-2">
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={reasonType}
                onChange={(e) => setReasonType(e.target.value)}
                disabled={submitting || uploading}
              >
                <option value="">Select a reason</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="wrong_item">Received wrong item</option>
                <option value="faulty">Faulty / damaged</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Details (optional)</label>
              <textarea
                rows={4}
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="Tell us more..."
                value={reasonDetail}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReasonDetail(e.target.value)}
                disabled={submitting || uploading}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                className="px-6"
                onClick={handleSubmitReturn}
                disabled={submitting || uploading}
              >
                {submitting
                  ? "Submitting..."
                  : uploading
                  ? "Uploading images..."
                  : "Submit return request"}
              </Button>
            </div>

            {showInlineBlock && (
              <div className="mt-6">
                <Alert variant={inlineVariant}>
                  <div className="font-semibold">{inlineTitle}</div>
                  <div className="mt-1 text-xs leading-relaxed">{inlineMessage}</div>
                </Alert>
              </div>
            )}
          </Card>
        </div>
      )}

      {step === 3 && submitResult && (
        <Card className="p-4 space-y-3 mt-4">
          <h2 className="text-lg font-semibold">Return request submitted 🎉</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ve received your return request. You&apos;ll receive an email once it&apos;s reviewed.
          </p>

          <div className="text-sm">
            <div>
              Return ID:{" "}
              <span className="font-mono">
                {submitResult.return?.return_number ?? submitResult.return?.id}
              </span>
            </div>
            <div>
              Status: <span>{submitResult.return?.status || "pending"}</span>
            </div>
            <div>Created at: {submitResult.return?.created_at_cn || "N/A"}</div>
          </div>

          {/* ✅ 图片上传结果（可选展示） */}
          {uploadResult?.ok && (
            <div className="text-xs text-muted-foreground">
              Uploaded images: {uploadResult.count || 0}
            </div>
          )}

          <Button
            variant="outline"
            className="px-6"
            onClick={() => {
              setStep(1);
              setOrder(null);
              setFoundOrder(null);
              setSelectedLines([]);
              setSubmitResult(null);
              setThumbByItemId({});
              setReasonType("");
              setReasonDetail("");
              setErrorCode(null);
              clearAlert();

              // reset images
              setImages((prev) => {
                prev.forEach((x) => {
                  try {
                    URL.revokeObjectURL(x.previewUrl);
                  } catch {}
                });
                return [];
              });
              setUploadResult(null);
              setUploading(false);
            }}
          >
            Start another return
          </Button>
        </Card>
      )}
    </div>
  );
}