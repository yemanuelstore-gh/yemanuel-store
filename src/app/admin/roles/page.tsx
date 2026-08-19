import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { listRoles, listPermissions } from "@/lib/admin/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roles & Permissions — Yemanuel ERP",
};

export default async function RolesPage() {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.settings.manage)) {
    return (
      <PageContainer>
        <PageHeader
          title="Roles & Permissions"
          breadcrumb={[{ label: "Administration" }, { label: "Roles & Permissions" }]}
        />
        <NoAccess module="roles and permissions" />
      </PageContainer>
    );
  }

  const client = await createClient();
  const [roles, permissions] = await Promise.all([listRoles(client), listPermissions(client)]);

  return (
    <PageContainer>
      <PageHeader
        title="Roles & Permissions"
        description="Access roles and the permission codes granted to each."
        breadcrumb={[{ label: "Administration" }, { label: "Roles & Permissions" }]}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-erp-border px-4 py-3">
          <h2 className="text-sm font-semibold text-erp-text">
            Roles
            <span className="ml-2 font-normal text-erp-text-muted">
              {roles.length} role{roles.length === 1 ? "" : "s"}
            </span>
          </h2>
        </div>
        {roles.length === 0 ? (
          <EmptyState
            icon="roles"
            title="No roles yet"
            description="Roles define what each user can access in the ERP."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Role</TH>
                <TH>Code</TH>
                <TH>Description</TH>
                <TH>Permissions</TH>
                <TH>System</TH>
              </TR>
            </THead>
            <TBody>
              {roles.map((role) => (
                <TR key={role.id}>
                  <TD className="font-medium text-erp-text">{role.name}</TD>
                  <TD className="font-mono text-[12px] text-erp-navy">{role.code}</TD>
                  <TD className="max-w-96">
                    <span className="block truncate text-erp-text-secondary">
                      {role.description ?? "—"}
                    </span>
                  </TD>
                  <TD className="tabular-nums text-erp-text-secondary">
                    {role.permission_count}
                  </TD>
                  <TD>
                    <StatusBadge status={role.is_system ? "System" : "Custom"} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-erp-border px-4 py-3">
          <h2 className="text-sm font-semibold text-erp-text">
            Permissions
            <span className="ml-2 font-normal text-erp-text-muted">
              {permissions.length} permission{permissions.length === 1 ? "" : "s"}
            </span>
          </h2>
        </div>
        {permissions.length === 0 ? (
          <EmptyState
            icon="roles"
            title="No permissions defined"
            description="Permission codes used by the authorization layer."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Code</TH>
                <TH>Description</TH>
              </TR>
            </THead>
            <TBody>
              {permissions.map((permission) => (
                <TR key={permission.id}>
                  <TD className="font-mono text-[12px] text-erp-navy">{permission.code}</TD>
                  <TD className="max-w-96">
                    <span className="block truncate text-erp-text-secondary">
                      {permission.description ?? "—"}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}