import { AdminBadge } from "@/components/admin/admin-badge";
import {
  AdminEmptyState,
  AdminTable,
  DataRow,
  Pagination,
  SearchForm,
  Td,
  Th,
} from "@/components/admin/ui";
import type { AccountTarget, AccountTransactionResult } from "@/lib/admin/accounts";
import { accountTransactionTypeLabel } from "@/lib/admin/account-constants";
import { accountTransactionTypeTone } from "@/lib/admin/labels";
import { formatGHS } from "@/lib/format";
import { AccountTransactionForm } from "./account-transaction-forms";

function LedgerHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-line bg-canvas/40 px-4 py-2.5">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink">{title}</h2>
    </div>
  );
}

/**
 * Balance summary card: opening balance plus the net of posted transactions.
 */
export function AccountBalanceCard({
  openingBalance,
  transactions,
}: {
  openingBalance: number;
  transactions: Pick<AccountTransactionResult, "balance" | "totalCredits" | "totalDebits">;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="bg-gradient-to-br from-midnight to-midnight-deep px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold-bright" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Current balance
          </h2>
        </div>
        <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums text-white">
          {formatGHS(transactions.balance)}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">
          Opening balance {formatGHS(openingBalance)} · posted ledger, never edited
        </p>
      </div>
      <dl className="px-4 py-2">
        <DataRow label="Opening balance" value={formatGHS(openingBalance)} />
        <DataRow
          label="Total deposits"
          value={<span className="text-navy">{formatGHS(transactions.totalCredits)}</span>}
        />
        <DataRow
          label="Total withdrawals"
          value={<span className="text-danger">{formatGHS(transactions.totalDebits)}</span>}
        />
      </dl>
      <p className="border-t border-line bg-canvas/40 px-4 py-2.5 text-[11px] leading-4 text-ink-faint">
        Current balance = opening balance + deposits − withdrawals. Transactions are posted and
        never edited or deleted — mistakes are corrected with an offsetting transaction.
      </p>
    </div>
  );
}

/**
 * Post-transaction form and paginated transaction history for one account.
 */
export function AccountTransactionsPanel({
  kind,
  accountId,
  transactions,
  targets,
  q,
  page,
  canPost,
}: {
  kind: "bank" | "mobile_money";
  accountId: string;
  transactions: AccountTransactionResult;
  targets: AccountTarget[];
  q?: string;
  page: number;
  canPost: boolean;
}) {
  const basePath =
    kind === "bank"
      ? `/admin/bank-accounts/${accountId}`
      : `/admin/mobile-money/${accountId}`;
  const filterParams = new URLSearchParams();
  if (q) filterParams.set("q", q);

  return (
    <div className="space-y-6">
      {canPost && (
        <div className="rounded-lg border border-line bg-white">
          <LedgerHeader title="Post a transaction" />
          <div className="p-5">
            <AccountTransactionForm accountKind={kind} accountId={accountId} targets={targets} />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/40 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink">
              Transactions
            </h2>
          </div>
          <SearchForm placeholder="Search code or reference…" initialValue={q ?? ""} />
        </div>

        {transactions.rows.length === 0 ? (
          <AdminEmptyState
            title="No transactions found"
            message={
              q
                ? "Try a different search term."
                : "Post a deposit, withdrawal or transfer to get started."
            }
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Code</Th>
                <Th>Type</Th>
                <Th>Details</Th>
                <Th>Reference</Th>
                <Th>Date</Th>
                <Th className="text-right">Amount</Th>
              </>
            }
          >
            {transactions.rows.map((tx) => (
              <tr key={tx.id} className="align-top transition-colors hover:bg-navy-soft/40">
                <Td className="whitespace-nowrap font-mono text-xs text-ink-soft">
                  {tx.transactionCode}
                </Td>
                <Td>
                  <AdminBadge tone={accountTransactionTypeTone(tx.transactionType)}>
                    {accountTransactionTypeLabel(tx.transactionType)}
                  </AdminBadge>
                </Td>
                <Td className="text-ink-soft">
                  {tx.counterpartyName ? (
                    <>
                      <span className="text-ink-faint">
                        {tx.direction === "in" ? "From" : "To"}
                      </span>{" "}
                      <span className="font-medium text-ink">{tx.counterpartyName}</span>{" "}
                      <span className="whitespace-nowrap font-mono text-xs text-ink-faint">
                        {tx.counterpartyCode}
                      </span>
                    </>
                  ) : (
                    <span className="text-ink-faint">
                      {tx.direction === "in" ? "Cash / external in" : "Cash / external out"}
                    </span>
                  )}
                </Td>
                <Td className="text-ink-soft">{tx.reference ?? "—"}</Td>
                <Td className="whitespace-nowrap text-xs text-ink-soft">
                  {new Date(tx.createdAt).toLocaleString("en-GB")}
                </Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  <span className={tx.direction === "in" ? "text-navy" : "text-danger"}>
                    {tx.direction === "in" ? "+" : "−"}
                    {formatGHS(tx.amount)}
                  </span>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={20}
          total={transactions.total}
          basePath={basePath}
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}