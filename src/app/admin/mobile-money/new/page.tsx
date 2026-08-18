import type { Metadata } from "next";
import { MobileMoneyForm } from "@/components/admin/finance/account-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "New Mobile Money Account — Yemanuel Store Admin",
};

export default async function AdminNewMobileMoneyAccountPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.expenses.create)) {
    return <UnauthorizedPage message="Your account does not have the expenses.create permission." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Mobile Money Account"
        description="Register a mobile money account used to receive and make payments."
      />
      <section className="rounded-lg border border-line bg-white p-5">
        <MobileMoneyForm action="create" />
      </section>
    </div>
  );
}