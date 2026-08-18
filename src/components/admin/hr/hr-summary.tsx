import { KpiCard } from "@/components/admin/dashboard/kpi";

/**
 * Compact ERP KPI strip for the HR list pages.
 */
export function EmployeeSummaryCards({
  total,
  active,
  onLeave,
  departments,
}: {
  total: number;
  active: number;
  onLeave: number;
  departments: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Total employees" value={String(total)} />
      <KpiCard label="Active" value={String(active)} tone="positive" />
      <KpiCard label="On leave" value={String(onLeave)} tone="gold" />
      <KpiCard label="Departments" value={String(departments)} />
    </div>
  );
}

export function PayrollPeriodSummaryCards({
  total,
  open,
  closed,
}: {
  total: number;
  open: number;
  closed: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard label="Total periods" value={String(total)} />
      <KpiCard label="Open periods" value={String(open)} tone="positive" />
      <KpiCard label="Closed periods" value={String(closed)} />
    </div>
  );
}