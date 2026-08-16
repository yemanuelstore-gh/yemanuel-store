import { InfoPage, InfoSection } from "@/components/storefront/info-page";
import { getDeliveryMethods, getRegions } from "@/lib/catalogue";
import { formatGHS } from "@/lib/format";

export const metadata = {
  title: "Delivery information — Yemanuel Store",
  description:
    "How Yemanuel Store delivers across Ghana — delivery options, fees and regions covered.",
};

export default async function DeliveryPage() {
  const [methods, regions] = await Promise.all([
    getDeliveryMethods().catch(() => []),
    getRegions().catch(() => []),
  ]);

  return (
    <InfoPage
      eyebrow="Delivery"
      title="Delivery information"
      intro="Yemanuel Store delivers across Ghana. Orders are priced in GHS and the delivery fee is always shown at checkout before you confirm."
    >
      <InfoSection title="Delivery options">
        {methods.length === 0 ? (
          <p>
            Delivery options are set up per location and appear at checkout
            when you place an order.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {methods.map((method) => (
              <li
                key={method.id}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <span className="font-medium text-ink">{method.name}</span>
                <span className="font-semibold text-gold-dark">
                  {method.fee === null ? "Free" : formatGHS(method.fee)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p>
          Fees are calculated for your delivery location at checkout. Where a
          method is marked free, there is no delivery charge for that option.
        </p>
      </InfoSection>

      <InfoSection title="Regions covered">
        {regions.length === 0 ? (
          <p>We deliver to all 16 regions of Ghana.</p>
        ) : (
          <p>We deliver to all 16 regions of Ghana, including:</p>
        )}
        {regions.length > 0 && (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {regions.map((region) => (
              <li key={region.id} className="text-sm text-ink-soft">
                {region.name}
              </li>
            ))}
          </ul>
        )}
      </InfoSection>

      <InfoSection title="How it works">
        <p>
          Choose your region, city and delivery method at checkout — the fee
          is added to your total and shown before you pay.
        </p>
        <p>
          Once your order is confirmed you can track it on the{" "}
          <a
            href="/track"
            className="font-semibold text-gold-dark transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Track order
          </a>{" "}
          page using your order number.
        </p>
      </InfoSection>
    </InfoPage>
  );
}