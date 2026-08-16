import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/components/storefront/contact-form";
import { STORE_CONTACT } from "@/lib/storefront-contact";

export const metadata: Metadata = {
  title: "Contact & support — Yemanuel Store",
  description:
    "Get in touch with Yemanuel Store — call, email, WhatsApp or send us a message. Delivery across Ghana, payments in GHS.",
};

const faqs = [
  {
    question: "How do I track my order?",
    answer:
      "Use the Track order page with your order number and the phone number used at checkout. For more detail, sign in to your account and open the order.",
  },
  {
    question: "How do I pay for my order?",
    answer:
      "Choose a payment method at checkout. Bank transfers and cash on delivery are confirmed by our team before dispatch — you are only charged when a payment is actually received.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "We deliver across Ghana. Your order is dispatched after it is confirmed, and we contact you on the phone number you provided to arrange the delivery.",
  },
  {
    question: "Can I return or exchange an item?",
    answer:
      "Contact us with your order number and we will arrange a return. Refunds are issued back to the payment method used for the original order.",
  },
  {
    question: "I need to change my order — what do I do?",
    answer:
      "Send us a message with your order number as soon as possible. Once an order has been confirmed and prepared for dispatch, we may no longer be able to change it.",
  },
];

export default function ContactPage() {
  const channels = [
    {
      key: "phone",
      title: "Call us",
      value: STORE_CONTACT.phone,
      href: STORE_CONTACT.phoneHref,
      description: "For orders, delivery and support.",
    },
    {
      key: "email",
      title: "Email us",
      value: STORE_CONTACT.email,
      href: STORE_CONTACT.emailHref,
      description: "We reply to emails within one working day.",
    },
    {
      key: "whatsapp",
      title: "WhatsApp",
      value: STORE_CONTACT.whatsapp,
      href: STORE_CONTACT.whatsappHref,
      description: "Quickest way to reach us — message anytime.",
    },
  ];

  const showAddress = true;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
      <div className="text-center">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink lg:text-4xl">
          Contact & support
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-soft">
          We are here to help with orders, delivery, payments and everything
          else. Send us a message and our team will get back to you.
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_26rem] lg:gap-12">
        <div className="space-y-10">
          <section aria-labelledby="contact-channels-heading">
            <h2
              id="contact-channels-heading"
              className="font-display text-xl font-medium tracking-tight text-ink"
            >
              Reach us directly
            </h2>

            {channels.length === 0 && !showAddress ? (
              <Card className="mt-5 p-6 text-sm leading-6 text-ink-soft">
                We are finalising our direct contact channels. In the meantime,
                send us a message using the form — we will get back to you as
                soon as possible.
              </Card>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {channels.map((channel) => (
                  <a
                    key={channel.key}
                    href={channel.href}
                    className="group rounded-lg border border-line-strong bg-white p-5 transition-colors hover:border-navy/40 hover:bg-navy-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy">
                      {channel.key === "phone" && (
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-ivory">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
                        </svg>
                      )}
                      {channel.key === "email" && (
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-ivory">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-10 6L2 7" />
                        </svg>
                      )}
                      {channel.key === "whatsapp" && (
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-ivory">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
                        </svg>
                      )}
                    </div>
                    <p className="mt-4 text-sm font-semibold text-ink">{channel.title}</p>
                    <p className="mt-1 break-all text-sm font-medium text-navy transition-colors group-hover:text-navy-dark">
                      {channel.value}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">
                      {channel.description}
                    </p>
                  </a>
                ))}

                {showAddress && (
                  <div className="rounded-lg border border-line-strong bg-white p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy">
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-ivory">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-ink">Visit the store</p>
                    <p className="mt-1 text-sm leading-6 text-ink">
                      {STORE_CONTACT.address}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">
                      West Legon · Accra · Ghana
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="contact-faq-heading">
            <h2
              id="contact-faq-heading"
              className="font-display text-xl font-medium tracking-tight text-ink"
            >
              Frequently asked questions
            </h2>
            <div className="mt-5 divide-y divide-line border-y border-line">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy">
                    {faq.question}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 flex-shrink-0 text-ink-soft transition-transform group-open:rotate-180"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <div>
          <Card className="p-6 lg:sticky lg:top-24 lg:p-8">
            <h2 className="font-display text-lg font-medium tracking-tight text-ink">
              Send us a message
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              Include your order number (e.g. YS-20260815-A1B2C3) so we can help
              you faster.
            </p>
            <div className="mt-5">
              <ContactForm />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}