import Link from "next/link";
import { cn } from "@/lib/cn";
import { PAGE_SIZE } from "@/lib/admin/sales";

export function Pagination({
  params,
  page,
  total,
  pageSize = PAGE_SIZE,
}: {
  params: URLSearchParams;
  page: number;
  total: number;
  pageSize?: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const hrefFor = (target: number): string => {
    const next = new URLSearchParams(params);
    next.set("page", String(target));
    return `?${next.toString()}`;
  };

  const window: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i += 1) window.push(i);

  const pageClass =
    "flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy";

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-2 border-t border-erp-border px-4 py-2.5"
    >
      <span className="text-xs text-erp-text-muted">
        Page {page} of {pages.toLocaleString()} · {total.toLocaleString()} records
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={cn(pageClass, "hover:bg-erp-canvas")}>
            Previous
          </Link>
        ) : (
          <span className={cn(pageClass, "cursor-not-allowed text-erp-text-muted")}>
            Previous
          </span>
        )}
        {window.map((item) =>
          item === page ? (
            <span
              key={item}
              aria-current="page"
              className={cn(pageClass, "bg-erp-navy text-white")}
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              href={hrefFor(item)}
              className={cn(pageClass, "text-erp-text-secondary hover:bg-erp-canvas")}
            >
              {item}
            </Link>
          ),
        )}
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className={cn(pageClass, "hover:bg-erp-canvas")}>
            Next
          </Link>
        ) : (
          <span className={cn(pageClass, "cursor-not-allowed text-erp-text-muted")}>
            Next
          </span>
        )}
      </div>
    </nav>
  );
}