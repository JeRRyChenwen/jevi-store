"use client";

export default function AdminCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {children}
    </div>
  );
}