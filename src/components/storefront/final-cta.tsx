import Image from "next/image";
import { ButtonLink } from "@/components/storefront/button-link";
import { STORE_CONTACT } from "@/lib/storefront-contact";

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35ZM12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.01c0-5.2 4.23-9.43 9.43-9.43 2.52 0 4.88.98 6.66 2.76a9.36 9.36 0 0 1 2.76 6.67c0 5.2-4.23 9.42-9.44 9.42Zm8.16-17.6A11.32 11.32 0 0 0 12.05.7C5.9.7.84 5.75.84 11.9c0 1.98.52 3.9 1.5 5.6L.72 23.3l5.9-1.55a11.3 11.3 0 0 0 5.42 1.38h.01c6.14 0 11.19-5.05 11.19-11.2 0-3-1.16-5.8-3.03-7.66Z" />
    </svg>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-navy">
      <Image
        src="/images/cta-editorial.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center opacity-45"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy/90 via-navy/80 to-navy/90"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(640px 360px at 50% 0%, rgb(201 162 39 / 0.18), transparent 65%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-12 text-center lg:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          Yemanuel Store
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-balance font-display text-2xl font-medium tracking-tight text-ivory lg:text-4xl">
          Fashion, electronics, beauty and home —{" "}
          <em className="italic text-gold">delivered across Ghana.</em>
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[13px] leading-5 text-ivory/70">
          Shop in GHS with delivery built for Ghana. Questions before you
          order? Reach us directly on WhatsApp or call.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/shop" variant="gold">
            Shop now
          </ButtonLink>
          <ButtonLink href={STORE_CONTACT.whatsappHref} variant="outline-light">
            <WhatsAppIcon />
            WhatsApp us
          </ButtonLink>
        </div>
        <p className="mt-4 text-sm text-ivory/70">
          Or call{" "}
          <a
            href={STORE_CONTACT.phoneHref}
            className="font-semibold text-gold transition-colors hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            {STORE_CONTACT.phone}
          </a>
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-ivory/40">
          Prices in GHS · Delivered across Ghana · Mobile money & card accepted
        </p>
      </div>
    </section>
  );
}