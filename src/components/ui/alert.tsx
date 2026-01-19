import * as React from "react";
import { cn } from "@/lib/utils";

export type AlertVariant = "error" | "success" | "warning" | "info";

const variantStyles: Record<AlertVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-green-200 bg-green-50 text-green-700",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export function Alert({
  children,
  variant = "info",
  className,
  role = "alert",
}: {
  children: React.ReactNode;
  variant?: AlertVariant;
  className?: string;
  role?: React.AriaRole;
}) {
  if (!children) return null;

  return (
    <div
      role={role}
      className={cn("rounded-lg border px-4 py-3 text-sm", variantStyles[variant], className)}
    >
      {children}
    </div>
  );
}
