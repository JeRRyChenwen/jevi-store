export default function StatusPill({ value }: { value: string }) {
  const s = (value || "").toLowerCase();

  const styles: Record<string, string> = {
    pending: "bg-slate-100 text-slate-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    received: "bg-blue-100 text-blue-700",
    refunded: "bg-purple-100 text-purple-700",
    cancelled: "bg-slate-200 text-slate-600",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        styles[s] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {s}
    </span>
  );
}