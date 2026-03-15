export default function FinalizingView() {
  return (
    <main className="bg-neutral-50/60 px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-white p-6 shadow-sm text-center">
          <div className="mx-auto mb-5 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-2 w-2 rounded-full bg-neutral-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-2 w-2 rounded-full bg-neutral-700 animate-bounce" />
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold">
            Finalizing your order…
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            Please wait a moment while we sync your order details.
          </p>

          <div className="mt-4 text-xs text-neutral-500">
            This usually takes a few seconds.
          </div>
        </div>
      </div>
    </main>
  );
}