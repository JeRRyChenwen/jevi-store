// src/app/(shop)/checkout/_components/CheckoutSteps.tsx

import { Check } from "lucide-react";
import { STEP_LIST } from "../constants";
import type { StepKey } from "../types";

export default function CheckoutSteps({
  step,
  onChange,
}: {
  step: StepKey;
  onChange: (next: StepKey) => void;
}) {
  const currentIndex = STEP_LIST.findIndex((s) => s.key === step);
  const progress = (currentIndex / (STEP_LIST.length - 1)) * 100;

  return (
    <div className="relative pt-5 pb-5 md:pt-8 md:pb-10">
      {/* 背景线 */}
      <div className="absolute left-0 right-0 top-[18px] md:top-6 h-[2px] bg-neutral-200" />

      {/* 已完成进度线 */}
      <div
        className="absolute left-0 top-[18px] md:top-6 h-[2px] bg-black transition-all"
        style={{ width: `${progress}%` }}
      />

      <div className="relative flex items-start justify-between">
        {STEP_LIST.map((s, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          const isLocked = i > currentIndex;

          const baseCircle =
            "relative z-10 flex items-center justify-center h-8 w-8 md:h-8 md:w-8 rounded-full border text-xs md:text-sm transition-colors bg-white";
          const circleClass = isActive
            ? "bg-black text-white border-black shadow-sm"
            : isDone
              ? "bg-white text-black border-black"
              : "bg-white text-neutral-400 border-neutral-300";

          const labelClass = isActive
            ? "text-black"
            : isDone
              ? "text-neutral-500"
              : "text-neutral-400";

          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                if (!isLocked) onChange(s.key);
              }}
              tabIndex={isLocked ? -1 : 0}
              aria-current={isActive ? "step" : undefined}
              aria-disabled={isLocked ? true : undefined}
              title={isLocked ? "Complete previous steps to continue" : s.label}
              className={[
                "group flex w-1/4 flex-col items-center gap-2 md:gap-2 focus:outline-none select-none",
                isLocked
                  ? "cursor-default opacity-50 pointer-events-auto"
                  : "cursor-pointer",
              ].join(" ")}
            >
              {/* 这个白底 padding 的作用就是把线和圆圈视觉上隔开 */}
              <div className="relative z-10 bg-white px-1">
                <div className={`${baseCircle} ${circleClass}`}>
                  {isDone ? (
                    <Check className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
              </div>

              <div
                className={`text-[11px] md:text-sm font-medium leading-none md:leading-normal ${labelClass}`}
              >
                {s.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}