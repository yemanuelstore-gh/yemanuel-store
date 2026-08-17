import { redirect } from "next/navigation";
import { AdminShell, type AdminNotification, type AdminBadges } from "@/components/admin/app-shell";
import { navigationForPermissions } from "@/components/admin/navigation";
import { NotStaffPage, UnauthorizedPage } from "@/components/admin/unauthorized";
import { getAuthUser, hasPermission, getAdminSession } from "@/lib/admin/session";
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
    const user = await getAuthUser();
    if (!user) {
      redirect("/admin/login");
    }
    return <NotStaffPage />;
  }

  if (session.staff.status !== "active") {
    return (
      <UnauthorizedPage
        title="Account not active"
        message="Your staff account is not active. Contact a store administrator to restore access."
      />
    );
  }

  const client = await createClient();

  const canSales = hasPermission(session, PERMISSIONS.sales.read);
  const canPurchases = hasPermission(session, PERMISSIONS.purchases.read);
  const canInventory = hasPermission(session, PERMISSIONS.inventory.read);

  const notifications: AdminNotification[] = [];
  const badges: AdminBadges = {};

  // Head-only count queries — cheap enough to run on every admin render.
  const [ordersResult, returnsResult, refundsResult, paymentsResult, invoicesResult, posResult] =
    canSales || canPurchases
      ? await Promise.all([
          canSales
            ? client
                .from("orders")
                .select("id", { count: "exact", head: true })
                .in("status", ["pending", "confirmed", "processing"])
            : Promise.resolve({ count: null }),
          canSales
            ? client.from("returns").select("id", { count: "exact", head: true }).eq("status", "pending")
            : Promise.resolve({ count: null }),
          canSales
            ? client.from("refunds").select("id", { count: "exact", head: true }).eq("status", "pending")
            : Promise.resolve({ count: null }),
          canSales
            ? client.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending")
            : Promise.resolve({ count: null }),
          canPurchases
            ? client
                .from("supplier_invoices")
                .select("id", { count: "exact", head: true })
                .in("status", ["pending", "partially_paid"])
            : Promise.resolve({ count: null }),
          canPurchases
            ? client
                .from("purchase_orders")
                .select("id", { count: "exact", head: true })
                .in("status", ["draft", "sent", "partially_received"])
            : Promise.resolve({ count: null }),
        ])
      : [
          { count: null },
          { count: null },
          { count: null },
          { count: null },
          { count: null },
          { count: null },
        ];

  if (canSales) {
    const ordersInProgress = ordersResult.count ?? 0;
    const returnsPending = returnsResult.count ?? 0;
    const refundsPending = refundsResult.count ?? 0;
    const paymentsPending = paymentsResult.count ?? 0;

    if (ordersInProgress > 0) {
      notifications.push({
        label: "Orders in progress",
        count: ordersInProgress,
        href: "/admin/orders",
      });
    }
    if (returnsPending > 0) {
      notifications.push({
        label: "Returns to review",
        count: returnsPending,
        href: "/admin/returns",
      });
    }
    if (refundsPending > 0) {
      notifications.push({
        label: "Refunds pending",
        count: refundsPending,
        href: "/admin/refunds",
      });
    }

    badges["/admin/orders"] = ordersInProgress;
    badges["/admin/payments"] = paymentsPending;
  }

  if (canPurchases) {
    const invoicesOpen = invoicesResult.count ?? 0;
    const posOpen = posResult.count ?? 0;
    if (invoicesOpen > 0) {
      notifications.push({
        label: "Supplier invoices open",
        count: invoicesOpen,
        href: "/admin/purchases/invoices",
      });
    }
    badges["/admin/purchases/orders"] = posOpen;
  }

  if (canInventory) {
    try {
      const { data } = await client.schema("app").rpc("dashboard_inventory_summary");
      const summary = data as { low_stock_count?: number } | null;
      badges["/admin/inventory"] = Number(summary?.low_stock_count ?? 0);
    } catch (error) {
      console.error("[admin layout] low-stock badge failed:", error);
    }
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
      badges={badges}
    >
      {children}
    </AdminShell>
  );
}