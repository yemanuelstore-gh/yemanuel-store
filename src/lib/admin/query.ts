import type { DashboardClient } from "@/lib/admin/dashboard";

export type ListResult<T> = {
  rows: T[];
  total: number;
};

export type ListQuery = {
  page: number;
  pageSize: number;
  q?: string;
};

export const PAGE_SIZE = 25;

export type ListFilterBuilder = ReturnType<
  ReturnType<DashboardClient["from"]>["select"]
>;

/**
 * Fetch a page of rows plus an exact total count. `applyFilters` receives a
 * query builder with select already applied and must return it with any
 * filters and ordering; the helper applies count + range.
 */
export async function listQuery<T>(
  client: DashboardClient,
  table: string,
  params: ListQuery,
  applyFilters: (query: ListFilterBuilder) => ListFilterBuilder,
  select: string,
): Promise<ListResult<T>> {
  const from = (params.page - 1) * params.pageSize;
  const [countResult, pageResult] = await Promise.all([
    applyFilters(client.from(table).select("*", { count: "exact", head: true })),
    applyFilters(client.from(table).select(select, { count: "exact" })).range(
      from,
      from + params.pageSize - 1,
    ),
  ]);
  if (countResult.error || pageResult.error) {
    return { rows: [], total: 0 };
  }
  return {
    rows: (pageResult.data ?? []) as unknown as T[],
    total: countResult.count ?? pageResult.count ?? 0,
  };
}