// src/app/(shop)/checkout/(hooks)/useCart.ts
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem as CartListItem } from "@/components/cart/CartList";
import { bag } from "@/components/bag/bag";

export type CartItem = CartListItem;

const LS_CART_KEY = "bag:v1";

/**
 * Checkout 的购物袋只读投影。
 *
 * 所有写操作统一通过 bag.ts 完成。
 * useCart 只负责：
 * - 读取当前购物袋快照；
 * - 订阅 bag.change；
 * - 处理跨标签页 storage 同步；
 * - 提供 Checkout 所需的派生状态。
 */
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const syncCart = useCallback((value?: unknown) => {
    const nextCart = Array.isArray(value)
      ? value
      : bag.get();

    setCart(
      Array.isArray(nextCart)
        ? (nextCart as CartItem[])
        : [],
    );
  }, []);

  useEffect(() => {
    syncCart(bag.get());
    setLoaded(true);

    const offChange = bag.on(
      "change",
      (list: unknown) => {
        syncCart(list);
      },
    );

    return () => {
      offChange();
    };
  }, [syncCart]);

  const itemsCount = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          Math.max(
            0,
            Math.floor(Number(item?.qty) || 0),
          ),
        0,
      ),
    [cart],
  );

  const hasItems = cart.length > 0;

  /**
   * 通常在订单完成后调用。
   *
   * 通过 bag.ts 清理，而不是直接修改 localStorage。
   * 订单完成后的内部清理不发送 remove_from_cart。
   */
  const clearCart = useCallback(() => {
    bag.clear();
  }, []);

  return {
    cart,
    itemsCount,
    hasItems,
    clearCart,
    loaded,
  };
}