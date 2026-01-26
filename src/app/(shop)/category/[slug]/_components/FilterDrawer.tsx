"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export type FilterDrawerProps = {
  open: boolean;
  onClose: () => void;

  // refs（用于焦点管理：打开后 focus close；关闭后回到 trigger）
  closeBtnRef?: React.RefObject<HTMLButtonElement | null>;

  // 支持标记
  variantFiltersSupported: boolean;
  productGenderSupported: boolean;

  // facets 数据
  facetMaterials: string[];
  facetSizes: string[];
  facetColors: string[];
  facetGenders: string[];

  // draft state
  draftMin: number | undefined;
  setDraftMin: (v: number | undefined) => void;

  draftMax: number | undefined;
  setDraftMax: (v: number | undefined) => void;

  draftMaterials: Set<string>;
  setDraftMaterials: (v: Set<string>) => void;

  draftSizes: Set<string>;
  setDraftSizes: (v: Set<string>) => void;

  draftColors: Set<string>;
  setDraftColors: (v: Set<string>) => void;

  draftGenders: Set<string>;
  setDraftGenders: (v: Set<string>) => void;

  // actions
  onReset: () => void;
  onApply: () => void;
};

export default function FilterDrawer({
  open,
  onClose,
  closeBtnRef,

  variantFiltersSupported,
  productGenderSupported,

  facetMaterials,
  facetSizes,
  facetColors,
  facetGenders,

  draftMin,
  setDraftMin,
  draftMax,
  setDraftMax,

  draftMaterials,
  setDraftMaterials,
  draftSizes,
  setDraftSizes,
  draftColors,
  setDraftColors,
  draftGenders,
  setDraftGenders,

  onReset,
  onApply,
}: FilterDrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-50 transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* 背景遮罩 */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* 面板 */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`absolute left-0 top-0 h-full w-[92vw] sm:w-[380px] bg-white shadow-xl transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* 用 flex 让：内容可滚动 + footer 固定/粘底 */}
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="px-4 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Filter by</h2>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="Close filter panel"
              title="Close"
              className="rounded-full p-2 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <X className="h-5 w-5 text-neutral-600" />
            </button>
          </div>

          {/* Content（可滚动） */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* ===== Price ===== */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Price</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <div className="text-xs text-neutral-600">Min</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={typeof draftMin === "number" ? draftMin : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = v === "" ? undefined : Math.max(0, Number(v));
                      setDraftMin(Number.isFinite(Number(n)) ? n : undefined);
                    }}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="0"
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-neutral-600">Max</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={typeof draftMax === "number" ? draftMax : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = v === "" ? undefined : Math.max(0, Number(v));
                      setDraftMax(Number.isFinite(Number(n)) ? n : undefined);
                    }}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="No limit"
                  />
                </label>
              </div>
            </section>

            {/* ===== Gender（product 级） ===== */}
            {productGenderSupported && facetGenders.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Gender</h3>
                  <span className="text-xs text-neutral-500">{facetGenders.length}</span>
                </div>

                <div className="space-y-2">
                  {facetGenders.map((g) => {
                    const checked = draftGenders.has(g);
                    return (
                      <label key={g} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(draftGenders);
                            if (e.target.checked) next.add(g);
                            else next.delete(g);
                            setDraftGenders(next);
                          }}
                        />
                        <span>{g}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ===== Variants filters（material / size / color） ===== */}
            {variantFiltersSupported && (
              <>
                {/* Material */}
                {facetMaterials.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Material</h3>
                      <span className="text-xs text-neutral-500">{facetMaterials.length}</span>
                    </div>

                    <div className="space-y-2">
                      {facetMaterials.map((m) => {
                        const checked = draftMaterials.has(m);
                        return (
                          <label key={m} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(draftMaterials);
                                if (e.target.checked) next.add(m);
                                else next.delete(m);
                                setDraftMaterials(next);
                              }}
                            />
                            <span>{m}</span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Size */}
                {facetSizes.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Size</h3>
                      <span className="text-xs text-neutral-500">{facetSizes.length}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {facetSizes.map((s) => {
                        const active = draftSizes.has(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              const next = new Set(draftSizes);
                              if (next.has(s)) next.delete(s);
                              else next.add(s);
                              setDraftSizes(next);
                            }}
                            className={[
                              "px-3 py-1.5 rounded-full border text-sm",
                              active ? "border-black" : "border-neutral-200",
                              active ? "bg-black text-white" : "bg-white text-neutral-800",
                            ].join(" ")}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Color */}
                {facetColors.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Color</h3>
                      <span className="text-xs text-neutral-500">{facetColors.length}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {facetColors.map((c) => {
                        const active = draftColors.has(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              const next = new Set(draftColors);
                              if (next.has(c)) next.delete(c);
                              else next.add(c);
                              setDraftColors(next);
                            }}
                            className={[
                              "px-3 py-1.5 rounded-full border text-sm",
                              active ? "border-black" : "border-neutral-200",
                              active ? "bg-black text-white" : "bg-white text-neutral-800",
                            ].join(" ")}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* facets 不可用提示 */}
            {(!variantFiltersSupported ||
              facetMaterials.length + facetSizes.length + facetColors.length === 0) && (
              <div className="text-xs text-neutral-500">
                No variant facets available (material/size/color). Check console logs for
                /api/variants response.
              </div>
            )}
          </div>

          {/* Footer：更高 + 边框 + 不贴底 + Reset 有 outline */}
          <div className="sticky bottom-0 border-t bg-white px-4 py-5">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-full"
                onClick={onReset}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-full"
                onClick={onApply}
                >
                Apply
                </Button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
