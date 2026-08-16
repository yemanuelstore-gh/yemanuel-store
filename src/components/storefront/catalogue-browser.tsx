import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/storefront/product-card";
import { EmptyCatalogueState } from "@/components/storefront/empty-state";
import { Pagination } from "@/components/storefront/pagination";
import { SortSelect } from "@/components/storefront/sort-select";
import type { ShopProduct, ShopSort } from "@/lib/catalogue";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function CatalogueBrowser({
  products,
  total,
  page,
  pageSize,
  sort,
  query,
  basePath,
  searchParams,
  searchPlaceholder = "Search this collection",
  emptyTitle = "Nothing here yet",
  emptyDescription = "The shelf is being stocked. Check back soon.",
}: {
  products: ShopProduct[];
  total: number;
  page: number;
  pageSize: number;
  sort: ShopSort;
  query: string | null;
  basePath: string;
  searchParams: SearchParamsRecord;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <form action={basePath} method="get" className="flex w-full max-w-sm gap-2">
          <label htmlFor="collection-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <Input
            id="collection-search"
            name="q"
            type="search"
            placeholder={searchPlaceholder}
            defaultValue={query ?? ""}
          />
          <Button type="submit">Search</Button>
        </form>

        <SortSelect value={sort} basePath={basePath} />
      </div>

      <p aria-live="polite" className="mt-8 text-sm text-ink-soft">
        {total} {total === 1 ? "product" : "products"}
        {query ? ` matching “${query}”` : ""}
      </p>

      {products.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      ) : (
        <EmptyCatalogueState
          className="mt-6"
          title={query ? "No products found" : emptyTitle}
          description={
            query
              ? `No results for “${query}” — check the spelling or try a different keyword.`
              : emptyDescription
          }
        />
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath={basePath}
        searchParams={searchParams}
      />
    </div>
  );
}