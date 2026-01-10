// src/app/admin/returns/[id]/page.tsx
import ReturnDetailClient from "./ReturnDetailClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // ✅ Next 15：params 需要 await
  return <ReturnDetailClient id={id} />;
}
