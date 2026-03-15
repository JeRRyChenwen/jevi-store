// src/app/profile/edit-address-card.types.ts

export type Address = {
  first_name: string;
  last_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  is_default?: boolean | number | null;
};

export type AddressesResp = {
  ok: boolean;
  addresses?: {
    delivery?: any | null;
    billing?: any | null;
  };
  delivery?: any | null;
  billing?: any | null;
  worker_version?: string;
};

export type FieldErrors = Partial<Record<keyof Address, string>>;