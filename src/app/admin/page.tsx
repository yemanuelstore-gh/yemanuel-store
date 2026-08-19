import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { DashboardRangeSelector } from "@/components/admin/dashboard/range-selector";
import { KpiCard, HeroCard, DeltaBadge } from "@/components/admin/dashboard/kpi";
import { Panel, PanelGrid } from "@/components/admin/dashboard/section";
import { BarChart, HBarList, ShareDonut, AreaSparkline } from "@/components/admin/dashboard/charts";
import { TrendPanel } from "@/components/admin/dashboard/trend-panel";
import { CountUp } from "@/components/admin/dashboard/count-up";
import { BanknoteIcon, AlertTriangleIcon, BoxesIcon, WarehouseIcon } from "@/components/admin/icons";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import {
  resolveDashboardRange,
  formatCompactGHS,
  formatNumber,
  percent,
  weekdayLabel,
  isStoreClosed,
  type AlertsData,
  type InventorySummary,
  type ReceivableRow,
  type PayableRow,
  type ExpensesRangeData,
  type SalesRangeData,
} from "@/lib/admin/dashboard";
import {
  startOfDayUtc,
  endOfDayUtc,
  previousBusinessDay,
  businessDayAverage,
} from "@/lib/business-calendar";
import { reportRpc, take } from "@/lib/admin/reporting";
import { getSalesReport } from "@/lib/admin/report-sales";
import { formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Store Dashboard — Yemanuel Store Admin",
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function yoyDelta(current: number, previous: number): number | null {
  return Number.isFinite(current) && previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await getAdminSession();
  const { range: rangeKey, from, to } = await searchParams;
  const range = resolveDashboardRange({ range: rangeKey, from, to });

  const canSales = hasPermission(session, PERMISSIONS.sales.read);
  const canInventory = hasPermission(session, PERMISSIONS.inventory.read);
  const canExpenses = hasPermission(session, PERMISSIONS.expenses.read);
  const canCustomers = hasPermission(session, PERMISSIONS.customers.read);
  const canPurchases = hasPermission(session, PERMISSIONS.purchases.read);

  const now = new Date();
  const todayWindow = {
    p_start: startOfDayUtc(now).toISOString(),
    p_end: endOfDayUtc(now).toISOString(),
  };
  const prevDay = previousBusinessDay(now);
  const prevDayWindow = {
    p_start: startOfDayUtc(prevDay).toISOString(),
    p_end: endOfDayUtc(prevDay).toISOString(),
  };
  const dayArgs = {
    p_start: range.start.toISOString().slice(0, 10),
    p_end: range.end.toISOString().slice(0, 10),
  };

  const [salesData, todayRes, prevDayRes, expensesRes, receivablesRes, payablesRes, alertsRes, inventoryRes, topCustomersRes] =
    await Promise.all([
      canSales ? getSalesReport(range) : null,
      canSales ? reportRpc<SalesRangeData>("dashboard_sales_range", todayWindow) : null,
      canSales ? reportRpc<SalesRangeData>("dashboard_sales_range", prevDayWindow) : null,
      canExpenses ? reportRpc<ExpensesRangeData>("dashboard_expenses_range", dayArgs) : null,
      canSales ? reportRpc<ReceivableRow[]>("dashboard_receivables", {}) : null,
      canPurchases ? reportRpc<PayableRow[]>("dashboard_payables", {}) : null,
      canSales ? reportRpc<AlertsData>("dashboard_alerts", {}) : null,
      canInventory ? reportRpc<InventorySummary>("dashboard_inventory_summary", {}) : null,
      canCustomers
        ? reportRpc<{ customer_name: string; order_count: number; spending: number }[]>(
            "dashboard_top_customers",
            {
              p_start: range.start.toISOString(),
              p_end: range.end.toISOString(),
              p_limit: 6,
            },
          )
        : null,
    ]);

  const sales = salesData?.sales ?? null;
  const lastYear = salesData?.lastYear ?? null;
  const todaySales = todayRes ? take(todayRes) : null;
  const prevDaySales = prevDayRes ? take(prevDayRes) : null;
  const alerts = alertsRes ? take(alertsRes) : null;
  const inventory = inventoryRes ? take(inventoryRes) : null;
  const expenses = expensesRes ? take(expensesRes) : null;
  const receivables = ((receivablesRes ? take(receivablesRes) : []) ?? []).slice(0, 5);
  const payables = ((payablesRes ? take(payablesRes) : []) ?? []).slice(0, 5);
  const topCustomers = topCustomersRes ? take(topCustomersRes) ?? [] : [];

  const closedToday = isStoreClosed(now);

  const byDay = salesData?.byDay ?? [];
  const bestDay =
    byDay.length > 0
      ? byDay.reduce((best, point) => (point.revenue > best.revenue ? point : best))
      : null;

  const payments = salesData?.payments ?? null;
  const collectionRate =
    payments && payments.collected_total + payments.pending_amount > 0
      ? (payments.collected_total / (payments.collected_total + payments.pending_amount)) * 100
      : null;

  const dailyAverage = sales ? businessDayAverage(sales.revenue, range.start, range.end) : null;

  const weekdayTotals = byDay.reduce<number[]>((acc, point) => {
    const date = new Date(`${point.day}T00:00:00Z`);
    if (!Number.isFinite(date.getTime())) return acc;
    acc[date.getUTCDay()] = (acc[date.getUTCDay()] ?? 0) + point.revenue;
    return acc;
  }, Array(7).fill(0));
  const maxWeekday = Math.max(...weekdayTotals, 1);

  return (
    <div className="space-y-5">
      <div className="dashboard-ambient" aria-hidden="true" />

      {/* Sticky header */}
      <div className="sticky top-12 z-10 -mx-4 border-b border-line/70 bg-canvas/85 px-4 py-3 backdrop-blur-md lg:-mx-5 lg:px-5">
        <PageHeader
          title="Store Dashboard"
          description={`${range.label} · ${range.start.toLocaleDateString("en-GB")} – ${range.end.toLocaleDateString("en-GB")}`}
          actions={<DashboardRangeSelector />}
        />
      </div>

      {salesData && !salesData.available && (
        <div className="animate-rise rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs leading-5 text-danger">
          <strong>Aggregations are not available yet.</strong> This dashboard reads
          pre-aggregated figures from SQL functions in the{" "}
          <code className="mx-1 rounded bg-white/60 px-1">app</code> schema (migration{" "}
          <code className="mx-1 rounded bg-white/60 px-1">
            20260817040000_dashboard_aggregations.sql
          </code>
          ). Apply the migration to unlock the dashboard. No numbers are fabricated while
          this is pending.
        </div>
      )}

      {closedToday && (
        <div className="animate-rise flex items-center gap-2 rounded-lg border border-gold/30 bg-gold-soft px-4 py-2.5 text-xs font-semibold text-gold-dark">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold" />
          The store is closed today (Sunday). Figures reflect completed operations.
        </div>
      )}

      {/* Hero row */}
      {canSales && sales && (
        <div className="animate-rise grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <HeroCard
              eyebrow="Revenue"
              label={`Total revenue · ${range.label}`}
              value={<CountUp value={sales.revenue} format={formatGHS} />}
              note={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1.5">
                    <DeltaBadge current={sales.revenue} previous={lastYear?.revenue ?? 0} onDark />
                    <span>vs last year</span>
                  </span>
                  {todaySales && (
                    <span className="flex items-center gap-1.5">
                      <DeltaBadge
                        current={todaySales.revenue}
                        previous={prevDaySales?.revenue ?? 0}
                        onDark
                      />
                      <span>today vs prev business day</span>
                    </span>
                  )}
                </span>
              }
              sparkline={
                <AreaSparkline
                  data={byDay.map((point) => ({ label: point.day, value: point.revenue }))}
                  color="#dcb94e"
                />
              }
              subStats={[
                { label: "Orders", value: formatNumber(sales.order_count) },
                { label: "Items sold", value: formatNumber(sales.units_sold) },
                { label: "Avg order", value: formatGHS(sales.average_order_value) },
                { label: "Margin", value: percent(sales.gross_margin) },
                { label: "Per open day", value: dailyAverage != null ? formatGHS(dailyAverage) : "—" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 xl:col-span-5">
            <KpiCard
              label="Gross profit"
              value={<CountUp value={sales.gross_profit} format={formatGHS} />}
              note={
                yoyDelta(sales.gross_profit, lastYear?.gross_profit ?? 0) != null ? (
                  <span className="flex items-center gap-1.5">
                    <DeltaBadge
                      current={sales.gross_profit}
                      previous={lastYear?.gross_profit ?? 0}
                    />
                    <span>vs last year</span>
                  </span>
                ) : (
                  `${formatNumber(sales.cancelled_orders)} cancelled orders`
                )
              }
              tone={sales.gross_profit > 0 ? "positive" : "default"}
            />
            <KpiCard
              label="Collected"
              value={<CountUp value={payments?.collected_total ?? 0} format={formatGHS} />}
              note={
                collectionRate != null
                  ? `${percent(collectionRate)} collection rate · ${payments?.collected_count ?? 0} payments`
                  : `${payments?.collected_count ?? 0} payments`
              }
              tone="positive"
              href="/admin/payments"
            />
            <KpiCard
              label="Pending"
              value={<CountUp value={payments?.pending_amount ?? 0} format={formatGHS} />}
              note={`${payments?.pending_count ?? 0} payments awaiting collection`}
              tone="gold"
              href="/admin/payments"
            />
            <KpiCard
              label="Refunds"
              value={<CountUp value={payments?.refunds_total ?? 0} format={formatGHS} />}
              note={`${payments?.refunds_count ?? 0} refunds issued`}
              tone="danger"
            />
          </div>
        </div>
      )}

      {/* Trend + operations */}
      {canSales && (
        <div className="animate-rise grid grid-cols-1 gap-5 lg:grid-cols-12" style={{ animationDelay: "70ms" }}>
          <section className="lg:col-span-8">
            <Panel
              title={`Daily trend · ${range.label}`}
              subtitle={
                bestDay
                  ? `Best day: ${weekdayLabel(bestDay.day)} · ${formatGHS(bestDay.revenue)}`
                  : "Aggregated server-side from order data"
              }
            >
              <TrendPanel
                points={byDay}
                subtitle={`${byDay.length} operating days in range`}
                height={210}
              />
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  Revenue by weekday · {range.label}
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAY_LABELS.map((label, index) => {
                    const value = weekdayTotals[index] ?? 0;
                    const pct = Math.max((value / maxWeekday) * 100, value > 0 ? 4 : 1);
                    return (
                      <div key={label} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-semibold text-ink-faint">{label}</span>
                        <div className="flex h-14 w-full items-end rounded-md bg-navy-soft/40 p-0.5">
                          <div
                            className="w-full rounded-sm bg-gradient-to-t from-navy to-navy/70 transition-all duration-500"
                            style={{ height: `${pct}%` }}
                            title={`${label}: ${formatGHS(value)}`}
                          />
                        </div>
                        <span className="text-[9px] font-semibold tabular-nums text-ink-soft">
                          {formatCompactGHS(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>
          </section>

          <section className="lg:col-span-4" style={{ animationDelay: "120ms" }}>
            <Panel
              title="Operations & alerts"
              subtitle="Current position — not range-bound"
              icon={<AlertTriangleIcon className="h-4 w-4" />}
            >
              <ul className="space-y-2.5">
                <AlertRow
                  icon={<BanknoteIcon className="h-4 w-4" />}
                  label="Pending payments"
                  value={formatGHS(alerts?.pending_payment_amount ?? 0)}
                  detail={`${alerts?.pending_payment_count ?? 0} awaiting collection`}
                  href="/admin/payments"
                />
                <AlertRow
                  icon={<BoxesIcon className="h-4 w-4" />}
                  label="Unfulfilled orders"
                  value={String(alerts?.unfulfilled_order_count ?? 0)}
                  detail="not yet fulfilled"
                  href="/admin/orders"
                />
                {canPurchases && (
                  <AlertRow
                    icon={<WarehouseIcon className="h-4 w-4" />}
                    label="Open purchase orders"
                    value={String(alerts?.open_po_count ?? 0)}
                    detail="awaiting receipt"
                    href="/admin/purchases/orders"
                  />
                )}
                {canInventory && inventory && (
                  <AlertRow
                    icon={<WarehouseIcon className="h-4 w-4" />}
                    label="Stock at risk"
                    value={String(inventory.low_stock_count + inventory.out_of_stock_count)}
                    detail={`${inventory.out_of_stock_count} out of stock · ${inventory.low_stock_count} low`}
                    href="/admin/inventory/low-stock"
                    tone={inventory.low_stock_count + inventory.out_of_stock_count > 0 ? "danger" : "default"}
                  />
                )}
              </ul>
            </Panel>
          </section>
        </div>
      )}

      {/* Category + top products */}
      {canSales && (
        <div className="animate-rise grid grid-cols-1 gap-5 lg:grid-cols-2" style={{ animationDelay: "160ms" }}>
          <Panel title="Sales by category" subtitle={`Share of revenue · ${range.label}`}>
            <ShareDonut
              data={(salesData?.byCategory ?? []).map((point) => ({
                label: point.category_name,
                value: point.revenue,
              }))}
              formatValue={formatCompactGHS}
            />
          </Panel>
          <Panel title="Top products" subtitle="By revenue in the selected range">
            <HBarList
              data={(salesData?.topProducts ?? []).map((product) => ({
                label: product.variant_name,
                value: product.revenue,
              }))}
              formatValue={formatCompactGHS}
            />
          </Panel>
        </div>
      )}

      {/* Financial health + customer insights */}
      {(canSales || canPurchases || canExpenses) && (
        <div className="animate-rise grid grid-cols-1 gap-5 lg:grid-cols-12" style={{ animationDelay: "220ms" }}>
          <section className="lg:col-span-8">
            <Panel
              title="Financial health"
              subtitle="Operating expenses, receivables and payables"
              icon={<BanknoteIcon className="h-4 w-4" />}
            >
              {canExpenses && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-navy-soft/30 px-4 py-3">
                  <p className="text-[11px] font-semibold text-ink-soft">
                    Operating expenses · {range.label}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-ink">
                    {expenses ? <CountUp value={expenses.total} format={formatGHS} /> : "—"}
                  </p>
                  <p className="text-[11px] text-ink-faint">
                    {expenses?.expense_count ?? 0} expense entries
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Top receivables
                  </p>
                  {receivables.length === 0 ? (
                    <p className="text-[11px] text-ink-faint">Nothing outstanding.</p>
                  ) : (
                    <ul className="divide-y divide-line rounded-lg border border-line">
                      {receivables.map((row) => (
                        <li
                          key={row.customer_name}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                        >
                          <span className="min-w-0 truncate text-[12px] font-semibold text-ink">
                            {row.customer_name}
                          </span>
                          <span className="shrink-0 text-[12px] font-bold tabular-nums text-danger">
                            {formatGHS(row.outstanding)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Top payables
                  </p>
                  {payables.length === 0 ? (
                    <p className="text-[11px] text-ink-faint">Nothing outstanding.</p>
                  ) : (
                    <ul className="divide-y divide-line rounded-lg border border-line">
                      {payables.map((row) => (
                        <li
                          key={row.supplier_name}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                        >
                          <span className="min-w-0 truncate text-[12px] font-semibold text-ink">
                            {row.supplier_name}
                          </span>
                          <span className="shrink-0 text-[12px] font-bold tabular-nums text-gold-dark">
                            {formatGHS(row.outstanding)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Panel>
          </section>

          {canCustomers && (
            <section className="lg:col-span-4">
              <Panel title="Customer insights" subtitle="Top customers by spending">
                <HBarList
                  data={topCustomers.map((row) => ({
                    label: row.customer_name,
                    value: row.spending,
                  }))}
                  formatValue={formatCompactGHS}
                />
              </Panel>
            </section>
          )}
        </div>
      )}

      {/* Footer meta */}
      <div className="flex items-center justify-between border-t border-line pt-4 text-[11px] font-medium text-ink-faint">
        <p>
          Data range: {range.start.toLocaleDateString("en-GB")} –{" "}
          {range.end.toLocaleDateString("en-GB")}
        </p>
        <p className="hidden sm:block">Aggregation performed server-side in UTC</p>
      </div>
    </div>
  );
}

function AlertRow({
  icon,
  label,
  value,
  detail,
  href,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  href: string;
  tone?: "default" | "danger";
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5 transition-all hover:border-navy/30 hover:shadow-sm"
      >
        <span
          className={
            tone === "danger"
              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger"
              : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-soft text-navy"
          }
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-semibold text-ink">{label}</span>
          <span className="block truncate text-[10px] text-ink-faint">{detail}</span>
        </span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-ink">{value}</span>
      </Link>
    </li>
  );
}