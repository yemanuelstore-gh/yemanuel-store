import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { Icon } from "@/components/ui/icons";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  getFinancialAccount,
  maskAccountIdentifier,
  formatAccountAmount,
  TRANSACTION_DIRECTION,
  type FinancialTransaction,
} from "@/lib/admin/finance";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_STATUS_LABELS,
  FINANCIAL_TRANSACTION_TYPE_LABELS,
  labelFor,
} from "@/lib/admin/labels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Financial Account — Yemanuel ERP",
};

function InfoRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-erp-border py-2.5 last:border-b-0">
      <dt className="shrink-0 text-xs font-medium text-erp-text-secondary">
        {label}
      </dt>
      <dd
        className={cn(
          "text-right text-[13px] font-medium text-erp-text",
          mono && "font-mono",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function TransactionAmount({
  currency,
  type,
  amount,
}: {
  currency: string;
  type: string;
  amount: number;
}) {
  const direction = TRANSACTION_DIRECTION[type];
  const negative = direction === "out";
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        negative ? "text-erp-cancelled" : "text-erp-success",
      )}
    >
      {formatAccountAmount(currency, negative ? -amount : amount)}
    </span>
  );
}

export default async function FinancialAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.finance.read)) {
    return (
      <PageContainer>
        <PageHeader
          title="Financial Account"
          breadcrumb={[
            { label: "Finance" },
            { label: "Financial Accounts", href: "/admin/financial-accounts" },
            { label: "Account" },
          ]}
        />
        <NoAccess module="financial accounts" />
      </PageContainer>
    );
  }

  const { id } = await params;
  const client = await createClient();

  let data: Awaited<ReturnType<typeof getFinancialAccount>>;
  try {
    data = await getFinancialAccount(client, id);
  } catch {
    data = null;
  }
  if (!data) notFound();

  const { account, transactions } = data;
  const typeLabel = labelFor(account.account_type, ACCOUNT_TYPE_LABELS);
  const masked = maskAccountIdentifier(account.account_number);

  return (
    <PageContainer>
      <PageHeader
        title={account.account_name}
        description={`${typeLabel} account${account.institution ? ` with ${account.institution}` : ""}.`}
        breadcrumb={[
          { label: "Finance" },
          { label: "Financial Accounts", href: "/admin/financial-accounts" },
          { label: account.account_name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              status={labelFor(account.status, ACCOUNT_STATUS_LABELS)}
            />
            <Link
              href="/admin/financial-accounts"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-erp-border bg-erp-surface px-3 text-xs font-medium text-erp-text-secondary transition-colors hover:bg-erp-canvas hover:text-erp-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
            >
              <Icon name="chevron-left" size={13} />
              All accounts
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card padding="md" className="min-w-0">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
            Account Information
          </h2>
          <dl className="mt-3">
            <InfoRow label="Type">
              {typeLabel}
            </InfoRow>
            <InfoRow label="Institution / Provider">
              {account.institution ?? "—"}
            </InfoRow>
            <InfoRow label="Account / Wallet Number" mono>
              {masked ?? "—"}
            </InfoRow>
            <InfoRow label="Currency">{account.currency}</InfoRow>
            <InfoRow label="Status">
              {labelFor(account.status, ACCOUNT_STATUS_LABELS)}
            </InfoRow>
            <InfoRow label="Opened">
              {formatDateTime(account.created_at)}
            </InfoRow>
            {account.notes && (
              <InfoRow label="Notes">
                <span className="max-w-56 whitespace-normal text-right">
                  {account.notes}
                </span>
              </InfoRow>
            )}
          </dl>
        </Card>

        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
              Current Balance
            </p>
            <p
              className={cn(
                "mt-1.5 text-3xl font-semibold tracking-tight tabular-nums",
                account.balance < 0 ? "text-erp-cancelled" : "text-erp-text",
              )}
            >
              {formatAccountAmount(account.currency, account.balance)}
            </p>
          </div>
          <dl className="mt-4 space-y-2 border-t border-erp-border pt-3">
            <div className="flex items-center justify-between text-xs">
              <dt className="text-erp-text-secondary">Opening balance</dt>
              <dd className="tabular-nums font-medium text-erp-text">
                {formatAccountAmount(account.currency, account.opening_balance)}
              </dd>
            </div>
            <div className="flex items-center justify-between text-xs">
              <dt className="text-erp-text-secondary">Ledger movements</dt>
              <dd className="tabular-nums font-medium text-erp-text">
                {transactions.length.toLocaleString("en-GB")}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-[11px] leading-relaxed text-erp-text-muted">
            Balances are derived from opening balance plus ledger movements —
            never stored separately.
          </p>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-erp-border px-4 py-3">
          <div>
            <h2 className="text-[13px] font-semibold text-erp-text">
              Recent Transactions
            </h2>
            <p className="text-xs text-erp-text-secondary">
              Movement of money in and out of this account.
            </p>
          </div>
        </div>
        {transactions.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon="payments"
              title="No transactions recorded"
              description="Money movements in and out of this account will appear here once the transactions phase links payments, expenses and transfers to financial accounts."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Type</TH>
                <TH>Reference</TH>
                <TH>Description</TH>
                <TH className="text-right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {transactions.map((transaction: FinancialTransaction) => (
                <TR key={transaction.id}>
                  <TD className="whitespace-nowrap text-erp-text-secondary">
                    {formatDateTime(transaction.occurred_at)}
                  </TD>
                  <TD>
                    {labelFor(
                      transaction.transaction_type,
                      FINANCIAL_TRANSACTION_TYPE_LABELS,
                    )}
                  </TD>
                  <TD className="font-mono text-erp-text-secondary">
                    {transaction.reference ?? "—"}
                  </TD>
                  <TD className="max-w-64 text-erp-text-secondary">
                    <span className="block truncate">
                      {transaction.description ?? "—"}
                    </span>
                  </TD>
                  <TD className="text-right">
                    <TransactionAmount
                      currency={account.currency}
                      type={transaction.transaction_type}
                      amount={transaction.amount}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-erp-border px-4 py-3">
          <h2 className="text-[13px] font-semibold text-erp-text">
            Related Payments & Expenses
          </h2>
          <p className="text-xs text-erp-text-secondary">
            Payments, expenses and transfers that settled into or out of this
            account.
          </p>
        </div>
        <div className="p-4">
          <EmptyState
            icon="receivables"
            title="Not linked yet"
            description="Payments, expenses and transfers are not yet connected to financial accounts. These relationships arrive with the transactions phase."
          />
        </div>
      </Card>
    </PageContainer>
  );
}