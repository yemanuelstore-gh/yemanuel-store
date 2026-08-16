import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/storefront/section-header";

const benefits = [
  {
    title: "Ghana-wide delivery",
    description:
      "Delivery built for Ghana — from Accra to every region of the country.",
    icon: (
      <>
        <path d="M10 17h4V5H2v12h3" />
        <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
        <path d="M14 17h1" />
        <circle cx="7.5" cy="17.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </>
    ),
  },
  {
    title: "Secure checkout",
    description:
      "A safe and simple checkout, with payment options familiar to Ghanaian shoppers.",
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    title: "Honest GHS pricing",
    description:
      "Every price shown in Ghanaian cedi, with sale pricing always marked clearly.",
    icon: (
      <path d="M6 3h12M6 21h12M9 3v18M15 3v18M13.5 7.5A3 3 0 0 0 9 8.5c0 2 4.5 2.5 4.5 4.5a3 3 0 0 1-4.5 1" />
    ),
  },
  {
    title: "Customer support",
    description:
      "Real help at every step — from browsing to doorstep delivery.",
    icon: (
      <>
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
      </>
    ),
  },
  {
    title: "Easy returns",
    description:
      "Straightforward returns process so you can shop with confidence.",
    icon: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
  },
];

export function ValueProps() {
  return (
    <section className="border-t border-line bg-ivory">
      <div className="mx-auto max-w-6xl px-4 py-9 lg:py-12">
        <SectionHeader
          eyebrow="Why Yemanuel Store"
          title="Shopping, made for Ghana"
        />

        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {benefits.map((item) => (
            <Card
              key={item.title}
              className="group rounded-lg p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lifted"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-soft text-gold-dark transition-colors duration-300 group-hover:bg-gold group-hover:text-navy-dark">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4.5 w-4.5"
                >
                  {item.icon}
                </svg>
              </div>
              <h3 className="mt-3 text-[13px] font-semibold text-ink">
                {item.title}
              </h3>
              <p className="mt-1 text-[11px] leading-4 text-ink-soft">
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}