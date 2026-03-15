// src/app/(admin)/admin/(protected)/returns/[id]/_components/ReturnDetailEmptyState.tsx

import Link from "next/link";
import { Alert } from "@/components/ui/alert";

type Props = {
  id: string;
  err: string;
};

export default function ReturnDetailEmptyState({ id, err }: Props) {
  const pretty =
    err === "not_found" || err === "HTTP_404"
      ? "NOT_FOUND"
      : err === "UNAUTHORIZED" || err === "HTTP_401"
        ? "UNAUTHORIZED"
        : err || "UNKNOWN_ERROR";

  const title = pretty === "UNAUTHORIZED" ? "Admin login required" : "No return data";
  const desc =
    pretty === "UNAUTHORIZED"
      ? "You are not logged in as admin. Please sign in to continue."
      : `No return request exists for this id (id: ${id}).`;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-slate-600">{desc}</p>

      <Alert
        variant={
          pretty === "UNAUTHORIZED" ? "warning" : pretty === "NOT_FOUND" ? "info" : "error"
        }
        className="border p-3 text-sm"
      >
        {pretty === "UNAUTHORIZED"
          ? "Admin session expired. Please sign in again."
          : pretty === "NOT_FOUND"
            ? "No data for this return id."
            : `Error: ${pretty}`}
      </Alert>

      {pretty === "UNAUTHORIZED" ? (
        <div className="pt-2">
          <Link
            href="/admin/login"
            className="inline-flex rounded-md bg-black px-3 py-2 text-sm text-white"
          >
            Go to Admin Login
          </Link>
        </div>
      ) : null}
    </div>
  );
}