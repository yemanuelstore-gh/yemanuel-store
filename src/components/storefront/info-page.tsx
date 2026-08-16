import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { STORE_CONTACT } from "@/lib/storefront-contact";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-paper p-6 shadow-soft sm:p-8">
      <h2 className="font-display text-lg font-medium tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-ink-soft">
        {children}
      </div>
    </section>
  );
}

/**
 * Shared scaffold for the store's static info pages (delivery, payments,
 * returns): breadcrumbs, title block and stacked content sections.
 */
export function InfoPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: title }]}
      />

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink lg:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
          {intro}
        </p>
      </div>

      <div className="mt-8 space-y-4">{children}</div>

      <div className="mt-8 rounded-lg border border-gold/30 bg-gold-soft/60 p-6">
        <p className="text-sm font-semibold text-navy">Questions?</p>
        <p className="mt-1.5 text-sm leading-6 text-ink-soft">
          Message us on WhatsApp at{" "}
          <a
            href={STORE_CONTACT.whatsappHref}
            className="font-semibold text-gold-dark transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            {STORE_CONTACT.whatsapp}
          </a>{" "}
          or call{" "}
          <a
            href={STORE_CONTACT.phoneHref}
            className="font-semibold text-gold-dark transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            {STORE_CONTACT.phone}
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export { Section as InfoSection };