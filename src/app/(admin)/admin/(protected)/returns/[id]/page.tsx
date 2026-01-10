// src/app/admin/returns/[id]/page.tsx
import ReturnDetailClient from "./ReturnDetailClient";

export default function Page({ params }: { params: { id: string } }) {
  return <ReturnDetailClient id={params.id} />;
}