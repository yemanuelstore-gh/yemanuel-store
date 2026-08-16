import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AddressManager, type AccountAddress } from "@/components/storefront/address-manager";
import { ProfileForm } from "@/components/storefront/profile-form";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { StatusBadge } from "@/components/storefront/status-badge";
import { getAccountData } from "@/lib/account";
import { getCities, getRegions } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/server";
import { formatGhanaPhone } from "@/lib/format";

export default async function AccountPage() {
  const account = await getAccountData();
  if (!account) return null;

  let addresses: AccountAddress[] = [];
  let orderCount = 0;
  let regions: Awaited<ReturnType<typeof getRegions>> = [];
  let cities: Awaited<ReturnType<typeof getCities>> = [];
  let failed = false;

  try {
    const client = await createClient();
    const [addressesResult, ordersResult, regionsResult, citiesResult] =
      await Promise.allSettled([
        client
          .from("customer_addresses")
          .select(
            "id, label, recipient_name, recipient_phone, address_line_1, address_line_2, city_id, region_id, postal_code, is_default_delivery, is_default_billing",
          )
          .eq("customer_id", account.customer?.id ?? "")
          .order("created_at", { ascending: true }),
        client
          .from("orders")
          .select("id")
          .eq("customer_id", account.customer?.id ?? ""),
        getRegions(),
        getCities(),
      ]);

    if (addressesResult.status === "rejected" || ordersResult.status === "rejected") {
      failed = true;
    } else {
      const rows = addressesResult.value.data as unknown as {
        id: string;
        label: string;
        recipient_name: string;
        recipient_phone: string;
        address_line_1: string;
        address_line_2: string | null;
        city_id: string | null;
        region_id: string | null;
        postal_code: string | null;
        is_default_delivery: boolean | null;
        is_default_billing: boolean | null;
      }[];
      addresses = (rows ?? [])
        .filter((row) => row.city_id && row.region_id)
        .map((row) => ({
          id: row.id,
          label: row.label,
          recipientName: row.recipient_name,
          recipientPhone: row.recipient_phone,
          addressLine1: row.address_line_1,
          addressLine2: row.address_line_2,
          cityId: row.city_id ?? "",
          regionId: row.region_id ?? "",
          postalCode: row.postal_code,
          isDefaultDelivery: Boolean(row.is_default_delivery),
          isDefaultBilling: Boolean(row.is_default_billing),
        }));
      orderCount = (ordersResult.value.data ?? []).length;
    }

    if (regionsResult.status === "fulfilled") regions = regionsResult.value;
    if (citiesResult.status === "fulfilled") cities = citiesResult.value;
  } catch {
    failed = true;
  }

  const profileName =
    account.profile?.fullName ??
    [account.customer?.firstName, account.customer?.lastName]
      .filter(Boolean)
      .join(" ");
  const profilePhone =
    account.profile?.phone ??
    account.customer?.phone ??
    "";

  return (
    <div className="space-y-10">
      <section aria-labelledby="account-greeting">
        <h1 id="account-greeting" className="font-display text-3xl font-medium tracking-tight text-ink">
          {profileName ? `Hello, ${profileName.split(" ")[0]}` : "Your account"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <span>{account.email}</span>
          {account.customer ? (
            <StatusBadge tone="active">
              Customer · {account.customer.customerCode}
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Profile incomplete</StatusBadge>
          )}
        </div>
      </section>

      {failed ? (
        <RetryPanel
          retryHref="/account"
          message="We could not load your account details. Please try again."
        />
      ) : (
        <>
          <section aria-labelledby="profile-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="profile-heading" className="font-display text-xl font-medium tracking-tight text-ink">
                Profile
              </h2>
            </div>
            <Card className="mt-4 p-6">
              {account.profile || account.customer ? (
                <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                        Name
                      </dt>
                      <dd className="mt-1 font-medium text-ink">
                        {profileName || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                        Email
                      </dt>
                      <dd className="mt-1 font-medium text-ink">{account.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                        Phone
                      </dt>
                      <dd className="mt-1 font-medium text-ink">
                        {profilePhone ? formatGhanaPhone(profilePhone) : "—"}
                      </dd>
                    </div>
                    {account.customer && (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                          Status
                        </dt>
                        <dd className="mt-1">
                          <StatusBadge tone="active">{account.customer.status}</StatusBadge>
                        </dd>
                      </div>
                    )}
                  </dl>
                  <div className="lg:border-l lg:border-line lg:pl-6">
                    <h3 className="text-sm font-semibold text-ink">Edit details</h3>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">
                      Keep your name and phone number up to date so orders reach
                      you without delays.
                    </p>
                    <div className="mt-4">
                      <ProfileForm
                        initialName={profileName}
                        initialPhone={profilePhone}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Complete your profile
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    Add your name and phone number to speed up checkout and
                    delivery.
                  </p>
                  <div className="mt-4">
                    <ProfileForm initialName="" initialPhone="" />
                  </div>
                </div>
              )}
            </Card>
          </section>

          <section aria-labelledby="orders-heading">
            <h2 id="orders-heading" className="font-display text-xl font-medium tracking-tight text-ink">
              Orders
            </h2>
            <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="text-sm text-ink-soft">
                  {orderCount} {orderCount === 1 ? "order" : "orders"} on your
                  account.
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Track status, payment and delivery progress.
                </p>
              </div>
              <Link
                href="/account/orders"
                className="inline-flex h-9 items-center rounded-md bg-navy px-4 text-sm font-medium text-ivory transition-colors hover:bg-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                View orders
              </Link>
            </Card>
          </section>

          <section aria-labelledby="addresses-heading">
            <h2 id="addresses-heading" className="font-display text-xl font-medium tracking-tight text-ink">
              Addresses
            </h2>
            <div className="mt-4">
              <AddressManager
                addresses={addresses}
                regions={regions}
                cities={cities}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}