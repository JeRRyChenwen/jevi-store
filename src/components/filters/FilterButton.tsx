// src/components/filters/FilterButton.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Funnel } from "lucide-react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  /** 右侧的小提示，例如 "2 active" / "Date · Amount" */
  badgeText?: string;
  /** 是否显示“已激活”状态（用于高亮或显示 badge） */
  active?: boolean;

  /** 允许业务侧传入 className 以便调整位置/样式 */
  className?: string;
};

const FilterButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      label = "Filter",
      badgeText,
      active = false,
      className,
      ...buttonProps
    },
    ref
  ) => {
    const showBadge = React.useMemo(
      () => active && !!badgeText,
      [active, badgeText]
    );

    return (
      <Button
        ref={ref}
        variant="outline"
        className={`gap-2 ${className || ""}`}
        {...buttonProps}
      >
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
);

FilterButton.displayName = "FilterButton";

export default FilterButton;
