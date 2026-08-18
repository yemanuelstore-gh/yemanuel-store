import { createClient } from "@/lib/supabase/server";
import { isoDay, reportRpc, take } from "@/lib/admin/reporting";
import type {
  DashboardRange,
  PayableRow,
  PurchasesMonthPoint,
  PurchasesRangeData,
  SupplierPoint,
} from "@/lib/admin/dashboard";

/**
 * Purchasing report data layer. All figures come from the existing
 * app.dashboard_* purchasing functions; purchase-order pipeline counts use
 * exact head queries per status.
 */

export type PurchaseOrderStatusCount = {
  status: string;
  count: number;
};

export type PurchasingReportData = {
  range: DashboardRange;
  purchases: PurchasesRangeData | null;
  byMonth: PurchasesMonthPoint[] | null;
  topSuppliers: SupplierPoint[] | null;
  payables: PayableRow[] | null;
  poStatusCounts: PurchaseOrderStatusCount[];
  available: boolean;
};

const PO_STATUSES = ["draft", "sent", "partially_received", "received", "cancelled"] as const;

export async function getPurchasingReport(range: DashboardRange): Promise<PurchasingReportData> {
  const client = await createClient();
  const args = { p_start: isoDay(range.start), p_end: isoDay(range.end) };

  const [purchasesRes, byMonthRes, topSuppliersRes, payablesRes, ...statusCounts] =
    await Promise.all([
      reportRpc<PurchasesRangeData>("dashboard_purchases_range", args),
      reportRpc<PurchasesMonthPoint[]>("dashboard_purchases_by_month", args),
      reportRpc<SupplierPoint[]>("dashboard_top_suppliers", { ...args, p_limit: 10 }),
      reportRpc<PayableRow[]>("dashboard_payables", {}),
      ...PO_STATUSES.map((status) =>
        client.from("purchase_orders").select("id", { count: "exact", head: true }).eq("status", status),
      ),
    ]);

  const poStatusCounts: PurchaseOrderStatusCount[] = PO_STATUSES.map((status, index) => ({
    status,
    count: statusCounts[index].count ?? 0,
  }));

  return {
    range,
    purchases: take(purchasesRes),
    byMonth: take(byMonthRes),
    topSuppliers: take(topSuppliersRes),
    payables: take(payablesRes),
    poStatusCounts,
    available: purchasesRes.ok,
  };
}