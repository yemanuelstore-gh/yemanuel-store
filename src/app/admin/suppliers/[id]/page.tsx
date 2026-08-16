import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { SupplierForm, SupplierProductForm } from "@/components/admin/supplier-forms";
import { AdminEmptyState, AdminTable, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getSupplierById } from "@/lib/admin/suppliers";
import { getVariantsForSelect } from "@/lib/admin/inventory";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS, formatGhanaPhone } from "@/lib/format";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Supplier — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminSupplierDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.suppliers.update);
  const canCreate = hasPermission(session, PERMISSIONS.suppliers.create);
  if (!hasPermission(session, PERMISSIONS.suppliers.read)) {
    return <UnauthorizedPage message="Your account does not have the suppliers.read permission." />;
  }

  const { id } = await params;
  const [supplier, variants] = await Promise.all([getSupplierById(id), getVariantsForSelect()]);
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description={`${supplier.supplierCode} · Since ${new Date(
          supplier.createdAt,
        ).toLocaleDateString("en-GB")}`}
        actions={
          <AdminBadge tone={entityStatusTone(supplier.status)}>
            {statusLabel(supplier.status)}
          </AdminBadge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Details
          </h2>
          <dl>
            <DataRow label="Contact person" value={supplier.contactPerson ?? "—"} />
            <DataRow label="Phone" value={formatGhanaPhone(supplier.phone)} />
            <DataRow label="Email" value={supplier.email ?? "—"} />
            <DataRow label="Website" value={supplier.website ?? "—"} />
            <DataRow
              label="Payment terms"
              value={supplier.paymentTermsDays !== null ? `${supplier.paymentTermsDays} days` : "—"}
            />
            <DataRow label="Notes" value={supplier.notes ?? "—"} />
          </dl>
        </div>
        {canUpdate && (
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Edit supplier
            </h2>
            <SupplierForm
              action="update"
              initial={{
                id: supplier.id,
                name: supplier.name,
                contactPerson: supplier.contactPerson,
                phone: supplier.phone,
                email: supplier.email,
                website: supplier.website,
                status: supplier.status,
                paymentTermsDays: supplier.paymentTermsDays,
                notes: supplier.notes,
              }}
            />
          </div>
        )}
      </div>

      {supplier.contacts.length > 0 && (
        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Contacts</h2>
          </div>
          <AdminTable
            head={
              <>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Primary</Th>
              </>
            }
          >
            {supplier.contacts.map((contact) => (
              <tr key={contact.id} className="transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{contact.name}</Td>
                <Td className="text-ink-soft">{contact.role ?? "—"}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {formatGhanaPhone(contact.phone)}
                </Td>
                <Td className="text-ink-soft">{contact.email ?? "—"}</Td>
                <Td>{contact.isPrimary ? "Yes" : "—"}</Td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}

      {supplier.addresses.length > 0 && (
        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Addresses</h2>
          </div>
          <AdminTable
            head={
              <>
                <Th>Label</Th>
                <Th>Address</Th>
              </>
            }
          >
            {supplier.addresses.map((address) => (
              <tr key={address.id} className="transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{address.label ?? "—"}</Td>
                <Td className="text-ink-soft">
                  {[
                    address.addressLine1,
                    address.addressLine2,
                    address.city,
                    address.regionName,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Supplied variants
          </h2>
        </div>
        {supplier.suppliedVariants.length === 0 ? (
          <AdminEmptyState
            title="No variants linked"
            message="Link product variants to this supplier to track preferred sourcing, lead times and last cost."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Variant</Th>
                <Th>Product</Th>
                <Th>Supplier SKU</Th>
                <Th className="text-right">Last cost</Th>
                <Th className="text-right">Lead time</Th>
                <Th className="text-right">MOQ</Th>
                <Th>Preferred</Th>
              </>
            }
          >
            {supplier.suppliedVariants.map((variant) => (
              <tr key={variant.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <span className="font-medium">{variant.variantName}</span>
                  <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
                    {variant.variantSku}
                  </span>
                </Td>
                <Td className="text-ink-soft">{variant.productName ?? "—"}</Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">
                    {variant.supplierSku ?? "—"}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {variant.lastCost !== null ? formatGHS(variant.lastCost) : "—"}
                </Td>
                <Td className="text-right text-ink-soft">
                  {variant.leadTimeDays !== null ? `${variant.leadTimeDays} days` : "—"}
                </Td>
                <Td className="text-right text-ink-soft">
                  {variant.minimumOrderQuantity ?? "—"}
                </Td>
                <Td>
                  {variant.preferredSupplier ? (
                    <span className="text-xs font-semibold text-navy">Preferred</span>
                  ) : (
                    "—"
                  )}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        {canCreate && (
          <div className="border-t border-line p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Link a variant
            </h3>
            <SupplierProductForm supplierId={supplier.id} variants={variants} />
          </div>
        )}
      </div>

      <Link
        href="/admin/suppliers"
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        ← All suppliers
      </Link>
    </div>
  );
}