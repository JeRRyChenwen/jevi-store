"use client";

export default function CardSkeleton() {
  return (
    <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="h-[260px] sm:h-[300px] md:h-[340px] lg:h-[380px] xl:h-[420px] bg-muted animate-pulse" />
      <div className="p-6 md:p-8 space-y-3">
        <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
        <div className="h-8 w-24 rounded bg-muted animate-pulse" />
      </div>
    </article>
  );
}
