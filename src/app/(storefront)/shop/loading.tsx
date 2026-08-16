export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16" aria-busy="true">
      <div className="h-8 w-24 animate-pulse rounded-md bg-line/70" />
      <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded-md bg-line/70" />
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="h-10 w-full max-w-sm animate-pulse rounded-md bg-line/70" />
        <div className="h-9 w-44 animate-pulse rounded-md bg-line/70" />
      </div>
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-9 w-24 animate-pulse rounded-full bg-line/70" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index}>
            <div className="aspect-[4/5] animate-pulse rounded-md bg-line/70" />
            <div className="mt-3 h-3 w-20 animate-pulse rounded-md bg-line/70" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded-md bg-line/70" />
            <div className="mt-3 h-4 w-16 animate-pulse rounded-md bg-line/70" />
          </div>
        ))}
      </div>
    </div>
  );
}