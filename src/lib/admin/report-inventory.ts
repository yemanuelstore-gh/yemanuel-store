import { reportRpc, serviceReportRpc, take } from "@/lib/admin/reporting";
import {
  getLocationsSummary,
  getLowStockSkus,
  getLowStockSummary,
  getValuationSummary,
  type LocationInventorySummary,
  type LowStockRow,
  type LowStockSummary,
  type ValuationSummary,
} from "@/lib/admin/inventory-analytics";
import type { InventorySummary, TrendPoint } from "@/lib/admin/dashboard";

/**
 * Inventory report data layer. Aggregates come from the existing app.* SQL
 * functions (dashboard_inventory_summary, dashboard_inventory_trend) and the
 * inventory analytics module; no client-side rollups are needed.
 */

export type InventoryReportData = {
  summary: InventorySummary | null;
  trend: TrendPoint[] | null;
  valuation: ValuationSummary | null;
  locations: LocationInventorySummary[];
  lowStock: LowStockSummary | null;
  lowStockRows: LowStockRow[];
  available: boolean;
};

export async function getInventoryReport(): Promise<InventoryReportData> {
  const [summaryRes, trendRes, valuation, locations, lowStock, lowStockRows] =
    await Promise.all([
      reportRpc<InventorySummary>("dashboard_inventory_summary", {}),
      serviceReportRpc<TrendPoint[]>("dashboard_inventory_trend", { p_days: 60 }),
      getValuationSummary(),
      getLocationsSummary(),
      getLowStockSummary(),
      getLowStockSkus({ page: 1, pageSize: 10 }),
    ]);

  return {
    summary: take(summaryRes),
    trend: take(trendRes),
    valuation,
    locations,
    lowStock,
    lowStockRows: lowStockRows.rows,
    available: summaryRes.ok,
  };
}