import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { BankAccountStatusForm } from "@/components/admin/finance/account-forms";
import {
  AccountBalanceCard,
  AccountTransactionsPanel,
} from "@/components/admin/finance/account-transactions";
import { AdminButtonLink, DataRow, PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import {
  getAccountTransactions,
  getAccountTransactionTargets,
  getBankAccountById,
} from "@/lib/admin/accounts";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";
import { bankAccountTypeLabel } from "@/lib/admin/account-constants";

export const metadata: Metadata = {
  title: "Bank Account — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function AdminBankAccountDetailPage({ params, searchParams }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.expenses.read)) {
    return <UnauthorizedPage message="Your account does not have the expenses.read permission." />;
  }
  const canUpdate = hasPermission(session, PERMISSIONS.expenses.update);
  const canCreate = hasPermission(session, PERMISSIONS.expenses.create);

  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [account, transactions, targets] = await Promise.all([
    getBankAccountById(id),
    getAccountTransactions({ kind: "bank", accountId: id, q: sp.q, page }),
    getAccountTransactionTargets("bank", id),
  ]);
  if (!account) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.accountName}
        description={`${account.accountCode} · Registered on ${new Date(
          account.createdAt,
        ).toLocaleDateString("en-GB")}`}
        actions={
          <>
            <AdminBadge tone={entityStatusTone(account.status)}>
              {statusLabel(account.status)}
            </AdminBadge>
            {canUpdate && (
              <>
                <AdminButtonLink href={`/admin/bank-accounts/${account.id}/edit`} variant="secondary">
                  Edit
                </AdminButtonLink>
                <BankAccountStatusForm accountId={account.id} status={account.status} />
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Bank details
          </h2>
          <dl>
            <DataRow label="Bank" value={account.bankName} />
            <DataRow label="Account number" value={<span className="font-mono">{account.accountNumber}</span>} />
            <DataRow label="Account type" value={bankAccountTypeLabel(account.accountType)} />
            <DataRow label="Branch" value={account.branchName ?? "—"} />
            <DataRow label="Currency" value={account.currency} />
            <DataRow
              label="Opening date"
              value={
                account.openingDate
                  ? new Date(account.openingDate).toLocaleDateString("en-GB")
                  : "—"
              }
            />
          </dl>
        </div>

        <div className="space-y-6">
          <AccountBalanceCard openingBalance={account.openingBalance} transactions={transactions} />

          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Notes</h2>
            <p className="text-[13px] leading-6 text-ink">{account.notes ?? "—"}</p>
          </div>
        </div>
      </div>

      <AccountTransactionsPanel
        kind="bank"
        accountId={account.id}
        transactions={transactions}
        targets={targets}
        q={sp.q}
        page={page}
        canPost={canCreate}
      />

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
          Audit metadata
        </h2>
        <dl>
          <DataRow
            label="Created"
            value={`${new Date(account.createdAt).toLocaleString("en-GB")} · ${
              account.createdByName ?? "—"
            }`}
          />
          <DataRow
            label="Last updated"
            value={`${new Date(account.updatedAt).toLocaleString("en-GB")} · ${
              account.updatedByName ?? "—"
            }`}
          />
        </dl>
      </div>

      <Link
        href="/admin/bank-accounts"
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        ← All bank accounts
      </Link>
    </div>
  );
}