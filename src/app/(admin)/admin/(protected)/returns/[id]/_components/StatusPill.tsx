// src/app/(admin)/admin/(protected)/returns/[id]/_components/StatusPill.tsx

export default function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">
      {value}
    </span>
  );
}