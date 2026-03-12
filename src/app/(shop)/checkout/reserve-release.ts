// src/app/(shop)/checkout/reserve-release.ts

export function pickReservationIdForRelease(
  reservationId: string | null | undefined,
  cachedReservationId: string | null | undefined
): string {
  const ridState = String(reservationId || "").trim();
  if (ridState) return ridState;

  const ridCache = String(cachedReservationId || "").trim();
  return ridCache;
}