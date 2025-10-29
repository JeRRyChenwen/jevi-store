// src/components/legal/LegalShell.tsx
import * as React from "react";

export default function LegalShell({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
            <div className="p-6 md:p-8">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {updatedAt && (
                <p className="mt-1 text-sm text-muted-foreground">Last updated: {updatedAt}</p>
              )}
              <div className="mt-6 space-y-6 text-sm leading-7 text-muted-foreground">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
