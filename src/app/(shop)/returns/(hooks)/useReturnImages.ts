"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import type { SelectedImg } from "../types";
import { isAllowedImage } from "../utils";

type UseReturnImagesParams = {
  clearAlert: () => void;
  showError: (message: string) => void;
};

export function useReturnImages({
  clearAlert,
  showError,
}: UseReturnImagesParams) {
  const [images, setImages] = useState<SelectedImg[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  function onPickImages(e: ChangeEvent<HTMLInputElement>) {
    clearAlert();

    const files = Array.from(e.target.files || []);
    // 允许重复选择同一张图：重置 input
    e.target.value = "";

    if (!files.length) return;

    const MAX_FILES = 6;
    const MAX_EACH_BYTES = 5 * 1024 * 1024; // 5MB
    const current = images.length;

    const accepted: SelectedImg[] = [];
    for (const f of files) {
      if (!isAllowedImage(f)) {
        showError("Only image files are allowed: png/jpg/webp/gif.");
        continue;
      }
      if ((f.size || 0) <= 0) {
        showError("Empty file is not allowed.");
        continue;
      }
      if ((f.size || 0) > MAX_EACH_BYTES) {
        showError("Each image must be <= 5MB.");
        continue;
      }
      if (current + accepted.length >= MAX_FILES) {
        showError(`You can upload up to ${MAX_FILES} images.`);
        break;
      }

      const previewUrl = URL.createObjectURL(f);
      accepted.push({
        id: crypto.randomUUID(),
        file: f,
        previewUrl,
      });
    }

    if (accepted.length) {
      setImages((prev) => [...prev, ...accepted]);
    }
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const hit = prev.find((x) => x.id === id);
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  async function uploadAttachments(returnId: number) {
    if (!images.length) return null;

    const fd = new FormData();
    for (const img of images) {
      fd.append("files", img.file);
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const res = await fetch(`/api/returns/${returnId}/attachments`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.ok) {
        throw new Error(String(data?.error || "upload_failed"));
      }

      setUploadResult(data);
      return data;
    } finally {
      setUploading(false);
    }
  }

  function resetImages() {
    setImages((prev) => {
      prev.forEach((x) => {
        try {
          URL.revokeObjectURL(x.previewUrl);
        } catch {}
      });
      return [];
    });
    setUploadResult(null);
    setUploading(false);
  }

  useEffect(() => {
    return () => {
      setImages((prev) => {
        prev.forEach((img) => {
          try {
            URL.revokeObjectURL(img.previewUrl);
          } catch {}
        });
        return prev;
      });
    };
  }, []);

  return {
    images,
    uploading,
    uploadResult,
    onPickImages,
    removeImage,
    uploadAttachments,
    resetImages,
  };
}