"use client";

import { useRef, type ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { SelectedImg } from "../types";

type ReturnsSubmissionCardProps = {
  images: SelectedImg[];
  submitting: boolean;
  uploading: boolean;
  uploadResult: any;

  reasonType: string;
  reasonDetail: string;

  onPickImages: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (id: string) => void;
  onReasonTypeChange: (value: string) => void;
  onReasonDetailChange: (value: string) => void;
  onSubmit: () => void;

  showInlineBlock: boolean;
  inlineTitle: string;
  inlineVariant: "error" | "warning";
  inlineMessage: string;
};

const RETURN_REASON_OPTIONS = [
  { value: "wrong_item", label: "Received wrong item" },
  { value: "faulty", label: "Faulty / damaged" },
  { value: "other", label: "Other" },
];

export default function ReturnsSubmissionCard({
  images,
  submitting,
  uploading,
  uploadResult,
  reasonType,
  reasonDetail,
  onPickImages,
  onRemoveImage,
  onReasonTypeChange,
  onReasonDetailChange,
  onSubmit,
  showInlineBlock,
  inlineTitle,
  inlineVariant,
  inlineMessage,
}: ReturnsSubmissionCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-3">
        <div>
          <div className="text-sm font-semibold">Upload images (optional)</div>
          <div className="text-xs text-muted-foreground">
            Add up to 6 photos (png/jpg/webp/gif). Each image up to 5MB.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="px-4"
            onClick={() => inputRef.current?.click()}
            disabled={submitting || uploading}
          >
            Add photos
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={onPickImages}
          />

          {images.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Selected: {images.length} / 6
            </div>
          )}
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={img.file.name}
                  className="w-full h-24 object-cover"
                />

                <button
                  type="button"
                  className="absolute top-1 right-1 rounded-full bg-white/90 border border-neutral-200 px-2 py-1 text-xs"
                  onClick={() => onRemoveImage(img.id)}
                  disabled={submitting || uploading}
                  title="Remove"
                >
                  ✕
                </button>

                <div className="px-2 py-1 text-[10px] text-neutral-600 truncate">
                  {img.file.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {uploadResult?.ok && (
          <div className="text-xs text-muted-foreground">
            Uploaded images: {uploadResult.count || 0}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">Return reason</h2>

        <div className="space-y-2">
          <div className="grid gap-2">
            {RETURN_REASON_OPTIONS.map((opt) => {
              const active = reasonType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onReasonTypeChange(opt.value)}
                  disabled={submitting || uploading}
                  className={[
                    "w-full rounded-xl border px-4 py-3 text-left text-sm transition",
                    "focus:outline-none focus:ring-2 focus:ring-black/10",
                    active
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
                    submitting || uploading
                      ? "opacity-60 cursor-not-allowed"
                      : "",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{opt.label}</span>

                    <span
                      className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-slate-900 bg-slate-900"
                          : "border-slate-300 bg-white",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          active ? "bg-white" : "bg-transparent",
                        ].join(" ")}
                      />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Details (optional)</label>

          <p className="text-xs text-muted-foreground leading-5">
            Please describe the issue clearly. If you are requesting a refund or
            a replacement for a faulty, damaged, or incorrect item, please
            provide as much detail as possible and upload supporting photos
            where available.
          </p>

          <textarea
            rows={4}
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Tell us more..."
            value={reasonDetail}
            onChange={(e) => onReasonDetailChange(e.target.value)}
            disabled={submitting || uploading}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            className="px-6"
            onClick={onSubmit}
            disabled={submitting || uploading}
          >
            {submitting
              ? "Submitting..."
              : uploading
                ? "Uploading images..."
                : "Submit return request"}
          </Button>
        </div>

        {showInlineBlock && (
          <div className="mt-6">
            <Alert variant={inlineVariant}>
              <div className="font-semibold">{inlineTitle}</div>
              <div className="mt-1 text-xs leading-relaxed">
                {inlineMessage}
              </div>
            </Alert>
          </div>
        )}
      </Card>
    </div>
  );
}
