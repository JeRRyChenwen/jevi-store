import * as React from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import AuthLogo from "@/components/brand/AuthLogo";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode; // 底部插槽
  className?: string;
};

export default function AuthShell({ title, subtitle, children, footer, className = "" }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景：渐变 + 低对比网格 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/40 to-background" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--muted-foreground)/0.08) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--muted-foreground)/0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 40%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 40%, transparent 70%)",
        }}
      />

      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto w-full max-w-md">
          {/* ✅ 顶部品牌位：现在先用品牌名，后面你可以很容易替换成图片 Logo */}
          <div className="mb-8 flex items-center justify-center">
            <AuthLogo />
          </div>

          {/* 卡片 */}
          <div
            className={`rounded-2xl border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm ${className}`}
          >
            <div className="p-6">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              <div className="mt-5">{children}</div>
            </div>

            {footer && (
              <div className="border-t p-4 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}