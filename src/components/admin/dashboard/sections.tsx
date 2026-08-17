import Link from "next/link";
import { formatGHS } from "@/lib/format";
import {
  bestCategoryLabel,
  bestDayLabel,
  bestMonthLabel,
  bestProductLabel,
  formatCompactGHS,
  formatNumber,
  methodLabel,
  percent,
  type DashboardData,
  type DashboardPerms,
} from "@/lib/admin/dashboard";
import {
  AdminTable,
  Th,
  Td,
  AdminEmptyState,
} from "@/components/admin/ui";
import { AdminBadge } from "@/components/admin/admin-badge";
import { movementTypeTone, orderStatusTone, paymentStatusTone, statusLabel } from "@/lib/admin/labels";
import { BarChart, HBarList, ShareDonut, type ChartPoint } from "@/components/admin/dashboard/charts";
import { KpiCard, StatStrip, DeltaBadge } from "@/components/admin/dashboard/kpi";
import { DashboardSection, PanelGrid, Panel } from "@/components/admin/dashboard/section";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function dayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function monthLabel(month: string): string {
  const date = new Date(`${month.slice(0, 10)}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function toPoints<T extends { revenue: number }>(rows: T[], labelOf: (row: T) => string): ChartPoint[] {
  return rows.map((row) => ({ label: labelOf(row), value: row.revenue }));
}

function sumOf(rows: { outstanding: number }[] | null): number {
  return (rows ?? []).reduce((sum, row) => sum + Number(row.outstanding), 0);
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

export function QuickActions({ actions }: { actions: { label: string; href: string }[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-lg border border-line bg-white px-3 py-2">
      <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
        Quick actions
      </span>
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="inline-flex h-7 items-center rounded-md border border-line-strong bg-white px-2.5 text-xs font-medium text-ink-soft transition-colors hover:border-navy/30 hover:bg-navy-soft/50 hover:text-navy"
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alerts strip
// ---------------------------------------------------------------------------

export function AlertsStrip({
  data,
  perms,
}: {
  data: DashboardData;
  perms: DashboardPerms;
}) {
  const alerts: { label: string; value: string; href: string; tone: "danger" | "gold" }[] = [];

  if (perms.inventory && data.inventory) {
    if (data.inventory.low_stock_count > 0) {
      alerts.push({
        label: "Low stock items",
        value: formatNumber(data.inventory.low_stock_count),
        href: "/admin/inventory",
        tone: "danger",
      });
    }
    if (data.inventory.out_of_stock_count > 0) {
      alerts.push({
        label: "Out of stock",
        value: formatNumber(data.inventory.out_of_stock_count),
        href: "/admin/inventory",
        tone: "danger",
      });
    }
  }

  if (perms.sales && data.alerts) {
    if (data.alerts.pending_payment_count > 0) {
      alerts.push({
        label: "Pending payments",
        value: `${formatNumber(data.alerts.pending_payment_count)} · ${formatGHS(data.alerts.pending_payment_amount)}`,
        href: "/admin/payments",
        tone: "gold",
      });
    }
    if (data.alerts.unfulfilled_order_count > 0) {
      alerts.push({
        label: "Unfulfilled orders",
        value: formatNumber(data.alerts.unfulfilled_order_count),
        href: "/admin/orders",
        tone: "gold",
      });
    }
    const receivables = sumOf(data.receivables);
    if (receivables > 0) {
      alerts.push({
        label: "Customer receivables",
        value: formatGHS(receivables),
        href: "/admin/customers",
        tone: "gold",
      });
    }
  }

  if (perms.purchases && data.alerts) {
    if (data.alerts.open_po_count > 0) {
      alerts.push({
        label: "Open purchase orders",
        value: formatNumber(data.alerts.open_po_count),
        href: "/admin/purchases/orders",
        tone: "gold",
      });
    }
    const payables = sumOf(data.payables);
    if (payables > 0) {
      alerts.push({
        label: "Supplier payables",
        value: formatGHS(payables),
        href: "/admin/purchases/invoices",
        tone: "gold",
      });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {alerts.map((alert) => (
        <Link
          key={alert.label}
          href={alert.href}
          className={`flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 transition-colors hover:bg-navy-soft/30 ${
            alert.tone === "danger" ? "border-danger/30" : "border-gold/30"
          }`}
        >
          <span className="flex items-center gap-2 text-[11px] font-medium text-ink-soft">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${alert.tone === "danger" ? "bg-danger" : "bg-gold"}`}
            />
            {alert.label}
          </span>
          <span className="whitespace-nowrap text-[12px] font-semibold tabular-nums text-ink">
            {alert.value}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top KPI grid
// ---------------------------------------------------------------------------

export function TopKpiGrid({ data, perms }: { data: DashboardData; perms: DashboardPerms }) {
  const kpis: { label: string; value: string; note: string; href: string; tone?: "danger" | "gold" }[] = [];

  if (perms.sales) {
    const today = data.todaySales;
    const month = data.month;
    const year = data.year;
    const sales = data.sales;
    kpis.push(
      {
        label: "Today's Sales",
        value: today ? formatGHS(today.revenue) : "—",
        note: data.closedToday ? "Store closed today (Sunday)" : "Revenue on today's date",
        href: "/admin/orders",
      },
      {
        label: "Today's Orders",
        value: today ? formatNumber(today.order_count) : "—",
        note: "Non-cancelled orders",
        href: "/admin/orders",
      },
      {
        label: "Today's Gross Profit",
        value: today ? formatGHS(today.gross_profit) : "—",
        note: today ? `${percent(today.gross_margin)} margin` : "",
        href: "/admin/orders",
      },
      {
        label: "Month-to-Date Sales",
        value: month ? formatGHS(month.revenue) : "—",
        note: "This business month",
        href: "/admin/orders",
      },
      {
        label: "Month-to-Date Profit",
        value: month ? formatGHS(month.gross_profit) : "—",
        note: month ? `${percent(month.gross_margin)} margin` : "",
        href: "/admin/orders",
      },
      {
        label: "Year-to-Date Sales",
        value: year ? formatGHS(year.revenue) : "—",
        note: "This calendar year",
        href: "/admin/orders",
      },
      {
        label: "Year-to-Date Profit",
        value: year ? formatGHS(year.gross_profit) : "—",
        note: year ? `${percent(year.gross_margin)} margin` : "",
        href: "/admin/orders",
      },
      {
        label: "Average Order Value",
        value: sales ? formatGHS(sales.average_order_value) : "—",
        note: `Selected range: ${data.range.label}`,
        href: "/admin/orders",
      },
    );
  }

  if (perms.customers && data.customers) {
    kpis.push({
      label: "Total Customers",
      value: formatNumber(data.customers.total_customers),
      note: `${formatNumber(data.customers.repeat_customers)} repeat · ${formatNumber(data.customers.orders_per_customer)} orders each`,
      href: "/admin/customers",
    });
  }

  if (perms.inventory && data.inventory) {
    kpis.push(
      {
        label: "Inventory Value",
        value: formatGHS(data.inventory.total_value),
        note: `${formatNumber(data.inventory.sku_count)} SKUs · ${formatNumber(data.inventory.total_units)} units`,
        href: "/admin/inventory",
      },
      {
        label: "Low Stock Items",
        value: formatNumber(data.inventory.low_stock_count),
        note: `${formatNumber(data.inventory.out_of_stock_count)} out of stock`,
        href: "/admin/inventory",
        tone: data.inventory.low_stock_count > 0 ? "danger" : undefined,
      },
    );
  }

  if (perms.sales && data.receivables) {
    const receivables = sumOf(data.receivables);
    kpis.push({
      label: "Outstanding Receivables",
      value: formatGHS(receivables),
      note: "Unpaid customer orders",
      href: "/admin/customers",
      tone: receivables > 0 ? "danger" : undefined,
    });
  }

  if (perms.purchases && data.payables) {
    const payables = sumOf(data.payables);
    kpis.push({
      label: "Supplier Payables",
      value: formatGHS(payables),
      note: "Outstanding supplier invoices",
      href: "/admin/purchases/invoices",
      tone: payables > 0 ? "gold" : undefined,
    });
  }

  if (kpis.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white p-4 text-xs text-ink-soft">
        No metrics to show — your account does not have view permission for any
        data modules yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.label}
          label={kpi.label}
          value={kpi.value}
          note={kpi.note}
          href={kpi.href}
          tone={kpi.tone}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sales analytics
// ---------------------------------------------------------------------------

export function SalesAnalyticsSection({ data }: { data: DashboardData }) {
  const sales = data.sales;
  const stats: {
    label: string;
    value: string;
    extra?: React.ReactNode;
  }[] = [
    { label: "Sales Today", value: data.todaySales ? formatGHS(data.todaySales.revenue) : "—" },
    { label: "This Business Week", value: data.week ? formatGHS(data.week.revenue) : "—" },
    { label: "This Month", value: data.month ? formatGHS(data.month.revenue) : "—" },
    { label: "This Year", value: data.year ? formatGHS(data.year.revenue) : "—" },
    { label: "Previous Business Day", value: data.prevBusinessDay ? formatGHS(data.prevBusinessDay.revenue) : "—" },
    {
      label: "Year-over-Year",
      value: data.year && data.lastYear ? formatGHS(data.year.revenue) : "—",
      extra:
        data.year && data.lastYear ? (
          <DeltaBadge current={data.year.revenue} previous={data.lastYear.revenue} />
        ) : undefined,
    },
    { label: "Orders", value: sales ? formatNumber(sales.order_count) : "—" },
    { label: "Avg Order Value", value: sales ? formatGHS(sales.average_order_value) : "—" },
    { label: "Gross Profit", value: sales ? formatGHS(sales.gross_profit) : "—" },
    { label: "Gross Margin", value: sales ? percent(sales.gross_margin) : "—" },
  ];

  const daily = toPoints((data.byDay ?? []).slice(-30), (row) => dayLabel(row.day));
  const monthly = toPoints(data.byMonth ?? [], (row) => monthLabel(row.month));
  const categories = (data.byCategory ?? []).map((row) => ({
    label: row.category_name,
    value: row.revenue,
  }));
  const methods = (data.paymentBreakdown ?? []).map((row) => ({
    label: methodLabel(row.method),
    value: row.collected,
  }));

  return (
    <DashboardSection
      title="Sales Analytics"
      description={`Period: ${data.range.label} · Business calendar: Mon–Sat, Sundays closed`}
      actionHref="/admin/orders"
      actionLabel="All orders"
    >
      <div className="mb-4 rounded-md border border-line bg-line/20 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                {stat.label}
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-ink">{stat.value}</span>
              {"extra" in stat && stat.extra}
            </div>
          ))}
        </div>
      </div>

      <PanelGrid>
        <Panel title="Daily sales trend (last 30 operating days)">
          <BarChart data={daily} formatValue={formatCompactGHS} color="#0b1f33" />
        </Panel>
        <Panel title="Monthly sales trend">
          <BarChart data={monthly} formatValue={formatCompactGHS} color="#0b1f33" />
        </Panel>
        <Panel title="Sales by category">
          <HBarList data={categories} formatValue={formatCompactGHS} />
        </Panel>
        <Panel title="Payment-method breakdown">
          <ShareDonut data={methods} formatValue={formatCompactGHS} />
        </Panel>
      </PanelGrid>

      <div className="mt-4">
        <Panel title="Top-selling products">
          {(data.topProducts ?? []).length === 0 ? (
            <AdminEmptyState
              title="No sales recorded"
              message="Top products will appear here once orders are placed."
            />
          ) : (
            <AdminTable
              head={
                <>
                  <Th>Product</Th>
                  <Th>SKU</Th>
                  <Th className="text-right">Units</Th>
                  <Th className="text-right">Revenue</Th>
                </>
              }
            >
              {(data.topProducts ?? []).map((product) => (
                <tr key={product.sku} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <span className="font-medium text-ink">{product.variant_name}</span>
                    <span className="ml-1.5 text-[11px] text-ink-faint">
                      {product.product_name}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">{product.sku}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(product.units)}</Td>
                  <Td className="text-right font-semibold tabular-nums">
                    {formatGHS(product.revenue)}
                  </Td>
                </tr>
              ))}
            </AdminTable>
          )}
        </Panel>
      </div>
    </DashboardSection>
  );
}

// ---------------------------------------------------------------------------
// Retail performance (P&L bridge)
// ---------------------------------------------------------------------------

export function PerformanceSection({ data, perms }: { data: DashboardData; perms: DashboardPerms }) {
  const sales = data.sales;
  const expenses = data.expensesSelected;
  const revenue = sales?.revenue ?? 0;
  const cogs = sales?.cogs ?? 0;
  const grossProfit = sales?.gross_profit ?? 0;
  const opex = expenses?.total ?? 0;
  const operatingResult = grossProfit - opex;

  const rows = [
    { label: "Revenue", value: revenue, formula: "Sales invoiced in the selected period" },
    { label: "COGS (cost of goods sold)", value: -cogs, formula: "Revenue − COGS = Gross Profit" },
    { label: "Gross Profit", value: grossProfit, formula: `${percent(sales?.gross_margin ?? 0)} margin` },
    { label: "Operating Expenses", value: -opex, formula: "Rent, wages, utilities, running costs" },
    { label: "Net Operating Result", value: operatingResult, formula: "Gross Profit − Operating Expenses" },
  ];

  return (
    <DashboardSection
      title="Retail Performance"
      description={`P&L bridge for ${data.range.label} — accounting relationships are explicit`}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.label} className="transition-colors hover:bg-navy-soft/30">
                <Td>
                  <span className="font-medium text-ink">{row.label}</span>
                  <span className="ml-2 hidden text-[11px] text-ink-faint md:inline">
                    {row.formula}
                  </span>
                </Td>
                <Td className="text-right">
                  <span
                    className={`font-semibold tabular-nums ${
                      row.value < 0 || (row.label === "Net Operating Result" && row.value < 0)
                        ? "text-danger"
                        : "text-ink"
                    }`}
                  >
                    {row.value < 0 ? "−" : ""}
                    {formatGHS(Math.abs(row.value))}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line-strong bg-navy-soft/40">
              <Td>
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy">
                  Accounting relationship
                </span>
              </Td>
              <Td className="text-right text-[11px] text-ink-soft">
                Revenue − COGS = Gross Profit · Gross Profit − Expenses = Operating Result
              </Td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!perms.expenses && (
        <p className="mt-2 text-[11px] text-ink-faint">
          Operating expenses are not shown — your account lacks expense view
          permission.
        </p>
      )}
    </DashboardSection>
  );
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export function InventorySection({ data }: { data: DashboardData }) {
  const inventory = data.inventory;
  const yearCogs = data.year?.cogs ?? 0;
  const turnover = inventory && inventory.total_value > 0 ? yearCogs / inventory.total_value : 0;

  const categories = (data.inventoryByCategory ?? []).map((row) => ({
    label: row.category_name,
    value: row.value,
  }));
  const trend = (data.inventoryTrend ?? []).map((row) => ({
    label: dayLabel(row.day),
    value: row.value,
  }));

  return (
    <DashboardSection
      title="Inventory"
      description="Entire inventory aggregated in-database — no row limits"
      actionHref="/admin/inventory"
      actionLabel="Manage inventory"
    >
      <div className="mb-4">
        <StatStrip
          columns={6}
          stats={[
            { label: "Inventory Value", value: inventory ? formatGHS(inventory.total_value) : "—" },
            { label: "Total Units", value: inventory ? formatNumber(inventory.total_units) : "—" },
            { label: "SKUs", value: inventory ? formatNumber(inventory.sku_count) : "—" },
            {
              label: "Low Stock",
              value: inventory ? formatNumber(inventory.low_stock_count) : "—",
              tone: inventory && inventory.low_stock_count > 0 ? "danger" : "default",
            },
            {
              label: "Out of Stock",
              value: inventory ? formatNumber(inventory.out_of_stock_count) : "—",
              tone: inventory && inventory.out_of_stock_count > 0 ? "danger" : "default",
            },
            {
              label: "Stock Turnover (YTD)",
              value: `${turnover.toFixed(2)}×`,
              note: "YTD COGS ÷ current inventory value",
            },
          ]}
        />
      </div>

      <PanelGrid>
        <Panel title="Inventory value by category">
          <HBarList data={categories} formatValue={formatCompactGHS} />
        </Panel>
        <Panel title="Inventory valuation trend (last 30 days)">
          <BarChart data={trend} formatValue={formatCompactGHS} color="#8a6e16" />
        </Panel>
      </PanelGrid>
    </DashboardSection>
  );
}

// ---------------------------------------------------------------------------
// Purchasing
// ---------------------------------------------------------------------------

export function PurchasingSection({ data }: { data: DashboardData }) {
  const month = data.purchasesMonth;
  const year = data.purchasesYear;
  const payables = sumOf(data.payables);

  const monthly = (data.purchasesByMonth ?? []).map((row) => ({
    label: monthLabel(row.month),
    value: row.receipts_value,
  }));
  const suppliers = (data.topSuppliers ?? []).map((row) => ({
    label: row.supplier_name,
    value: row.receipts_value,
  }));

  return (
    <DashboardSection
      title="Purchasing"
      description="Goods received value (landed cost of stock that entered the store)"
      actionHref="/admin/purchases/orders"
      actionLabel="Purchase orders"
    >
      <div className="mb-4">
        <StatStrip
          columns={5}
          stats={[
            { label: "Purchases This Month", value: month ? formatGHS(month.receipts_value) : "—" },
            { label: "Purchases This Year", value: year ? formatGHS(year.receipts_value) : "—" },
            {
              label: "Outstanding Supplier Invoices",
              value: data.payables ? formatGHS(payables) : "—",
              tone: payables > 0 ? "gold" : "default",
            },
            {
              label: "Invoices This Year",
              value: year ? `${formatNumber(year.invoice_count)} · ${formatGHS(year.invoices_value)}` : "—",
            },
            {
              label: "Goods Receipts This Year",
              value: year ? formatNumber(year.receipt_count) : "—",
            },
          ]}
        />
      </div>

      <PanelGrid>
        <Panel title="Purchase trend (monthly, this year)">
          <BarChart data={monthly} formatValue={formatCompactGHS} color="#0b1f33" />
        </Panel>
        <Panel title="Top suppliers (this year)">
          <HBarList data={suppliers} formatValue={formatCompactGHS} limit={6} />
        </Panel>
      </PanelGrid>
    </DashboardSection>
  );
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export function CustomersSection({ data }: { data: DashboardData }) {
  const customers = data.customers;

  return (
    <DashboardSection
      title="Customers"
      description="Registered customer base and spending behaviour"
      actionHref="/admin/customers"
      actionLabel="All customers"
    >
      <div className="mb-4">
        <StatStrip
          columns={5}
          stats={[
            { label: "Total Customers", value: customers ? formatNumber(customers.total_customers) : "—" },
            { label: "New This Month", value: customers ? formatNumber(customers.new_this_month) : "—" },
            { label: "New This Year", value: customers ? formatNumber(customers.new_this_year) : "—" },
            { label: "Repeat Customers", value: customers ? formatNumber(customers.repeat_customers) : "—" },
            {
              label: "Orders per Customer",
              value: customers ? formatNumber(customers.orders_per_customer) : "—",
            },
          ]}
        />
      </div>

      <PanelGrid>
        <Panel title="Top customers by spending">
          {(data.topCustomers ?? []).length === 0 ? (
            <AdminEmptyState
              title="No customer activity"
              message="Top customers will appear once orders are recorded."
            />
          ) : (
            <AdminTable
              head={
                <>
                  <Th>Customer</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right">Spending</Th>
                </>
              }
            >
              {(data.topCustomers ?? []).map((customer) => (
                <tr key={customer.customer_name} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <span className="font-medium text-ink">{customer.customer_name}</span>
                  </Td>
                  <Td className="text-right tabular-nums">{formatNumber(customer.order_count)}</Td>
                  <Td className="text-right font-semibold tabular-nums">
                    {formatGHS(customer.spending)}
                  </Td>
                </tr>
              ))}
            </AdminTable>
          )}
        </Panel>
        <Panel title="Customer receivables">
          {(data.receivables ?? []).length === 0 ? (
            <AdminEmptyState
              title="No outstanding receivables"
              message="Every order has been settled."
            />
          ) : (
            <AdminTable
              head={
                <>
                  <Th>Customer</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right">Outstanding</Th>
                </>
              }
            >
              {(data.receivables ?? []).map((row) => (
                <tr key={row.customer_name} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <span className="font-medium text-ink">{row.customer_name}</span>
                  </Td>
                  <Td className="text-right tabular-nums">{formatNumber(row.order_count)}</Td>
                  <Td className="text-right font-semibold tabular-nums text-danger">
                    {formatGHS(row.outstanding)}
                  </Td>
                </tr>
              ))}
            </AdminTable>
          )}
        </Panel>
      </PanelGrid>
    </DashboardSection>
  );
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export function ExpensesSection({ data }: { data: DashboardData }) {
  const categories = (data.expensesByCategory ?? []).map((row) => ({
    label: row.category_name,
    value: row.total,
  }));
  const monthly = (data.expensesByMonth ?? []).map((row) => ({
    label: monthLabel(row.month),
    value: row.total,
  }));

  return (
    <DashboardSection
      title="Expenses"
      description="Operating spend by category and month"
      actionHref="/admin/expenses"
      actionLabel="All expenses"
    >
      <div className="mb-4">
        <StatStrip
          columns={4}
          stats={[
            { label: "Expenses Today", value: data.expensesToday ? formatGHS(data.expensesToday.total) : "—" },
            { label: "This Month", value: data.expensesMonth ? formatGHS(data.expensesMonth.total) : "—" },
            { label: "This Year", value: data.expensesYear ? formatGHS(data.expensesYear.total) : "—" },
            {
              label: "Selected Range",
              value: data.expensesSelected ? formatGHS(data.expensesSelected.total) : "—",
            },
          ]}
        />
      </div>

      <PanelGrid>
        <Panel title="Expense categories (this month)">
          <HBarList data={categories} formatValue={formatCompactGHS} />
        </Panel>
        <Panel title="Monthly expense trend (this year)">
          <BarChart data={monthly} formatValue={formatCompactGHS} color="#667085" />
        </Panel>
      </PanelGrid>
    </DashboardSection>
  );
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function PaymentsSection({ data }: { data: DashboardData }) {
  const methods = (data.paymentBreakdown ?? []).map((row) => ({
    label: methodLabel(row.method),
    value: row.collected,
  }));

  return (
    <DashboardSection
      title="Payments"
      description="Collections by method — cash, mobile money, card, bank transfer, other"
      actionHref="/admin/payments"
      actionLabel="All payments"
    >
      <div className="mb-4">
        <StatStrip
          columns={5}
          stats={[
            {
              label: "Collected Today",
              value: data.paymentsToday ? formatGHS(data.paymentsToday.collected_total) : "—",
            },
            {
              label: "Collected This Month",
              value: data.paymentsMonth ? formatGHS(data.paymentsMonth.collected_total) : "—",
            },
            {
              label: "Collected This Year",
              value: data.paymentsYear ? formatGHS(data.paymentsYear.collected_total) : "—",
            },
            {
              label: "Pending Payments",
              value: data.payments ? formatGHS(data.payments.pending_amount) : "—",
              tone: (data.payments?.pending_amount ?? 0) > 0 ? "gold" : "default",
            },
            {
              label: "Refunds",
              value: data.payments ? formatGHS(data.payments.refunds_total) : "—",
              tone: (data.payments?.refunds_total ?? 0) > 0 ? "danger" : "default",
            },
          ]}
        />
      </div>

      <div className="max-w-md">
        <Panel title="Collection breakdown">
          <ShareDonut data={methods} formatValue={formatCompactGHS} />
        </Panel>
      </div>
    </DashboardSection>
  );
}

// ---------------------------------------------------------------------------
// Historical performance — "Since Opening" (17 Jan 2022)
// ---------------------------------------------------------------------------

export function HistorySection({ data, perms }: { data: DashboardData; perms: DashboardPerms }) {
  const history = data.history;
  const sales = history.sales;
  const unitsSold = sales?.units_sold ?? 0;
  const avgDaily = history.businessDays > 0 ? (sales?.revenue ?? 0) / history.businessDays : 0;

  const stats: { label: string; value: string }[] = [];
  if (perms.sales && sales) {
    stats.push(
      { label: "Total Sales Since Opening", value: formatGHS(sales.revenue) },
      { label: "Total Orders", value: formatNumber(sales.order_count) },
      { label: "Total Units Sold", value: formatNumber(unitsSold) },
      { label: "Total Gross Profit", value: formatGHS(sales.gross_profit) },
      { label: "Average Daily Sales", value: formatGHS(avgDaily) },
    );
  }
  if (perms.customers && history.customers) {
    stats.push({
      label: "Total Customers",
      value: formatNumber(history.customers.total_customers),
    });
  }
  if (perms.expenses && history.expenses) {
    stats.push({ label: "Total Expenses", value: formatGHS(history.expenses.total) });
  }
  if (perms.purchases && history.purchases) {
    stats.push({ label: "Total Purchases (received)", value: formatGHS(history.purchases.receipts_value) });
  }

  if (stats.length === 0) {
    return (
      <DashboardSection title="Yemanuel Store Since Opening">
        <p className="text-xs text-ink-soft">
          Historical performance requires at least one module view permission.
        </p>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="Yemanuel Store Since Opening"
      description="Operating continuously since Monday 17 January 2022 · figures reflect recorded transactions only — zeros stay zeros until the historical dataset is loaded"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-line/20 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              {stat.label}
            </p>
            <p className="mt-1 text-sm font-semibold tracking-tight text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
        <HistoryFact label="Best sales month" value={bestMonthLabel(history.byMonth)} />
        <HistoryFact label="Best sales day" value={bestDayLabel(history.byDay)} />
        <HistoryFact label="Best category" value={bestCategoryLabel(history.byCategory)} />
        <HistoryFact label="Best-selling product" value={bestProductLabel(history.topProducts)} />
        <HistoryFact label="Operating days since opening" value={formatNumber(history.businessDays)} />
        <HistoryFact
          label="Average order value"
          value={sales && sales.order_count > 0 ? formatGHS(sales.revenue / sales.order_count) : null}
        />
      </div>
    </DashboardSection>
  );
}

function HistoryFact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-line py-1.5">
      <span className="text-[11px] text-ink-soft">{label}</span>
      <span className="whitespace-nowrap text-[12px] font-semibold text-ink">
        {value ?? "No data yet"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent activity panels
// ---------------------------------------------------------------------------

type RecentOrdersRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  customerName: string | null;
  guestName: string | null;
};

export function RecentOrdersPanel({ orders }: { orders: RecentOrdersRow[] }) {
  return (
    <DashboardSection
      title="Recent orders"
      actionHref="/admin/orders"
      actionLabel="View all"
      bodyClassName="p-0"
    >
      {orders.length === 0 ? (
        <AdminEmptyState
          title="No orders yet"
          message="Orders placed on the storefront will appear here."
        />
      ) : (
        <AdminTable
          head={
            <>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th className="text-right">Total</Th>
            </>
          }
        >
          {orders.map((order) => (
            <tr key={order.id} className="transition-colors hover:bg-navy-soft/40">
              <Td>
                <Link
                  href={`/admin/orders/${order.orderNumber}`}
                  className="font-semibold text-navy hover:underline"
                >
                  {order.orderNumber}
                </Link>
              </Td>
              <Td>{order.customerName ?? order.guestName ?? "—"}</Td>
              <Td className="whitespace-nowrap text-ink-soft">
                {new Date(order.createdAt).toLocaleDateString("en-GB")}
              </Td>
              <Td>
                <AdminBadge tone={orderStatusTone(order.status)}>
                  {statusLabel(order.status)}
                </AdminBadge>
              </Td>
              <Td className="whitespace-nowrap text-right font-semibold tabular-nums">
                {formatGHS(Number(order.totalAmount))}
              </Td>
            </tr>
          ))}
        </AdminTable>
      )}
    </DashboardSection>
  );
}

type RecentMovementRow = {
  id: string;
  movementType: string;
  quantityChange: number;
  createdAt: string;
  variantName: string;
  sku: string;
  locationName: string;
};

export function RecentMovementsPanel({ movements }: { movements: RecentMovementRow[] }) {
  return (
    <DashboardSection
      title="Recent stock movements"
      actionHref="/admin/inventory/movements"
      actionLabel="View all"
      bodyClassName="p-0"
    >
      {movements.length === 0 ? (
        <AdminEmptyState
          title="No stock movements yet"
          message="Purchase receipts, sales and adjustments will be logged here."
        />
      ) : (
        <AdminTable
          head={
            <>
              <Th>Type</Th>
              <Th>Variant</Th>
              <Th>Date</Th>
              <Th className="text-right">Change</Th>
            </>
          }
        >
          {movements.map((movement) => (
            <tr key={movement.id} className="transition-colors hover:bg-navy-soft/40">
              <Td>
                <AdminBadge tone={movementTypeTone(movement.movementType)}>
                  {statusLabel(movement.movementType)}
                </AdminBadge>
              </Td>
              <Td>
                <span className="text-[13px] text-ink">{movement.variantName}</span>
                <span className="ml-1.5 text-[11px] text-ink-faint">{movement.sku}</span>
              </Td>
              <Td className="whitespace-nowrap text-ink-soft">
                {new Date(movement.createdAt).toLocaleDateString("en-GB")}
              </Td>
              <Td
                className={`text-right font-semibold tabular-nums ${
                  Number(movement.quantityChange) < 0 ? "text-danger" : "text-ink"
                }`}
              >
                {Number(movement.quantityChange) > 0 ? "+" : ""}
                {Number(movement.quantityChange)}
              </Td>
            </tr>
          ))}
        </AdminTable>
      )}
    </DashboardSection>
  );
}

type LowStockRow = {
  id: string;
  quantity_on_hand: number;
  reorder_level: number | null;
  product_variants: { name: string; sku: string } | null;
  locations: { name: string } | null;
};

export function LowStockPanel({ items, totalCount }: { items: LowStockRow[]; totalCount: number }) {
  return (
    <DashboardSection
      title={`Low stock (${totalCount} items at or below reorder level)`}
      actionHref="/admin/inventory"
      actionLabel="Manage inventory"
      bodyClassName="p-0"
    >
      {items.length === 0 ? (
        <AdminEmptyState
          title="No low stock items"
          message="Every tracked item is above its reorder level."
        />
      ) : (
        <AdminTable
          head={
            <>
              <Th>Variant</Th>
              <Th>Location</Th>
              <Th className="text-right">On hand</Th>
              <Th className="text-right">Reorder at</Th>
            </>
          }
        >
          {items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-navy-soft/40">
              <Td>
                <span className="font-medium text-ink">
                  {item.product_variants?.name ?? "—"}
                </span>
                <span className="ml-1.5 text-[11px] text-ink-faint">
                  {item.product_variants?.sku}
                </span>
              </Td>
              <Td>{item.locations?.name ?? "—"}</Td>
              <Td className="text-right font-semibold tabular-nums text-danger">
                {Number(item.quantity_on_hand)}
              </Td>
              <Td className="text-right tabular-nums text-ink-soft">
                {item.reorder_level === null ? "—" : Number(item.reorder_level)}
              </Td>
            </tr>
          ))}
        </AdminTable>
      )}
    </DashboardSection>
  );
}

type RecentPaymentRow = {
  id: string;
  reference: string | null;
  amount: number;
  method: string;
  status: string;
  orderNumber: string;
};

export function RecentPaymentsPanel({ payments }: { payments: RecentPaymentRow[] }) {
  return (
    <DashboardSection
      title="Recent payments"
      actionHref="/admin/payments"
      actionLabel="View all"
      bodyClassName="p-0"
    >
      {payments.length === 0 ? (
        <AdminEmptyState
          title="No payments recorded"
          message="Payments from orders will appear here."
        />
      ) : (
        <AdminTable
          head={
            <>
              <Th>Order</Th>
              <Th>Method</Th>
              <Th>Status</Th>
              <Th className="text-right">Amount</Th>
            </>
          }
        >
          {payments.map((payment) => (
            <tr key={payment.id} className="transition-colors hover:bg-navy-soft/40">
              <Td>
                <Link
                  href={`/admin/orders/${payment.orderNumber}`}
                  className="font-semibold text-navy hover:underline"
                >
                  {payment.orderNumber}
                </Link>
              </Td>
              <Td className="text-ink">{methodLabel(payment.method)}</Td>
              <Td>
                <AdminBadge tone={paymentStatusTone(payment.status)}>
                  {statusLabel(payment.status)}
                </AdminBadge>
              </Td>
              <Td className="text-right font-semibold tabular-nums">
                {formatGHS(Number(payment.amount))}
              </Td>
            </tr>
          ))}
        </AdminTable>
      )}
    </DashboardSection>
  );
}

export function RecentPurchasesPanel({
  orders,
  receipts,
}: {
  orders: { id: string; poNumber: string; supplierName: string; status: string; createdAt: string }[];
  receipts: {
    id: string;
    receiptNumber: string;
    poNumber: string | null;
    locationName: string;
    status: string;
    receivedDate: string;
  }[];
}) {
  return (
    <DashboardSection
      title="Recent purchasing activity"
      actionHref="/admin/purchases/orders"
      actionLabel="View all"
      bodyClassName="p-0"
    >
      <div className="p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
          Recent purchase orders
        </p>
        {orders.length === 0 ? (
          <p className="text-[11px] text-ink-soft">No purchase orders yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between gap-2 py-1.5 text-[12px]"
              >
                <span className="font-medium text-navy">{order.poNumber}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">
                  {order.supplierName}
                </span>
                <AdminBadge tone={orderStatusTone(order.status)}>
                  {statusLabel(order.status)}
                </AdminBadge>
              </li>
            ))}
          </ul>
        )}
        <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
          Recent goods receipts
        </p>
        {receipts.length === 0 ? (
          <p className="text-[11px] text-ink-soft">No goods receipts yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {receipts.map((receipt) => (
              <li
                key={receipt.id}
                className="flex items-center justify-between gap-2 py-1.5 text-[12px]"
              >
                <span className="font-medium text-navy">{receipt.receiptNumber}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">
                  {receipt.locationName} ·{" "}
                  {new Date(receipt.receivedDate).toLocaleDateString("en-GB")}
                </span>
                <AdminBadge tone={orderStatusTone(receipt.status)}>
                  {statusLabel(receipt.status)}
                </AdminBadge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardSection>
  );
}