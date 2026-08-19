import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { KpiCard } from "@/components/admin/kpi-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { AddAccount } from "@/components/admin/account-form";
import { Alert } from "@/components/ui/alert";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  listFinancialAccounts,
  summarizeAccounts,
  maskAccountIdentifier,
  formatAccountAmount,
  ACCOUNT_TYPES,
  type FinancialAccount,
  type FinancialAccountType,
  type FinancialAccountSummary,
} from "@/lib/admin/finance";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_STATUS_LABELS, labelFor } from "@/lib/admin/labels";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Financial Accounts — Yemanuel Store ERP",
};

type AccountTypeFilter = "all" | FinancialAccountType;

function parseType(value: string | undefined): AccountTypeFilter {
  if (value && ACCOUNT_TYPES.includes(value as FinancialAccountType)) {
    return value as FinancialAccountType;
  }
  return "all";
}

function AccountTypeTabs({
  current,
  summary,
}: {
  current: AccountTypeFilter;
  summary: FinancialAccountSummary;
}) {
  const tabs: { id: AccountTypeFilter; label: string; href: string; count: number }[] = [
    {
      id: "all",
      label: "All",
      href: "/admin/financial-accounts",
      count: summary.total_accounts,
    },
    {
      id: "bank",
      label: "Banks",
      href: "/admin/financial-accounts?type=bank",
      count: summary.by_type.bank.count,
    },
    {
      id: "mobile_money",
      label: "Mobile Money",
      href: "/admin/financial-accounts?type=mobile_money",
      count: summary.by_type.mobile_money.count,
    },
    {
      id: "cash",
      label: "Cash",
      href: "/admin/financial-accounts?type=cash",
      count: summary.by_type.cash.count,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Filter financial accounts by type"
      className="inline-flex items-center gap-1 rounded-lg border border-erp-border bg-erp-canvas p-1"
    >
      {tabs.map((tab) => {
        const active = tab.id === current;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy",
              active
                ? "bg-erp-navy text-white shadow-sm"
                : "text-erp-text-secondary hover:bg-white hover:text-erp-text",
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  active
                    ? "bg-erp-gold text-erp-navy-deep"
                    : "bg-white text-erp-text-muted",
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function TypeChip({ type }: { type: FinancialAccountType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        type === "bank" &&
          "border-erp-navy/15 bg-erp-navy/[0.04] text-erp-navy",
        type === "mobile_money" &&
          "border-erp-gold/40 bg-erp-gold/[0.08] text-erp-gold-hover",
        type === "cash" &&
          "border-erp-success/25 bg-erp-success-soft text-erp-success",
      )}
    >
      <span
        className={cn(
          "size-1 rounded-full",
          type === "bank" && "bg-erp-navy",
          type === "mobile_money" && "bg-erp-gold-hover",
          type === "cash" && "bg-erp-success",
        )}
        aria-hidden="true"
      />
      {labelFor(type, ACCOUNT_TYPE_LABELS)}
    </span>
  );
}

export default async function FinancialAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.finance.read)) {
    return (
      <PageContainer>
        <PageHeader
          title="Financial Accounts"
          breadcrumb={[{ label: "Finance" }, { label: "Financial Accounts" }]}
        />
        <NoAccess module="financial accounts" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const type = parseType(rawType);

  const client = await createClient();

  let accounts: FinancialAccount[] = [];
  let loadError = false;
  try {
    accounts = await listFinancialAccounts(client);
  } catch {
    loadError = true;
  }

  const summary = summarizeAccounts(accounts);
  const visible =
    type === "all"
      ? accounts
      : accounts.filter((account) => account.account_type === type);

  const typeLabel =
    type === "all" ? "financial account" : ACCOUNT_TYPE_LABELS[type].toLowerCase();

  return (
    <PageContainer>
      <PageHeader
        title="Financial Accounts"
        description="Manage the bank, mobile-money, and cash accounts used by Yemanuel Store ERP."
        breadcrumb={[{ label: "Finance" }, { label: "Financial Accounts" }]}
        actions={
          <AddAccount canCreate={hasPermission(session, PERMISSIONS.finance.create)} />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Accounts"
          value={summary.total_accounts.toLocaleString("en-GB")}
          icon="wallet"
          comparison={`${summary.active_accounts.toLocaleString("en-GB")} active`}
        />
        <KpiCard
          label="Active Accounts"
          value={summary.active_accounts.toLocaleString("en-GB")}
          icon="check"
          comparison={`${(summary.total_accounts - summary.active_accounts).toLocaleString("en-GB")} inactive`}
        />
        <KpiCard
          label="Bank Balance"
          value={formatAccountAmount("GHS", summary.by_type.bank.balance)}
          icon="bank"
        />
        <KpiCard
          label="Mobile Money Balance"
          value={formatAccountAmount("GHS", summary.by_type.mobile_money.balance)}
          icon="mobile"
        />
        <KpiCard
          label="Cash Balance"
          value={formatAccountAmount("GHS", summary.by_type.cash.balance)}
          icon="cash"
        />
        <KpiCard
          label="Total Available Balance"
          value={formatAccountAmount("GHS", summary.total_balance)}
          icon="sparkle"
        />
      </div>

      <div className="mt-5">
        <AccountTypeTabs current={type} summary={summary} />
      </div>

      <Card className="mt-4 overflow-hidden">
        {loadError ? (
          <Alert variant="warning" title="Financial data unavailable">
            We could not load financial accounts right now. Please try again
            shortly.
          </Alert>
        ) : visible.length === 0 ? (
          <EmptyState
            icon="wallet"
            title={
              accounts.length === 0
                ? "No financial accounts yet"
                : `No ${typeLabel}s found`
            }
            description={
              accounts.length === 0
                ? "Bank, mobile-money and cash accounts used by Yemanuel will appear here once they are set up."
                : "Try selecting another account type."
            }
            action={
              accounts.length === 0 ? (
                <AddAccount
                  compact
                  canCreate={hasPermission(session, PERMISSIONS.finance.create)}
                />
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Account</TH>
                <TH>Institution / Provider</TH>
                <TH>Type</TH>
                <TH>Account / Wallet Number</TH>
                <TH>Currency</TH>
                <TH className="text-right">Balance</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {visible.map((account) => (
                <TR key={account.id}>
                  <TD>
                    <Link
                      href={`/admin/financial-accounts/${account.id}`}
                      className="font-medium text-erp-navy hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                    >
                      {account.account_name}
                    </Link>
                  </TD>
                  <TD className="text-erp-text-secondary">
                    {account.institution ?? "—"}
                  </TD>
                  <TD>
                    <TypeChip type={account.account_type} />
                  </TD>
                  <TD className="font-mono text-erp-text-secondary">
                    {maskAccountIdentifier(account.account_number) ?? "—"}
                  </TD>
                  <TD>{account.currency}</TD>
                  <TD
                    className={cn(
                      "text-right font-medium tabular-nums",
                      account.balance < 0 ? "text-erp-cancelled" : "text-erp-text",
                    )}
                  >
                    {formatAccountAmount(account.currency, account.balance)}
                  </TD>
                  <TD>
                    <StatusBadge status={labelFor(account.status, ACCOUNT_STATUS_LABELS)} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}