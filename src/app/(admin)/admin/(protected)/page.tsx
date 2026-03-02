"use client";

import AdminPage from "@/components/admin/AdminPage";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { useEffect, useState } from "react";

export default function AdminDashboardPage() {
  const [pendingReturns, setPendingReturns] = useState("-");
  const [todayOrders, setTodayOrders] = useState("-");
  const [shippedToday, setShippedToday] = useState("-");

  // 后面可以接真实API
  useEffect(() => {
    // TODO: future metrics API
  }, []);

  return (
    <AdminPage
      title="Dashboard"
      subtitle="Store overview & operations"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard label="Pending returns" value={pendingReturns} />
        <AdminStatCard label="Today's orders" value={todayOrders} />
        <AdminStatCard label="Shipped today" value={shippedToday} />
      </div>

      <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">
        Welcome to your admin console.  
        Use the left navigation to manage orders, returns and inventory.
      </div>
    </AdminPage>
  );
}