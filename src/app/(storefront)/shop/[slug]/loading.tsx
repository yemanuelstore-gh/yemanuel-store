export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14" aria-busy="true">
      <div className="h-4 w-48 animate-pulse rounded-md bg-line/70" />
      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="aspect-[4/5] animate-pulse rounded-md bg-line/70" />
          <div className="mt-3 grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="aspect-square animate-pulse rounded-sm bg-line/70" />
            ))}
          </div>
        </div>
        <div>
          <div className="h-3 w-32 animate-pulse rounded-md bg-line/70" />
          <div className="mt-3 h-9 w-3/4 animate-pulse rounded-md bg-line/70" />
          <div className="mt-5 h-7 w-40 animate-pulse rounded-md bg-line/70" />
          <div className="mt-7 h-10 w-full animate-pulse rounded-md bg-line/70" />
          <div className="mt-7 h-28 w-full animate-pulse rounded-md bg-line/70" />
        </div>
      </div>
    </div>
  );
}