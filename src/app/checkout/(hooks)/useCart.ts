// src/app/checkout/(hooks)/useCart.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CartItem as CartListItem } from "@/components/cart/CartList";

export type CartItem = CartListItem;

// 只在 hook 内部用，不再暴露给 page.tsx
const LS_CART_KEY = "bag:v1";

/**
 * 负责：
 * - 从 localStorage 读取购物车
 * - 在购物车变动时写回 localStorage
 * - 广播 bag:count / bag:updated 事件
 * - 提供 itemsCount / hasItems / clearCart 等便捷方法
 */
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 初始化：从 localStorage 读购物车
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch {
      // 忽略解析错误
    } finally {
      setLoaded(true);
    }
  }, []);

  // 购物车变动时：写回 localStorage + 广播事件
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_CART_KEY, JSON.stringify(cart));
      const count = cart.reduce(
        (acc, it: any) => acc + (Number(it?.qty) || 0),
        0
      );
      window.dispatchEvent(new CustomEvent("bag:count", { detail: { count } }));
      window.dispatchEvent(new CustomEvent("bag:updated", { detail: {} }));
    } catch {
      // 忽略
    }
  }, [cart, loaded]);

  // 购物车总数量
  const itemsCount = useMemo(
    () => cart.reduce((n, it: any) => n + (it?.qty ?? 1), 0),
    [cart]
  );

  const hasItems = cart.length > 0;

  // 清空购物车（包含 localStorage & 事件）
  const clearCart = useCallback(() => {
    try {
      localStorage.setItem(LS_CART_KEY, JSON.stringify([]));
      window.dispatchEvent(
        new CustomEvent("bag:count", { detail: { count: 0 } })
      );
      window.dispatchEvent(new CustomEvent("bag:updated", { detail: {} }));
    } catch {
      // 忽略
    }
    setCart([]);
  }, []);

  return {
    cart,
    setCart,
    itemsCount,
    hasItems,
    clearCart,
    loaded, // 暂时也暴露出去，如果你后面想在 UI 里用到“加载完成”的状态也可以
  };
}
