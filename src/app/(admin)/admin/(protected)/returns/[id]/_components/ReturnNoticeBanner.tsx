// src/app/(admin)/admin/(protected)/returns/[id]/_components/ReturnNoticeBanner.tsx

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import type { UiNotice } from "../return-detail.types";

export default function ReturnNoticeBanner({ notice }: { notice: UiNotice | null }) {
  if (!notice) return null;

  return (
    <div>
      <Alert variant={notice.variant} className="border p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span>{notice.message}</span>

          {notice.variant === "warning" &&
          notice.message.toLowerCase().includes("sign in") ? (
            <Link
              href="/admin/login"
              className="shrink-0 rounded-md bg-black px-3 py-2 text-sm text-white"
            >
              Login
            </Link>
          ) : null}
        </div>
      </Alert>
    </div>
  );
}