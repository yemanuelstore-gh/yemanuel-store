import type { Metadata } from "next";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  DeliveryMethodEditForm,
  DeliveryMethodForm,
  DeliveryRateForm,
  LocationForm,
  LocationStatusForm,
  SettingForm,
} from "@/components/admin/settings-forms";
import { AdminEmptyState, AdminTable, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import {
  getDeliveryMethods,
  getDeliveryRates,
  getLocations,
  getRegions,
  getSettings,
} from "@/lib/admin/settings";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Settings — Yemanuel Store Admin",
};

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.settings.manage)) {
    return (
      <UnauthorizedPage message="Your account does not have the settings.manage permission." />
    );
  }

  const [locations, deliveryMethods, deliveryRates, settings, regions] = await Promise.all([
    getLocations(),
    getDeliveryMethods(),
    getDeliveryRates(),
    getSettings(),
    getRegions(),
  ]);

  const ratesByMethod = deliveryRates.reduce<
    Record<string, typeof deliveryRates>
  >((groups, rate) => {
    (groups[rate.deliveryMethodName] ??= []).push(rate);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Locations, delivery methods and store settings."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Locations
            </h2>
          </div>
          {locations.length === 0 ? (
            <AdminEmptyState title="No locations yet" message="Add your first store or warehouse." />
          ) : (
            <AdminTable
              head={
                <>
                  <Th>Code</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Region</Th>
                  <Th>City</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </>
              }
            >
              {locations.map((location) => (
                <tr key={location.id} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <span className="font-mono text-xs text-ink-soft">{location.code}</span>
                  </Td>
                  <Td className="font-medium">{location.name}</Td>
                  <Td className="text-ink-soft">{location.locationType}</Td>
                  <Td className="text-ink-soft">{location.regionName ?? "—"}</Td>
                  <Td className="text-ink-soft">{location.city}</Td>
                  <Td>
                    <AdminBadge tone={entityStatusTone(location.status)}>
                      {statusLabel(location.status)}
                    </AdminBadge>
                  </Td>
                  <Td>
                    <LocationStatusForm locationId={location.id} current={location.status} />
                  </Td>
                </tr>
              ))}
            </AdminTable>
          )}
          <div className="border-t border-line p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Add location
            </h3>
            <LocationForm
              regions={regions.map((region) => ({ id: region.id, name: region.name }))}
            />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Delivery methods
            </h2>
          </div>
          {deliveryMethods.length === 0 ? (
            <AdminEmptyState
              title="No delivery methods yet"
              message="Add the delivery options offered to customers."
            />
          ) : (
            <div className="divide-y divide-line">
              {deliveryMethods.map((method) => (
                <div key={method.id} className="px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{method.name}</span>
                    <span className="font-mono text-[11px] text-ink-faint">{method.code}</span>
                  </div>
                  <DeliveryMethodEditForm
                    method={{
                      id: method.id,
                      name: method.name,
                      kind: method.kind,
                      isActive: method.isActive,
                      sortOrder: method.sortOrder,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-line p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Add delivery method
            </h3>
            <DeliveryMethodForm />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Delivery rates
          </h2>
        </div>
        {deliveryRates.length === 0 ? (
          <AdminEmptyState
            title="No delivery rates yet"
            message="Rates are created automatically when you add a delivery method."
          />
        ) : (
          <div className="divide-y divide-line">
            {Object.entries(ratesByMethod).map(([methodName, rates]) => (
              <div key={methodName} className="px-4 py-3">
                <p className="mb-2 text-sm font-semibold">{methodName}</p>
                <div className="space-y-2">
                  {rates.map((rate) => (
                    <div
                      key={rate.id}
                      className="rounded-md border border-line bg-paper/60 px-3 py-2"
                    >
                      <DeliveryRateForm
                        rate={{
                          id: rate.id,
                          regionName: rate.regionName,
                          fee: rate.fee,
                          etaMinDays: rate.etaMinDays,
                          etaMaxDays: rate.etaMaxDays,
                          isActive: rate.isActive,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="border-t border-line px-4 py-3 text-[11px] leading-5 text-ink-faint">
          Checkout fees and delivery ETA are quoted from these rates by region.
          Inactive rates are never offered to customers.
        </p>
      </section>

      <section className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Store settings
          </h2>
        </div>
        {settings.length > 0 && (
          <AdminTable
            head={
              <>
                <Th>Key</Th>
                <Th>Value</Th>
                <Th>Description</Th>
              </>
            }
          >
            {settings.map((setting) => (
              <tr key={setting.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <span className="font-mono text-xs text-ink-soft">{setting.key}</span>
                </Td>
                <Td className="font-medium">{setting.value}</Td>
                <Td className="text-ink-soft">{setting.description ?? "—"}</Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <div className="border-t border-line p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Add or update a setting
          </h3>
          <SettingForm />
          <p className="mt-3 text-[11px] leading-5 text-ink-faint">
            Manual payment details shown to customers at checkout:
            <code className="mx-1 font-mono">payments.momo_number</code> and{" "}
            <code className="mx-1 font-mono">payments.momo_name</code> (mobile
            money),{" "}
            <code className="mx-1 font-mono">payments.bank_number</code> and{" "}
            <code className="mx-1 font-mono">payments.bank_name</code> (bank
            transfer).
          </p>
        </div>
      </section>

      <p className="text-[11px] text-ink-faint">
        Active delivery methods:{" "}
        {deliveryMethods
          .filter((method) => method.isActive)
          .map((method) => `${method.name} (${method.kind})`)
          .join(", ") || "none"}. Delivery fees and ETA are set per region
        above.
      </p>
    </div>
  );
}