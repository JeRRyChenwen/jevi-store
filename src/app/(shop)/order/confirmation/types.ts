export type ServerOrder = {
  id: number;
  order_number?: string | null;
  currency?: string | null;

  items_total_minor?: number | null;
  delivery_fee_minor?: number | null;
  grand_total_minor?: number | null;
  discount_minor?: number | null;
  tax_minor?: number | null;

  total_minor?: number | null;

  shipping_address_json?: any;

  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  addr_line1?: string | null;
  addr_line2?: string | null;
  addr_city?: string | null;
  addr_state?: string | null;
  addr_postcode?: string | null;
  addr_country?: string | null;

  delivery_option?: string | null;

  items?: any[] | null;
};

export type ServerItem = {
  id?: number;

  product_title?: string | null;
  variant_title?: string | null;

  qty?: number;

  unit_price_minor?: number;
  line_total_minor?: number;

  product_sku?: string | null;

  snapshot?: any;

  image_url?: string | null;
};

export type ServerResp = {
  ok: boolean;
  order?: ServerOrder;
  items?: ServerItem[];
  [k: string]: any;
};