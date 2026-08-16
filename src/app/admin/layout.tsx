import { redirect } from "next/navigation";
import { AdminShell, type AdminNotification } from "@/components/admin/app-shell";
import { navigationForPermissions } from "@/components/admin/navigation";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!isSupabaseConfigured() || session === null) {
    redirect("/login?next=/admin");
  }

  if (session.staff.status !== "active") {
    return (
      <UnauthorizedPage
        title="Account not active"
        message="Your staff account is not active. Contact a store administrator to restore access."
      />
    );
  }

  const notifications: AdminNotification[] = [];
  if (hasPermission(session, PERMISSIONS.sales.read)) {
    const client = await createClient();
    const [orders, returns, refunds] = await Promise.all([
      client
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "confirmed", "processing"]),
      client.from("returns").select("id", { count: "exact", head: true }).eq("status", "pending"),
      client.from("refunds").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    notifications.push({
      label: "Orders in progress",
      count: orders.count ?? 0,
      href: "/admin/orders",
    });
    notifications.push({
      label: "Returns to review",
      count: returns.count ?? 0,
      href: "/admin/returns",
    });
    notifications.push({
      label: "Refunds pending",
      count: refunds.count ?? 0,
      href: "/admin/refunds",
    });
  }
  if (hasPermission(session, PERMISSIONS.purchases.read)) {
    const client = await createClient();
    const invoices = await client
      .from("supplier_invoices")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "partially_paid"]);
    notifications.push({
      label: "Supplier invoices open",
      count: invoices.count ?? 0,
      href: "/admin/purchases/invoices",
    });
  }

  return (
    <AdminShell
      sections={navigationForPermissions(session.permissions)}
      session={{
        userId: session.userId,
        email: session.email,
        fullName: session.fullName,
        position: session.staff.position,
        employeeCode: session.staff.employeeCode,
      }}
      notifications={notifications.filter((n) => n.count > 0)}
    >
      {children}
    </AdminShell>
  );
}