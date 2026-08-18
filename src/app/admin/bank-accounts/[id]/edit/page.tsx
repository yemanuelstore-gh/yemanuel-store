import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BankAccountForm } from "@/components/admin/finance/account-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getBankAccountById } from "@/lib/admin/accounts";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Edit Bank Account — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditBankAccountPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.expenses.update)) {
    return <UnauthorizedPage message="Your account does not have the expenses.update permission." />;
  }

  const { id } = await params;
  const account = await getBankAccountById(id);
  if (!account) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Bank Account"
        description={`${account.accountName} · ${account.accountCode}`}
      />
      <section className="rounded-lg border border-line bg-white p-5">
        <BankAccountForm
          action="update"
          initial={{
            id: account.id,
            accountName: account.accountName,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountType: account.accountType,
            branchName: account.branchName,
            currency: account.currency,
            openingBalance: account.openingBalance,
            openingDate: account.openingDate,
            status: account.status,
            notes: account.notes,
          }}
        />
      </section>
    </div>
  );
}