// src/components/ui/field-message.tsx
export function FieldMessage({
  variant = "error",
  children,
}: {
  variant?: "error" | "success" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    variant === "error"
      ? "text-red-500"
      : variant === "success"
      ? "text-green-600"
      : "text-muted-foreground";

  return <p className={`text-sm mt-1 ${cls}`}>{children}</p>;
}
