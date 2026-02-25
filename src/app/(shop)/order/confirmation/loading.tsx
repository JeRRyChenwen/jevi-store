// src/app/(shop)/order/confirmation/loading.tsx
export default function Loading() {
  return (
    <main className="bg-neutral-50/60 px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-white p-6 shadow-sm text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border bg-neutral-50 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-neutral-400 animate-pulse" />
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold">
            Finalizing your order…
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Please wait a moment while we sync your order details.
          </p>
        </div>
      </div>
    </main>
  );
}