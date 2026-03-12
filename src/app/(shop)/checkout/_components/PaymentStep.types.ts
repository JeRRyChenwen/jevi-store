// src/app/(shop)/checkout/_components/PaymentStep.types.ts

export type Address = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string; // ISO2: "AU"
};

export type DeliveryMethod = "standard" | "express";

export type PaymentStepProps = {
  visible: boolean;

  amountInMajorUnit: number; // legacy, 不当权威

  isPayProcessing: boolean;
  isLoggedIn: boolean;

  // ✅ 登录用户的账户邮箱
  accountEmail?: string;

  address: Address;

  deliveryMethod: DeliveryMethod;

  itemsCount: number;
  itemsMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  currency: string;

  onPayInitiated: () => void;
  onPaySucceeded: (payload?: any) => void;
  onBackToBag?: () => void; // let parent control step switch

  cart: Array<{
    price?: number; // major（折后价）
    qty?: number;
    currency?: string;
    [k: string]: any;
  }>;

  preReservationId?: string | null;
  preReservationExpiresAtSec?: number | null;
  preReservationCartHash?: string | null;
  preReserveLoading?: boolean;
  preReserveError?: string | null;
};