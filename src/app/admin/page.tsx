// src/app/admin/page.tsx
export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <p className="text-sm text-slate-600">
        这里先作为占位页面。后续可以放：
        今日订单数、待处理退货数量、销售额等指标。
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-slate-500">Pending returns</div>
          <div className="mt-2 text-2xl font-bold">-</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-slate-500">Today&apos;s orders</div>
          <div className="mt-2 text-2xl font-bold">-</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-slate-500">Refund volume</div>
          <div className="mt-2 text-2xl font-bold">-</div>
        </div>
      </div>
    </div>
  );
}
