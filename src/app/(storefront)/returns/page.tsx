import { InfoPage, InfoSection } from "@/components/storefront/info-page";

export const metadata = {
  title: "Returns & refunds — Yemanuel Store",
  description:
    "Yemanuel Store returns policy — how to return an item and how refunds and swaps work.",
};

export default function ReturnsPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Returns & refunds"
      intro="We stand behind every item we sell. If something arrives damaged, incorrect or faulty, contact us and we will make it right."
    >
      <InfoSection title="When you can return">
        <p>
          You can return an item within 7 days of receiving your order if:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>it arrived damaged or faulty;</li>
          <li>it is not what you ordered (wrong item or wrong variant);</li>
          <li>it is missing parts or packaging contents.</li>
        </ul>
        <p>
          The item must be unused and in its original condition. For health
          and hygiene, items such as underwear, opened cosmetics and
          consumables cannot be returned once opened.
        </p>
      </InfoSection>

      <InfoSection title="How to start a return">
        <p>
          Contact us by WhatsApp or phone with your order number and a short
          description of the problem. We will confirm the return and tell you
          what happens next — no need to send anything until we have replied.
        </p>
      </InfoSection>

      <InfoSection title="Refunds & swaps">
        <p>
          After we receive and inspect the returned item, we will either send
          a replacement or refund the item price (including its delivery fee)
          to the payment method you used.
        </p>
        <p>
          Refunds are processed within a few working days of inspection.
          Return postage for damaged, faulty or incorrect items is covered by
          us.
        </p>
      </InfoSection>
    </InfoPage>
  );
}