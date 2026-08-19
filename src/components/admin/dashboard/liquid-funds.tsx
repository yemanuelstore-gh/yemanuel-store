import Link from "next/link";
import { formatGHS } from "@/lib/format";
import { MetricValue } from "@/components/admin/metric-value";
import { Icon, type IconName } from "@/components/ui/icons";
import {
  ACCOUNT_TYPES,
  summarizeAccounts,
  type FinancialAccount,
  type FinancialAccountType,
} from "@/lib/admin/finance";
import { ACCOUNT_TYPE_LABELS } from "@/lib/admin/labels";

const TYPE_ICONS: Record<FinancialAccountType, IconName> = {
  bank: "bank",
  mobile_money: "mobile",
  cash: "cash",
};

export function LiquidFunds({
  accounts,
  linkHref = "/admin/financial-accounts",
}: {
  accounts: FinancialAccount[] | null;
  linkHref?: string;
}) {
  const summary = accounts ? summarizeAccounts(accounts) : null;

  if (summary === null) {
    return (
      <p className="py-3 text-xs text-erp-text-muted">
        Financial account data is unavailable with your current permissions.
      </p>
    );
  }

  if (summary.total_accounts === 0) {
    return (
      <div className="py-3">
        <p className="text-sm font-medium text-erp-text">No financial accounts yet</p>
        <p className="mt-0.5 text-xs text-erp-text-secondary">
          Add bank, mobile money or cash accounts to track liquid funds here.
        </p>
        <Link
          href={linkHref}
          className="mt-2 inline-block text-xs font-medium text-erp-navy underline-offset-2 hover:underline"
        >
          Manage accounts
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <MetricValue size="lg" value={formatGHS(summary.total_balance)} />
        <span className="text-[11px] text-erp-text-muted">
          {summary.active_accounts} of {summary.total_accounts} active
        </span>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {ACCOUNT_TYPES.map((type) => {
          const bucket = summary.by_type[type];
          return (
            <li
              key={type}
              className="flex items-center justify-between gap-2 rounded-md border border-erp-border bg-erp-canvas/50 px-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-erp-border bg-white text-erp-text-secondary">
                  <Icon name={TYPE_ICONS[type]} size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-erp-text-secondary">
                    {ACCOUNT_TYPE_LABELS[type]}
                  </span>
                  <span className="block text-[10px] text-erp-text-muted">
                    {bucket.count} account{bucket.count === 1 ? "" : "s"}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-erp-text">
                {formatGHS(bucket.balance)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px] text-erp-text-muted">
          Balances derived from opening balances plus ledger transactions.
        </p>
        <Link
          href={linkHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-erp-navy underline-offset-2 hover:underline"
        >
          View all
          <Icon name="chevron-right" size={12} />
        </Link>
      </div>
    </div>
  );
}