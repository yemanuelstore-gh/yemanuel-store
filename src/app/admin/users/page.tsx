import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { listUsers, PAGE_SIZE } from "@/lib/admin/admin";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users — Yemanuel Store ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.settings.manage)) {
    return (
      <PageContainer>
        <PageHeader
          title="Users"
          breadcrumb={[{ label: "Administration" }, { label: "Users" }]}
        />
        <NoAccess module="user management" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listUsers(client, { page, pageSize: PAGE_SIZE, q });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        description="Staff accounts and the roles assigned to them."
        breadcrumb={[{ label: "Administration" }, { label: "Users" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/users"
          q={q}
          searchPlaceholder="Search name or phone…"
          count={`${total.toLocaleString()} user${total === 1 ? "" : "s"}`}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="admin"
            title="No users found"
            description={q ? "Try adjusting your search." : "User accounts will appear here."}
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>User</TH>
                  <TH>Phone</TH>
                  <TH>Roles</TH>
                  <TH>Joined</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((user) => (
                  <TR key={user.id}>
                    <TD className="font-medium text-erp-text">{user.full_name ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {user.phone ?? "—"}
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-erp-text-muted">No role</span>
                        ) : (
                          user.roles.map((role) => (
                            <span
                              key={role}
                              className="inline-flex items-center rounded-full border border-erp-border bg-erp-canvas px-2 py-0.5 text-[11px] font-medium text-erp-navy"
                            >
                              {role}
                            </span>
                          ))
                        )}
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(user.created_at)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination params={urlParams} page={page} total={total} />
          </>
        )}
      </Card>
    </PageContainer>
  );
}