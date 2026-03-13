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
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={reasonType}
            onChange={(e) => onReasonTypeChange(e.target.value)}
            disabled={submitting || uploading}
          >
            <option value="">Select a reason</option>
            <option value="changed_mind">Changed my mind</option>
            <option value="wrong_item">Received wrong item</option>
            <option value="faulty">Faulty / damaged</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Details (optional)</label>
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
              <div className="mt-1 text-xs leading-relaxed">{inlineMessage}</div>
            </Alert>
          </div>
        )}
      </Card>
    </div>
  );
}