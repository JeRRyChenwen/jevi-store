// src/components/legal/LegalShell.tsx
import * as React from "react";

export default function LegalShell({
  title,
  updatedAt,
  intro,         // ✅ 新增：顶部引言插槽（可选）
  children,
}: {
  title: string;
  updatedAt?: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
            <div className="p-6 md:p-8">
              {/* 标题 */}
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

              {/* Last updated：小号、次要色 */}
              {updatedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last updated: {updatedAt}
                </p>
              )}

              {/* 引言段：统一字号与行距；与正文拉开距离 */}
              {intro && (
                <div className="mt-6 text-[15px] leading-7 text-foreground/90">
                  {intro}
                </div>
              )}

              {/* 分隔线（有引言时出现） */}
              {intro && <div className="mt-6 border-t" />}

              {/* 正文主体：统一段落间距与字号 */}
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
