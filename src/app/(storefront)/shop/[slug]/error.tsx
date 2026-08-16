"use client";

import { RetryPanel } from "@/components/storefront/retry-panel";

export default function ProductError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <RetryPanel
        onRetry={reset}
        message="Something went wrong while loading this product. Please try again."
      />
    </div>
  );
}