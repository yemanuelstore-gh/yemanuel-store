import { KpiCard } from "@/components/admin/dashboard/kpi";

/**
 * Compact ERP KPI strip for the Finance account list pages.
 */
export function AccountSummaryCards({
  total,
  active,
  totalBalance,
  fourth,
}: {
  total: number;
  active: number;
  totalBalance: string;
  fourth: { label: string; value: string };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Total accounts" value={String(total)} />
      <KpiCard label="Active accounts" value={String(active)} tone="positive" />
      <KpiCard label="Total balance" value={totalBalance} tone="gold" />
      <KpiCard label={fourth.label} value={fourth.value} />
    </div>
  );
}