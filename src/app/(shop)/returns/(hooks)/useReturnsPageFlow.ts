"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useFormAlert } from "@/hooks/useFormAlert";

import { useReturnImages } from "./useReturnImages";
import { useReturnsLookupTable } from "./useReturnsLookupTable";

import type { OrderSummary } from "../types";
import { mapLookupError, mapReturnError } from "../utils";
import type {
  ReturnOrderDetail,
  SelectedReturnLine,
} from "../_components/ReturnItemsSelector";

import { lookupReturnOrder } from "../returns.lookup";
import { submitReturnRequest } from "../returns.submit";
import { loadReturnItemThumbs } from "../returns.thumbs";

export function useReturnsPageFlow() {
  const search = useSearchParams();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [orderNumber, setOrderNumber] = useState(search.get("order") || "");
  const [email, setEmail] = useState(search.get("email") || "");

  const {
    authed,
    bootLoading,
    bootError,
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
  } = useReturnsLookupTable({ pageSize: 10 });

  const [loading, setLoading] = useState(false);
  const lookupCooldownUntilRef = useRef<number>(0);
  const [cooldownNow, setCooldownNow] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() < lookupCooldownUntilRef.current) {
        setCooldownNow(Date.now());
      }
    }, 250);

    return () => clearInterval(id);
  }, []);

  const lookupCooldownLeftSec = Math.max(
    0,
    Math.floor((lookupCooldownUntilRef.current - cooldownNow) / 1000)
  );
  const isLookupCoolingDown = lookupCooldownLeftSec > 0;

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [foundOrder, setFoundOrder] = useState<ReturnOrderDetail | null>(null);
  const [thumbByItemId, setThumbByItemId] = useState<Record<number, string | null>>(
    {}
  );
  const [selectedLines, setSelectedLines] = useState<SelectedReturnLine[]>([]);
  const [reasonType, setReasonType] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

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

  const isDuplicateError = errorCode === "duplicate_return_request";
  const isAlreadyReturnedError = errorCode === "item_already_returned";

  useEffect(() => {
    if (isDuplicateError || isAlreadyReturnedError) {
      setErrorCode(null);
      clearAlert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLines, reasonType, reasonDetail]);

  useEffect(() => {
    clearAlert();
    setErrorCode(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    console.log("[returns] cleared alert because order/email changed");
  }, [orderNumber, email]);

  async function handleFindOrder(nextOrderNumber?: string, nextEmail?: string) {
    setErrorCode(null);
    clearAlert();

    const on = String(nextOrderNumber ?? orderNumber ?? "").trim();
    const em = String(nextEmail ?? email ?? "").trim().toLowerCase();

    if (!on || !em) {
      showError("Please enter both order number and email.");
      return;
    }

    if (loading) return;

    const now = Date.now();
    if (now < lookupCooldownUntilRef.current) {
      setCooldownNow(Date.now());
      return;
    }

    setOrderNumber(on);
    setEmail(em);

    try {
      setLoading(true);

      const result = await lookupReturnOrder({
        orderNumber: on,
        email: em,
      });

      if (!result.ok) {
        if (result.kind === "rate_limited") {
          lookupCooldownUntilRef.current = Date.now() + result.retryAfterSec * 1000;
          setCooldownNow(Date.now());
          clearAlert();
          setErrorCode(null);
          return;
        }

        if (result.serverMsg) {
          showError(result.serverMsg);
          return;
        }

        showError(
          result.code
            ? mapLookupError(result.code, result.retryAfterSec || undefined)
            : mapLookupError("no_match")
        );
        return;
      }

      setOrder(result.order);
      setFoundOrder(result.foundOrder);
      setSelectedLines([]);
      setThumbByItemId({});
      setReasonType("");
      setReasonDetail("");
      resetImages();

      try {
        const nextThumb = await loadReturnItemThumbs(result.foundOrder.items || []);
        setThumbByItemId(nextThumb);
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

      const result = await submitReturnRequest({
        orderNumberOrId: order.order_number || order.id,
        email,
        reasonType,
        reasonDetail,
        items: selectedItems,
      });

      if (!result.ok) {
        if (result.kind === "conflict") {
          setErrorCode(result.errorCode);
          showError(result.rawErrorCode || result.errorCode);
          return;
        }

        showError(result.errorCode || "Failed to submit return.");
        return;
      }

      setSubmitResult(result.data);

      const returnId = Number(result.data?.return?.id);
      if (images.length && Number.isFinite(returnId) && returnId > 0) {
        try {
          await uploadAttachments(returnId);
        } catch (e: any) {
          showError(
            `Return submitted, but image upload failed: ${String(e?.message || e)}`
          );
        }
      }

      setStep(3);
    } catch (e: any) {
      fromError(e);
    } finally {
      setSubmitting(false);
    }
  }

  function handleStartAnotherReturn() {
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
  }

  const showInlineBlock = isDuplicateError || isAlreadyReturnedError;

  const inlineTitle = isAlreadyReturnedError
    ? "Item already returned"
    : "Return request in review";

  const inlineVariant: "error" | "warning" = isAlreadyReturnedError
    ? "error"
    : "warning";

  const inlineMessage = alert?.message
    ? alert.message
    : mapReturnError(errorCode || "");

  return {
    step,

    orderNumber,
    setOrderNumber,
    email,
    setEmail,

    authed,
    bootLoading,
    bootError,
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

    loading,
    lookupCooldownLeftSec,
    isLookupCoolingDown,

    order,
    foundOrder,
    thumbByItemId,
    setSelectedLines,

    reasonType,
    setReasonType,
    reasonDetail,
    setReasonDetail,

    submitting,
    submitResult,

    alert,
    hasAlert,

    images,
    uploading,
    uploadResult,
    onPickImages,
    removeImage,

    showInlineBlock,
    inlineTitle,
    inlineVariant,
    inlineMessage,

    handleFindOrder,
    handleSubmitReturn,
    handleStartAnotherReturn,
  };
}