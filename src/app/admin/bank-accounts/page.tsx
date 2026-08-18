import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { BankAccountStatusForm } from "@/components/admin/finance/account-forms";
import { AccountSummaryCards } from "@/components/admin/finance/account-summary";
import {
  AdminButtonLink,
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  SearchForm,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getBankAccounts, getBankAccountSummary } from "@/lib/admin/accounts";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";
import {
  BANK_ACCOUNT_TYPES,
  bankAccountTypeLabel,
  maskAccountNumber,
} from "@/lib/admin/account-constants";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Bank Accounts — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; status?: string; type?: string; page?: string }>;

export default async function AdminBankAccountsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.expenses.read)) {
    return <UnauthorizedPage message="Your account does not have the expenses.read permission." />;
  }
  const canUpdate = hasPermission(session, PERMISSIONS.expenses.update);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [summary, result] = await Promise.all([
    getBankAccountSummary(),
    getBankAccounts({ q: params.q, status: params.status, accountType: params.type, page }),
  ]);

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.status) filterParams.set("status", params.status);
  if (params.type) filterParams.set("type", params.type);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bank Accounts"
        description="The business bank accounts used to receive and make payments."
        actions={
          canUpdate ? (
            <AdminButtonLink href="/admin/bank-accounts/new">New bank account</AdminButtonLink>
          ) : undefined
        }
      />

      <AccountSummaryCards
        total={summary.total}
        active={summary.active}
        totalBalance={formatGHS(summary.totalBalance)}
        fourth={{ label: "Inactive accounts", value: String(summary.inactive) }}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search name, code, bank or number…"
            initialValue={params.q ?? ""}
            extraFields={
              <>
                <select
                  name="status"
                  defaultValue={params.status ?? ""}
                  aria-label="Filter by status"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  name="type"
                  defaultValue={params.type ?? ""}
                  aria-label="Filter by account type"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All types</option>
                  {BANK_ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {bankAccountTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </>
            }
          />
        </div>

        {result.accounts.length === 0 ? (
          <AdminEmptyState
            title="No bank accounts found"
            message="Try a different search, or create the first bank account."
            actionHref={canUpdate ? "/admin/bank-accounts/new" : undefined}
            actionLabel={canUpdate ? "New bank account" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Account</Th>
                <Th>Code</Th>
                <Th>Bank</Th>
                <Th>Account number</Th>
                <Th>Type</Th>
                <Th>Opened</Th>
                <Th>Currency</Th>
                <Th className="text-right">Balance</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </>
            }
          >
            {result.accounts.map((account) => (
              <tr key={account.id} className="align-top transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/bank-accounts/${account.id}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {account.accountName}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap font-mono text-xs text-ink-soft">
                  {account.accountCode}
                </Td>
                <Td className="text-ink-soft">{account.bankName}</Td>
                <Td className="whitespace-nowrap font-mono text-xs text-ink-soft">
                  {maskAccountNumber(account.accountNumber)}
                </Td>
                <Td className="text-ink-soft">{bankAccountTypeLabel(account.accountType)}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {account.openingDate
                    ? new Date(account.openingDate).toLocaleDateString("en-GB")
                    : "—"}
                </Td>
                <Td className="text-ink-soft">{account.currency}</Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(account.balance)}
                </Td>
                <Td>
                  <AdminBadge tone={entityStatusTone(account.status)}>
                    {statusLabel(account.status)}
                  </AdminBadge>
                </Td>
                <Td>
                  <div className="flex flex-col items-start gap-1.5">
                    <Link
                      href={`/admin/bank-accounts/${account.id}`}
                      className="text-xs font-medium text-navy hover:underline"
                    >
                      View
                    </Link>
                    {canUpdate && (
                      <>
                        <Link
                          href={`/admin/bank-accounts/${account.id}/edit`}
                          className="text-xs font-medium text-navy hover:underline"
                        >
                          Edit
                        </Link>
                        <BankAccountStatusForm accountId={account.id} status={account.status} />
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/bank-accounts"
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}