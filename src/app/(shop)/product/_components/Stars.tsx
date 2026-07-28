// src/app/(shop)/product/_components/Stars.tsx

/**
 * Reserved rating display component.
 *
 * This component is intentionally not used by the storefront at present.
 *
 * The website does not currently have a verified customer review system.
 * Do not use manually configured values such as Product.hot_score as customer
 * ratings. Product.hot_score may continue to be used internally for product
 * sorting, but it must not be presented to customers as a review score.
 *
 * This component may be enabled in the future only after:
 * 1. Ratings are submitted by genuine customers.
 * 2. Ratings and reviews are stored in a trusted backend data source.
 * 3. The displayed aggregate rating is calculated from those real reviews.
 * 4. Any Product JSON-LD review or aggregateRating data exactly matches the
 *    rating information visibly displayed on the product page.
 *
 * Until those requirements are implemented, keep this component unimported.
 */
export default function Stars({ value = 0 }: { value?: number }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(v);
  const half = v - full >= 0.5;

  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${v} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const state = i < full ? "full" : i === full && half ? "half" : "empty";

        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4"
            role="img"
          >
            {state === "half" ? (
              <>
                <defs>
                  <linearGradient id={`half-${i}`} x1="0" x2="1">
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                  fill={`url(#half-${i})`}
                  stroke="currentColor"
                />
              </>
            ) : (
              <path
                d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                fill={state === "full" ? "currentColor" : "none"}
                stroke="currentColor"
              />
            )}
          </svg>
        );
      })}
      <span className="ml-1 text-sm text-neutral-600">{v.toFixed(1)}</span>
    </div>
  );
}
