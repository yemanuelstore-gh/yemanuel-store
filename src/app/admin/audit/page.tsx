import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { listAuditLogs, PAGE_SIZE } from "@/lib/admin/admin";
import { humanize } from "@/lib/admin/labels";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit Log — Yemanuel Store ERP",
};

const ACTIONS = ["create", "update", "delete", "login", "logout", "approve", "cancel"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.audit.view)) {
    return (
      <PageContainer>
        <PageHeader
          title="Audit Log"
          breadcrumb={[{ label: "Administration" }, { label: "Audit Log" }]}
        />
        <NoAccess module="audit log" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const action = firstParam(params.action);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listAuditLogs(client, {
    page,
    pageSize: PAGE_SIZE,
    q,
    action,
  });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (action) urlParams.set("action", action);

  return (
    <PageContainer>
      <PageHeader
        title="Audit Log"
        description="Actions performed across the system."
        breadcrumb={[{ label: "Administration" }, { label: "Audit Log" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/audit"
          q={q}
          searchPlaceholder="Search action, entity or actor…"
          count={`${total.toLocaleString()} entry${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "action",
              label: "action",
              value: action,
              options: ACTIONS.map((value) => ({ value, label: humanize(value) })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="audit"
            title="No audit entries found"
            description={
              q || action
                ? "Try adjusting your search or filters."
                : "System actions will be recorded here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Action</TH>
                  <TH>Entity</TH>
                  <TH>Entity ID</TH>
                  <TH>Actor</TH>
                  <TH>Details</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((entry) => (
                  <TR key={entry.id}>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDateTime(entry.created_at)}
                    </TD>
                    <TD>
                      <StatusBadge status={humanize(entry.action ?? "unknown")} />
                    </TD>
                    <TD className="text-erp-text-secondary">{entry.entity_type ?? "—"}</TD>
                    <TD className="max-w-40">
                      <span className="block truncate font-mono text-[12px] text-erp-text-secondary">
                        {entry.entity_id ?? "—"}
                      </span>
                    </TD>
                    <TD className="max-w-36">
                      <span className="block truncate font-mono text-[12px] text-erp-text-secondary">
                        {entry.actor_id ?? "system"}
                      </span>
                    </TD>
                    <TD className="max-w-56">
                      {entry.metadata ? (
                        <span className="block truncate font-mono text-[12px] text-erp-text-muted">
                          {JSON.stringify(entry.metadata)}
                        </span>
                      ) : (
                        "—"
                      )}
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