"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-brand-900">
        Something went wrong
      </h1>
      <p className="mt-2 text-brand-800/80">
        {error.digest
          ? `Reference: ${error.digest}`
          : "Please try again in a moment."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700"
      >
        Try again
      </button>
    </main>
  );
}
