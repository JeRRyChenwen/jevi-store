// src/app/(shop)/returns/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { UserTime } from "@/components/datetime/Time";
import { useReturnImages } from "./(hooks)/useReturnImages";

// ✅ 复用你现有的 Strapi 工具
import { api } from "@/lib/strapi";

// ✅ 复用统一的 PageBack（你要的 Back）
import BackButton from "@/components/navigation/BackButton";

import ReturnItemsSelector, {
  type ReturnOrderDetail,
  type SelectedReturnLine,
} from "./_components/ReturnItemsSelector";
import ReturnsLookupStep from "./_components/ReturnsLookupStep";
import ReturnsSuccessCard from "./_components/ReturnsSuccessCard";
import ReturnsSubmissionCard from "./_components/ReturnsSubmissionCard";

// ✅ 统一提示：useFormAlert + Alert
import { useFormAlert } from "@/hooks/useFormAlert";
import { Alert } from "@/components/ui/alert";

import type {
  OrderSummary,
  MyOrderRow,
  ReturnsBootstrapResp,
  SortDir,
} from "./types";

import {
  firstImageUrlFromRel,
  fmtMoney,
  toTsFromCn,
  mapReturnError,
  mapLookupError,
  cmpText,
} from "./utils";

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

  // ✅ 统一提示：替代原来的 error + displayError useMemo
  const { alert, hasAlert, clear: clearAlert, error: showError, fromError } =
    useFormAlert({
      mapMessage: (raw) => mapReturnError(raw),
      defaultNetworkError: "Network or server error.",
    });

  const {
    images,
    uploading,
    uploadResult,
    onPickImages,
    removeImage,
    uploadAttachments,
    resetImages,
  } = useReturnImages({
    clearAlert,
    showError,
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
      resetImages();

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

  // Step 2: 提交退货（成功后：再上传图片）
  async function handleSubmitReturn() {
    setErrorCode(null);
    clearAlert();

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
        <ReturnsLookupStep
          bootLoading={bootLoading}
          authed={authed}
          bootError={bootError}
          sortedMyOrdersLength={sortedMyOrders.length}
          pagedOrders={pagedOrders}
          shouldLockListHeight={shouldLockListHeight}
          ordersTotal={ordersTotal}
          showingFrom={showingFrom}
          showingTo={showingTo}
          ordersPage={ordersPage}
          ordersTotalPages={ordersTotalPages}
          sortKey={sortKey}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          orderNumber={orderNumber}
          email={email}
          onOrderNumberChange={setOrderNumber}
          onEmailChange={setEmail}
          loading={loading}
          isLookupCoolingDown={isLookupCoolingDown}
          onGoPage={goPage}
          onFindOrder={handleFindOrder}
        />
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

          <ReturnsSubmissionCard
            images={images}
            submitting={submitting}
            uploading={uploading}
            uploadResult={uploadResult}
            reasonType={reasonType}
            reasonDetail={reasonDetail}
            onPickImages={onPickImages}
            onRemoveImage={removeImage}
            onReasonTypeChange={setReasonType}
            onReasonDetailChange={setReasonDetail}
            onSubmit={handleSubmitReturn}
            showInlineBlock={showInlineBlock}
            inlineTitle={inlineTitle}
            inlineVariant={inlineVariant}
            inlineMessage={inlineMessage}
          />
        </div>
      )}

      {step === 3 && submitResult && (
        <ReturnsSuccessCard
          submitResult={submitResult}
          uploadResult={uploadResult}
          onStartAnotherReturn={() => {
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
            resetImages();
          }}
        />
      )}
    </div>
  );
}