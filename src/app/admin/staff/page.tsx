import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { StaffForm } from "@/components/admin/staff-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  SearchForm,
  Select,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getRoles, getStaffList } from "@/lib/admin/staff";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { staffStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Staff — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; status?: string; role?: string; page?: string }>;

export default async function AdminStaffPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.staff.manage)) {
    return (
      <UnauthorizedPage message="Your account does not have the staff.manage permission." />
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [staffResult, roles] = await Promise.all([
    getStaffList({ q: params.q, status: params.status, roleId: params.role, page }),
    getRoles(),
  ]);

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.status) filterParams.set("status", params.status);
  if (params.role) filterParams.set("role", params.role);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff"
        description={`${staffResult.total} staff member${staffResult.total === 1 ? "" : "s"} on record.`}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search staff…"
            initialValue={params.q ?? ""}
            extraFields={
              <>
                <Select
                  name="status"
                  defaultValue={params.status ?? ""}
                  aria-label="Filter by status"
                  className="w-32"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Select>
                <Select
                  name="role"
                  defaultValue={params.role ?? ""}
                  aria-label="Filter by role"
                  className="w-40"
                >
                  <option value="">All roles</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </>
            }
          />
        </div>
        {staffResult.staff.length === 0 ? (
          <AdminEmptyState
            title="No staff found"
            message="Try a different search, or add your first staff member."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Employee</Th>
                <Th>Position</Th>
                <Th>Roles</Th>
                <Th>Hire date</Th>
                <Th>Status</Th>
              </>
            }
          >
            {staffResult.staff.map((member) => (
              <tr key={member.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/staff/${member.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {member.fullName}
                  </Link>
                  <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
                    {member.employeeCode}
                  </span>
                </Td>
                <Td className="text-ink-soft">{member.position}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {member.roles.length === 0 ? (
                      <span className="text-xs text-ink-faint">No roles</span>
                    ) : (
                      member.roles.map((role) => (
                        <span
                          key={role.id}
                          className="rounded bg-navy-soft/60 px-1.5 py-0.5 text-[11px] font-medium text-navy"
                        >
                          {role.name}
                        </span>
                      ))
                    )}
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {member.hireDate
                    ? new Date(member.hireDate).toLocaleDateString("en-GB")
                    : "—"}
                </Td>
                <Td>
                  <AdminBadge tone={staffStatusTone(member.status)}>
                    {statusLabel(member.status)}
                  </AdminBadge>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination
          page={page}
          pageSize={25}
          total={staffResult.total}
          basePath="/admin/staff"
          searchParams={filterParams}
        />
      </div>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
          New staff member
        </h2>
        <StaffForm roles={roles} />
      </section>
    </div>
  );
}