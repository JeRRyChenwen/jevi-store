// src/app/(shop)/checkout/_components/address-step.types.ts

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
  country?: string; // ISO code, e.g. "AU"
};

export type AddressErr = {
  firstName: boolean;
  lastName: boolean;
  phone: boolean;
  line1: boolean;
  city: boolean;
  state: boolean;
  postcode: boolean;
  country: boolean;
  email: boolean;
};

export type SaveMsg = { kind: "error" | "success"; text: string } | null;

export type AddressStepProps = {
  isLoggedIn: boolean;

  accountEmail: string;

  address: Address;
  setAddress: (a: Address) => void;

  billingAddress: Address;
  setBillingAddress: (a: Address) => void;

  sameAsDelivery: boolean;
  setSameAsDelivery: (v: boolean) => void;

  hasSavedDelivery: boolean;
  hasSavedBilling: boolean;
  savedDeliveryAddr: Address | null;
  savedBillingAddr: Address | null;
  useSavedDelivery: boolean;
  setUseSavedDelivery: (v: boolean) => void;
  useSavedBilling: boolean;
  setUseSavedBilling: (v: boolean) => void;

  addressShowErrors: boolean;
  addressErrs: AddressErr;
  billingErrs: AddressErr;
  handleBillingFieldChange: (k: keyof Address, v: string) => void;

  clearAddressErrors: () => void;
  clearBillingErrors: () => void;

  saveMsg: SaveMsg;
  onSaveDefault: () => void;

  marketingOptIn: boolean;
  setMarketingOptIn: (v: boolean) => void;
  sendSubscriptionIfNeeded: (emailRaw?: string) => void | Promise<void>;
};