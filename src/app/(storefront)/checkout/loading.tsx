export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14" aria-busy="true">
      <div className="h-4 w-24 animate-pulse rounded-md bg-line/70" />
      <div className="mt-4 h-9 w-48 animate-pulse rounded-md bg-line/70" />
      <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded-md bg-line/70" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <div className="space-y-10">
          <div className="h-40 animate-pulse rounded-md bg-line/70" />
          <div className="h-72 animate-pulse rounded-md bg-line/70" />
        </div>
        <div className="h-96 animate-pulse rounded-md bg-line/70" />
      </div>
    </div>
  );
}