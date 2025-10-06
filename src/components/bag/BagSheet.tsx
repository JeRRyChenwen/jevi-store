// src/components/bag/BagSheet.tsx
export default function BagSheet() {
  if (typeof window !== "undefined") {
    console.warn("[BagSheet] disabled placeholder. Use <BagDrawer /> instead.");
  }
  return null;
}