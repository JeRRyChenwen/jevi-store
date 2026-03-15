// src/app/(shop)/checkout/_components/AddressFieldParts.tsx

export function InlineError({
  show,
  id,
  text,
}: {
  show: boolean;
  id: string;
  text: string;
}) {
  if (!show) return null;

  return (
    <p id={id} className="mt-1 text-xs text-red-600">
      {text}
    </p>
  );
}

export function RequiredStar() {
  return <span className="ml-1 text-red-600">*</span>;
}