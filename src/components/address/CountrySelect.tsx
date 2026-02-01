// src/components/address/CountrySelect.tsx
"use client";

import * as React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";

import { COUNTRY_OPTIONS, type CountryCode, isCountryCode } from "@/lib/country";

type Props = {
  id?: string;
  name?: string;

  /** 你的 Address 里现在是 string，所以这里接受 string */
  value?: string | null;

  /**
   * 对外统一吐 ISO code（AU/NZ/US...）
   * ✅ 兼容两种写法：onChange / onValueChange（二选一即可）
   */
  onChange?: (code: CountryCode) => void;
  onValueChange?: (code: CountryCode) => void;

  disabled?: boolean;
  invalid?: boolean;

  placeholder?: string;

  /** 供 AddressStep 的 InlineError 绑定 aria-describedby */
  describedById?: string;

  /** 允许外部传样式（你现在 profile 就在用） */
  className?: string;
};

function normalizeValue(v?: string | null): CountryCode | "" {
  const s = String(v ?? "").trim().toUpperCase();
  return isCountryCode(s) ? (s as CountryCode) : "";
}

export default function CountrySelect({
  id,
  name,
  value,
  onChange,
  onValueChange,
  disabled,
  invalid,
  placeholder = "Select a country",
  describedById,
  className,
}: Props) {
  const v = normalizeValue(value);

  const emit = React.useCallback(
    (code: CountryCode) => {
      // 优先使用 onValueChange（更贴 shadcn 命名），否则 fallback 到 onChange
      (onValueChange ?? onChange)?.(code);
    },
    [onChange, onValueChange]
  );

  return (
    <Select
      value={v}
      onValueChange={(next) => {
        const s = String(next).trim().toUpperCase();
        if (isCountryCode(s)) emit(s as CountryCode);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        name={name}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedById}
        className={[
          "w-full",
          invalid ? "border-red-500 focus:ring-red-500/20" : "",
          className ?? "",
        ].join(" ")}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {COUNTRY_OPTIONS.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
