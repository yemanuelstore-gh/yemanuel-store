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
import { listSettings, PAGE_SIZE } from "@/lib/admin/admin";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings — Yemanuel ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.settings.manage)) {
    return (
      <PageContainer>
        <PageHeader
          title="Settings"
          breadcrumb={[{ label: "Administration" }, { label: "Settings" }]}
        />
        <NoAccess module="settings" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listSettings(client, { page, pageSize: PAGE_SIZE, q });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Store configuration values."
        breadcrumb={[{ label: "Administration" }, { label: "Settings" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/settings"
          q={q}
          searchPlaceholder="Search key or description…"
          count={`${total.toLocaleString()} setting${total === 1 ? "" : "s"}`}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="settings"
            title="No settings found"
            description={
              q
                ? "Try adjusting your search."
                : "Store settings will appear here once configured."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Key</TH>
                  <TH>Value</TH>
                  <TH>Description</TH>
                  <TH>Location</TH>
                  <TH>Updated</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((setting) => (
                  <TR key={setting.id}>
                    <TD className="font-mono text-[12px] font-medium text-erp-navy">
                      {setting.key}
                    </TD>
                    <TD className="max-w-48">
                      <span className="block truncate text-erp-text-secondary">
                        {setting.value ?? "—"}
                      </span>
                    </TD>
                    <TD className="max-w-72">
                      <span className="block truncate text-erp-text-secondary">
                        {setting.description ?? "—"}
                      </span>
                    </TD>
                    <TD className="text-erp-text-secondary">
                      {setting.locations?.name ?? "Global"}
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(setting.updated_at)}
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