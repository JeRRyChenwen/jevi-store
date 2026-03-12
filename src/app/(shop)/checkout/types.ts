// src/app/(shop)/checkout/types.ts

export type StepKey = "bag" | "address" | "delivery" | "payment";

export type DeliveryMethod = "standard" | "express";

export type ReserveAPIResp = {
  ok: boolean;
  reservation_id?: string;
  expires_at?: number; // worker 返回 UNIX 秒
  ttl_seconds?: number;
  error?: string;
  message?: string;
  detail?: any;
};

export type ReserveCache = {
  reservation_id: string;
  expires_at_sec: number; // UNIX 秒
  cart_hash: string;
  ts: number; // 写入时间 ms
};