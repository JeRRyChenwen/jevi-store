// src/app/(admin)/admin/(protected)/orders/_components/OrdersFiltersBar.tsx

type OrdersFiltersBarProps = {
  status: string;
  setStatus: (v: string) => void;
  q: string;
  setQ: (v: string) => void;
  setPage: (v: number) => void;
  loading: boolean;
  submitting: boolean;
  onRefresh: () => void;
};

export default function OrdersFiltersBar({
  status,
  setStatus,
  q,
  setQ,
  setPage,
  loading,
  submitting,
  onRefresh,
}: OrdersFiltersBarProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Status</label>
        <select
          className="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All</option>
          <option value="paid">paid</option>
          <option value="shipped">shipped</option>
          <option value="cancelled">cancelled</option>
          <option value="failed">failed</option>
        </select>
      </div>

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Search id / order no / email / name / tracking"
        className="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 md:w-72"
      />

      <button
        onClick={onRefresh}
        disabled={loading || submitting}
        className="rounded-md border bg-white px-3 py-2 text-sm outline-none hover:bg-slate-50 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
      >
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}