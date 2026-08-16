import { InfoPage, InfoSection } from "@/components/storefront/info-page";

export const metadata = {
  title: "Payment options — Yemanuel Store",
  description:
    "How to pay at Yemanuel Store — mobile money, card, bank transfer and cash on delivery.",
};

const PAYMENT_METHODS = [
  { name: "MTN MoMo", note: "Confirmed before dispatch" },
  { name: "Vodafone Cash", note: "Confirmed before dispatch" },
  { name: "AirtelTigo Money", note: "Confirmed before dispatch" },
  { name: "Card", note: "Visa & Mastercard" },
  { name: "Bank Transfer", note: "Verified before dispatch" },
  { name: "Cash on Delivery", note: "Selected areas" },
];

function PaymentMark({
  name,
  note,
}: {
  name: string;
  note: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-paper p-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-br from-navy to-navy-dark font-display text-sm font-medium italic text-gold">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <p className="truncate text-[11px] text-ink-soft">{note}</p>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <InfoPage
      eyebrow="Payments"
      title="Payment options"
      intro="Every price at Yemanuel Store is in GHS. At checkout you can choose the payment method that suits you — online options are processed securely through our payment partner."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {PAYMENT_METHODS.map((method) => (
          <PaymentMark
            key={method.name}
            name={method.name}
            note={method.note}
          />
        ))}
      </div>

      <InfoSection title="Mobile Money">
        <p>
          Send your payment with MTN MoMo, Vodafone Cash or AirtelTigo Money to
          the store&apos;s Mobile Money number shown at checkout. We confirm your
          payment before dispatch — no payment is taken without your approval.
        </p>
      </InfoSection>

      <InfoSection title="Card">
        <p>
          Pay with a debit or credit card through our payment partner. Card
          details are handled by the payment provider — we never see or store
          your card number.
        </p>
      </InfoSection>

      <InfoSection title="Bank Transfer">
        <p>
          Transfer to our bank account and we confirm it before dispatch. Our
          account details are shown at checkout when you select this option.
        </p>
      </InfoSection>

      <InfoSection title="Cash on Delivery">
        <p>
          Pay cash when your order arrives. This option is available in
          selected areas and only appears at checkout where it is offered for
          your delivery location.
        </p>
      </InfoSection>

      <InfoSection title="Security">
        <p>
          All online payments go through our payment partner — payment
          credentials are never exposed to this site or stored by Yemanuel
          Store. All prices shown are final in Ghanaian Cedi (GHS).
        </p>
      </InfoSection>
    </InfoPage>
  );
}