import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { ContentSection } from "@/components/admin/content-section";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { getOrderByNumber, customerDisplayName } from "@/lib/admin/sales";
import {
  CHANNEL_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  labelFor,
} from "@/lib/admin/labels";
import { formatGHS, formatDateTime, formatGhanaPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `${orderNumber} — Yemanuel ERP` };
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
        {label}
      </dt>
      <dd className={`mt-0.5 text-[13px] text-erp-text ${mono ? "tabular-nums" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function TotalRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className={emphasis ? "font-semibold text-erp-text" : "text-erp-text-secondary"}>
        {label}
      </span>
      <span className={`tabular-nums ${emphasis ? "text-base font-semibold text-erp-navy" : "text-erp-text"}`}>
        {value}
      </span>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await getAdminSession();
  const { orderNumber } = await params;

  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return (
      <PageContainer>
        <PageHeader title={orderNumber} />
        <NoAccess module="orders" />
      </PageContainer>
    );
  }

  const client = await createClient();
  const order = await getOrderByNumber(client, orderNumber);
  if (!order) notFound();

  const customerName = customerDisplayName(order.customers, order.guest_name);

  return (
    <PageContainer>
      <PageHeader
        title={order.order_number}
        description={`${labelFor(order.channel, CHANNEL_LABELS)} order · ${formatDateTime(order.created_at)}`}
        breadcrumb={[
          { label: "Sales" },
          { label: "Orders", href: "/admin/orders" },
          { label: order.order_number },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={labelFor(order.status, ORDER_STATUS_LABELS)} />
        <StatusBadge status={labelFor(order.payment_status, PAYMENT_STATUS_LABELS)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          <ContentSection title="Items" description={`${order.items.length} line${order.items.length === 1 ? "" : "s"}`}>
            {order.items.length === 0 ? (
              <EmptyState icon="products" title="No items" description="This order has no line items." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Product</TH>
                    <TH>Variant / SKU</TH>
                    <TH className="text-right">Qty</TH>
                    <TH className="text-right">Unit price</TH>
                    <TH className="text-right">Line total</TH>
                  </TR>
                </THead>
                <TBody>
                  {order.items.map((item, index) => (
                    <TR key={`${item.sku}-${index}`}>
                      <TD className="font-medium text-erp-text">{item.product_name}</TD>
                      <TD className="text-erp-text-secondary">
                        {[item.variant_name, item.sku].filter(Boolean).join(" · ") || "—"}
                      </TD>
                      <TD className="text-right tabular-nums text-erp-text-secondary">
                        {Number(item.quantity || 0)}
                      </TD>
                      <TD className="text-right tabular-nums">{formatGHS(Number(item.unit_price || 0))}</TD>
                      <TD className="text-right font-medium tabular-nums">
                        {formatGHS(Number(item.line_total || 0))}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </ContentSection>

          <ContentSection title="Payments" description={`${order.payments.length} payment${order.payments.length === 1 ? "" : "s"} on this order`}>
            {order.payments.length === 0 ? (
              <EmptyState icon="payments" title="No payments" description="No payments have been recorded for this order." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Method</TH>
                    <TH>Reference</TH>
                    <TH className="text-right">Amount</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {order.payments.map((payment, index) => (
                    <TR key={`${payment.reference}-${index}`}>
                      <TD className="whitespace-nowrap text-erp-text-secondary">
                        {formatDateTime(payment.payment_date)}
                      </TD>
                      <TD>{labelFor(payment.method, PAYMENT_METHOD_LABELS)}</TD>
                      <TD className="text-erp-text-secondary">{payment.reference || "—"}</TD>
                      <TD className="text-right font-medium tabular-nums">
                        {formatGHS(Number(payment.amount || 0))}
                      </TD>
                      <TD>
                        <StatusBadge status={labelFor(payment.status, PAYMENT_STATUS_LABELS)} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </ContentSection>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="border-b border-erp-border px-4 py-3">
              <h3 className="text-[13px] font-semibold text-erp-text">Customer</h3>
            </div>
            <dl className="space-y-3 px-4 py-3">
              <DetailField label="Name" value={customerName} />
              <DetailField label="Email" value={order.customers?.email ?? "—"} />
              <DetailField label="Phone" value={formatGhanaPhone(order.customers?.phone ?? "")} />
            </dl>
          </Card>

          <Card>
            <div className="border-b border-erp-border px-4 py-3">
              <h3 className="text-[13px] font-semibold text-erp-text">Billing</h3>
            </div>
            <dl className="space-y-3 px-4 py-3">
              <DetailField label="Recipient" value={order.bill_to_recipient || "—"} />
              <DetailField label="Phone" value={formatGhanaPhone(order.bill_to_phone ?? "")} />
              <DetailField label="City" value={order.bill_to_city || "—"} />
              <DetailField label="Region" value={order.bill_to_region || "—"} />
            </dl>
          </Card>

          <Card>
            <div className="border-b border-erp-border px-4 py-3">
              <h3 className="text-[13px] font-semibold text-erp-text">Delivery</h3>
            </div>
            <dl className="space-y-3 px-4 py-3">
              <DetailField label="Method" value={order.delivery_method_name || "—"} />
              <DetailField label="Recipient" value={order.delivery_recipient || "—"} />
              <DetailField label="Phone" value={formatGhanaPhone(order.delivery_phone ?? "")} />
              <DetailField label="City" value={order.delivery_city || "—"} />
              <DetailField label="Region" value={order.delivery_region || "—"} />
            </dl>
          </Card>

          <Card>
            <div className="border-b border-erp-border px-4 py-3">
              <h3 className="text-[13px] font-semibold text-erp-text">Totals</h3>
            </div>
            <div className="space-y-2 px-4 py-3">
              <TotalRow label="Subtotal" value={formatGHS(Number(order.subtotal || 0))} />
              <TotalRow label="Discount" value={`− ${formatGHS(Number(order.discount_total || 0))}`} />
              <TotalRow label="Delivery fee" value={formatGHS(Number(order.delivery_fee || 0))} />
              <TotalRow label="Tax" value={formatGHS(Number(order.tax_amount || 0))} />
              <div className="my-1 border-t border-erp-border" />
              <TotalRow label="Total" value={formatGHS(Number(order.total_amount || 0))} emphasis />
            </div>
          </Card>
        </div>
      </div>

      {order.notes && (
        <Card className="mt-4 p-4">
          <h3 className="text-[13px] font-semibold text-erp-text">Notes</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-erp-text-secondary">{order.notes}</p>
        </Card>
      )}

      <p className="mt-4 text-xs text-erp-text-muted">
        <Link href="/admin/orders" className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy">
          ← Back to orders
        </Link>
      </p>
    </PageContainer>
  );
}