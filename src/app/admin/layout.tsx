import Link from "next/link";
import { ErpShell } from "@/components/admin/erp-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getAuthUser, getAdminSession, hasAnyPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

function SignInPrompt() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-erp-canvas p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg bg-erp-gold font-display text-lg font-bold text-erp-navy-deep">
            Y
          </div>
          <h1 className="text-xl font-semibold text-erp-text">Yemanuel Store ERP</h1>
          <p className="mt-1 text-sm text-erp-text-secondary">
            Sign in to access the store management workspace.
          </p>
        </div>
        <EmptyState
          icon="admin"
          title="Management workspace"
          description="You need to sign in as a staff member to view the dashboard."
          action={
            <Button size="sm" variant="gold">
              <Link href="/login?next=/admin">Sign in</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}

function Unauthorized({ email }: { email: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-erp-canvas p-6">
      <div className="w-full max-w-md">
        <EmptyState
          icon="roles"
          title="No management access"
          description="Your account does not have staff permissions in the Yemanuel Store workspace."
          action={
            <Button size="sm" variant="secondary">
              <Link href="/">Back to the store</Link>
            </Button>
          }
        />
        {email && (
          <p className="mt-4 text-center text-xs text-erp-text-muted">
            Signed in as {email}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, authUser] = await Promise.all([
    getAdminSession(),
    getAuthUser(),
  ]);

  if (!session) {
    if (!authUser) {
      return <SignInPrompt />;
    }
    return <Unauthorized email={authUser.email} />;
  }

  if (session.staff.status !== "active") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-erp-canvas p-6">
        <div className="w-full max-w-md">
          <Alert variant="warning" title="Account inactive">
            Your staff account is not active. Contact the store administrator.
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <ErpShell
      breadcrumb={
        <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }]} />
      }
      user={{ name: session.fullName ?? session.email, role: session.staff.position }}
      canAccessAdmin={hasAnyPermission(session, [
        PERMISSIONS.settings.manage,
        PERMISSIONS.audit.view,
      ])}
    >
      {children}
    </ErpShell>
  );
}