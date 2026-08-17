import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { StaffForm, StaffRolesForm } from "@/components/admin/staff-forms";
import { DataRow, PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getRoles, getStaffById } from "@/lib/admin/staff";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { staffStatusTone, statusLabel } from "@/lib/admin/labels";
import { formatGhanaPhone } from "@/lib/format";

export const metadata: Metadata = {
  title: "Staff member — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminStaffDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.staff.manage)) {
    return (
      <UnauthorizedPage message="Your account does not have the staff.manage permission." />
    );
  }

  const { id } = await params;
  const [staff, roles] = await Promise.all([getStaffById(id), getRoles()]);
  if (!staff) notFound();

  const isSelf = staff.profileId === session.userId;

  return (
    <div className="space-y-6">
      <PageHeader
        title={staff.fullName}
        description={`${staff.employeeCode} · ${staff.position}`}
        actions={
          <AdminBadge tone={staffStatusTone(staff.status)}>
            {statusLabel(staff.status)}
          </AdminBadge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Details
          </h2>
          <dl>
            <DataRow label="Employee code" value={staff.employeeCode} />
            <DataRow label="Email" value={staff.email} />
            <DataRow
              label="Phone"
              value={staff.phone ? formatGhanaPhone(staff.phone) : "—"}
            />
            <DataRow label="Position" value={staff.position} />
            <DataRow
              label="Hire date"
              value={
                staff.hireDate
                  ? new Date(staff.hireDate).toLocaleDateString("en-GB")
                  : "—"
              }
            />
            <DataRow label="Notes" value={staff.notes ?? "—"} />
            <DataRow
              label="Account created"
              value={new Date(staff.createdAt).toLocaleDateString("en-GB")}
            />
          </dl>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Edit staff member
          </h2>
          <StaffForm
            roles={roles}
            initial={{
              id: staff.id,
              profileId: staff.profileId,
              fullName: staff.fullName,
              phone: staff.phone,
              position: staff.position,
              status: staff.status,
              hireDate: staff.hireDate,
              notes: staff.notes,
            }}
          />
          {isSelf && (
            <p className="mt-3 text-[11px] leading-4 text-ink-faint">
              You cannot deactivate your own account.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
          Roles
        </h2>
        <p className="mb-3 text-xs leading-5 text-ink-soft">
          Roles bundle permissions. Assigning a role grants the staff member access to
          the sections covered by that role&apos;s permissions.
        </p>
        <StaffRolesForm
          staffId={staff.id}
          roles={roles}
          assignedRoleIds={staff.roles.map((role) => role.id)}
        />
      </div>

      <Link
        href="/admin/staff"
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        ← All staff
      </Link>
    </div>
  );
}