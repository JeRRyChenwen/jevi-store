// src/app/(admin)/admin/(protected)/returns/[id]/_components/ReturnDetailLoading.tsx

export default function ReturnDetailLoading({ id }: { id: string }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Loading...</h2>
      <p className="text-sm text-slate-600">Fetching return #{id}</p>
    </div>
  );
}