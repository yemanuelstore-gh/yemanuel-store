import Link from "next/link";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function hrefFor(
  basePath: string,
  searchParams: SearchParamsRecord,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

const pageButton =
  "inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: SearchParamsRecord;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"
    >
      <p className="text-sm text-ink-soft">
        Showing{" "}
        <span className="font-medium text-ink">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-ink">{total}</span> products
      </p>
      <div className="flex items-center gap-3">
        {page > 1 ? (
          <Link
            href={hrefFor(basePath, searchParams, page - 1)}
            className={pageButton}
          >
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className="sr-only">
            No previous page
          </span>
        )}
        <p className="text-sm text-ink-soft">
          Page{" "}
          <span className="font-medium text-ink">
            {page}
          </span>{" "}
          of {totalPages}
        </p>
        {page < totalPages ? (
          <Link
            href={hrefFor(basePath, searchParams, page + 1)}
            className={pageButton}
          >
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className="sr-only">
            No next page
          </span>
        )}
      </div>
    </nav>
  );
}
