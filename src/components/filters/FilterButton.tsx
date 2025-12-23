// src/components/filters/FilterButton.tsx
"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Funnel } from "lucide-react";

type Props = {
  label?: string;
  /** 右侧的小提示，例如 "2 active" / "Date · Amount" */
  badgeText?: string;
  /** 是否显示“已激活”状态（用于高亮或显示 badge） */
  active?: boolean;

  /** 允许业务侧传入 className 以便调整位置/样式 */
  className?: string;
};

export default function FilterButton({
  label = "Filter",
  badgeText,
  active = false,
  className,
}: Props) {
  const showBadge = useMemo(() => active && !!badgeText, [active, badgeText]);

  return (
    <Button variant="outline" className={`gap-2 ${className || ""}`}>
      <Funnel className="h-4 w-4" />
      {label}
      {showBadge && (
        <span className="ml-1 text-xs text-muted-foreground">
          ({badgeText})
        </span>
      )}
    </Button>
  );
}
