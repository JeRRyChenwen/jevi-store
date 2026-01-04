// src/app/admin/returns/[id]/page.tsx
import ReturnDetailClient from "./ReturnDetailClient";

export default async function AdminReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReturnDetailClient id={id} />;
}
