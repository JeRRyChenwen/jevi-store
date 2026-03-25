// src/components/address/CountrySelect.tsx
"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { COUNTRY_OPTIONS } from "@/lib/country";

type Props = {
  id?: string;
  name?: string;

  value?: string | null;

  onChange?: (code: string) => void;
  onValueChange?: (code: string) => void;

  disabled?: boolean;
  invalid?: boolean;

  placeholder?: string;

  describedById?: string;
  className?: string;

  /**
   * ✅ 可选：允许调用方传入“当前页面可选国家列表”
   * - 不传时：默认仍使用全量 COUNTRY_OPTIONS
   * - 传了时：只显示传入的国家
   */
  options?: ReadonlyArray<{ code: string; label: string }>;
};

function normalizeValue(v?: string | null): string {
  return String(v ?? "").trim().toUpperCase();
}

function renderHighlighted(label: string, q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return label;

  const lower = label.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx < 0) return label;

  const before = label.slice(0, idx);
  const hit = label.slice(idx, idx + query.length);
  const after = label.slice(idx + query.length);

  return (
    <>
      {before}
      <span className="font-medium">{hit}</span>
      {after}
    </>
  );
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
  options,
}: Props) {
  const v = normalizeValue(value);

  const emit = React.useCallback(
    (code: string) => {
      (onValueChange ?? onChange)?.(String(code || "").trim().toUpperCase());
    },
    [onChange, onValueChange]
  );

  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const triggerRef = React.useRef<HTMLDivElement | null>(null);

  const sortedOptions = React.useMemo(() => {
    const source = options && options.length ? options : COUNTRY_OPTIONS;

    return [...source].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );
  }, [options]);

  const selectedLabel = React.useMemo(() => {
    if (!v) return "";
    return sortedOptions.find((x) => x.code === v)?.label ?? "";
  }, [v, sortedOptions]);

  const filteredOptions = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return sortedOptions;

    const starts: typeof sortedOptions = [];
    const contains: typeof sortedOptions = [];

    for (const c of sortedOptions) {
      const label = c.label.toLowerCase();
      if (label.startsWith(query)) starts.push(c);
      else if (label.includes(query)) contains.push(c);
    }
    return [...starts, ...contains];
  }, [q, sortedOptions]);

  // 打开时 focus + select；关闭时清空 query
  React.useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // input 展示：打开显示 query；关闭显示 label
  const inputDisplayValue = open ? q : selectedLabel;

  const listId = id ? `${id}-country-listbox` : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
      }}
    >
      {/* ✅ 关键：用 Trigger 仅做锚点 + 我们自己控制 open */}
      <PopoverTrigger asChild>
        <div
          ref={triggerRef}
          className={cn("w-full", className)}
          /**
           * ✅ 核心修复：拦截 Radix Trigger 自带的 toggle 行为
           * - 同一次点击里，我们负责 setOpen(true)
           * - 阻止 Radix 再 toggle 回 false（否则就“闪一下”）
           */
          onPointerDownCapture={(e) => {
            if (disabled) return;

            // 阻止 Radix Trigger 的默认 toggle
            e.preventDefault();
            e.stopPropagation();

            if (!open) setOpen(true);
          }}
          // 保险：避免 click 再触发一次 toggle
          onClick={(e) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm shadow-xs",
              "bg-white text-neutral-900",
              "focus-within:ring-2 focus-within:ring-neutral-200",
              invalid
                ? "border-red-500 focus-within:ring-red-500/20"
                : "border-input",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-text"
            )}
          >
            <input
              id={id}
              name={name}
              ref={inputRef}
              disabled={disabled}
              aria-invalid={invalid ? true : undefined}
              aria-describedby={describedById}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              placeholder={placeholder}
              value={inputDisplayValue}
              className={cn(
                "w-full bg-transparent outline-none placeholder:text-neutral-400",
                !open && "caret-transparent"
              )}
              onChange={(e) => {
                if (disabled) return;
                if (!open) setOpen(true);
                setQ(e.target.value);
              }}
              onKeyDown={(e) => {
                if (disabled) return;

                if (e.key === "Enter") {
                  if (!open) {
                    setOpen(true);
                    return;
                  }
                  if (filteredOptions.length === 1) {
                    const only = filteredOptions[0];
                    emit(only.code);
                    setOpen(false);
                    return;
                  }
                }

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setOpen(true);
                  return;
                }

                if (e.key === "Escape") {
                  setOpen(false);
                  return;
                }
              }}
              autoComplete="off"
            />

            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className={cn("p-0", "w-[var(--radix-popover-trigger-width)]")}
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        /**
         * ✅ 外部点击正常关闭，但如果点在 trigger 内，不要当 outside
         */
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;

          if (triggerRef.current?.contains(target)) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;

          if (triggerRef.current?.contains(target)) {
            e.preventDefault();
          }
        }}
      >
        <Command shouldFilter={false}>
          <CommandList id={listId} className="max-h-72 overflow-y-auto">
            <CommandEmpty>No results</CommandEmpty>

            <CommandGroup>
              {filteredOptions.map((c) => {
                const selected = v === c.code;
                return (
                  <CommandItem
                    key={c.code}
                    value={c.code}
                    onSelect={(val) => {
                      const s = String(val).trim().toUpperCase();
                      if (!s) return;
                      emit(s);
                      setOpen(false);
                    }}
                    // 防止点击 item 导致 input 失焦触发奇怪的 close/open
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-center justify-between"
                  >
                    <span>{renderHighlighted(c.label, q)}</span>
                    {selected ? (
                      <Check className="h-4 w-4 opacity-80" />
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
