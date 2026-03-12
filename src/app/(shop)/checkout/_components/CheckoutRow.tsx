// src/app/(shop)/checkout/_components/CheckoutRow.tsx

type CheckoutRowProps = {
  label: string;
  value: string;
  strongLeft?: boolean;
  strongRight?: boolean;
  bigRight?: boolean;
  valueClass?: string;
};

export default function CheckoutRow({
  label,
  value,
  strongLeft,
  strongRight,
  bigRight,
  valueClass,
}: CheckoutRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className={[strongLeft ? "font-semibold" : "text-neutral-600"].join(" ")}>
        {label}
      </div>
      <div
        className={[
          strongRight ? "font-semibold" : "",
          bigRight ? "text-lg" : "text-base",
          valueClass || "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}