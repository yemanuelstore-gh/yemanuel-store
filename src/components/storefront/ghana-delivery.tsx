import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/storefront/button-link";
import { formatGHS } from "@/lib/format";
import { STORE_CONTACT } from "@/lib/storefront-contact";
import type { DeliveryMethod, Region } from "@/lib/catalogue";

export function GhanaDelivery({
  methods,
  regions,
}: {
  methods: DeliveryMethod[];
  regions: Region[];
}) {
  return (
    <section className="relative overflow-hidden border-t border-gold/20 bg-navy">
      <Image
        src="/images/retail-editorial.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-right opacity-40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(680px 380px at 15% 0%, rgb(201 162 39 / 0.16), transparent 65%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-9 lg:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-gold">
              <span aria-hidden="true" className="h-px w-8 bg-gold" />
              Delivery across Ghana
            </p>
            <h2 className="mt-2 text-balance font-display text-2xl font-medium tracking-tight text-ivory lg:text-3xl">
              From Accra to every region,{" "}
              <em className="italic text-gold">we deliver.</em>
            </h2>
            <p className="mt-2.5 max-w-md text-[13px] leading-5 text-ivory/70">
              Yemanuel Store delivers to all 16 regions of Ghana. Every price
              is in GHS, and the delivery fee is always shown before you
              confirm your order.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ButtonLink href="/delivery" variant="gold">
                Delivery information
              </ButtonLink>
              <ButtonLink href={STORE_CONTACT.whatsappHref} variant="outline-light">
                WhatsApp us
              </ButtonLink>
            </div>
          </div>

          <div className="space-y-3.5">
            {methods.length > 0 && (
              <div className="rounded-lg border border-ivory/15 bg-navy-dark/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory/50">
                  Delivery options
                </p>
                <ul className="mt-2 space-y-2">
                  {methods.slice(0, 4).map((method) => (
                    <li
                      key={method.id}
                      className="flex items-center justify-between gap-4 text-[13px]"
                    >
                      <span className="text-ivory/85">{method.name}</span>
                      <span className="font-semibold text-gold">
                        {method.fee === null ? "Free" : formatGHS(method.fee)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {regions.length > 0 && (
              <div className="rounded-lg border border-ivory/15 bg-navy-dark/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory/50">
                  We deliver to all 16 regions
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {regions.map((region) => (
                    <li
                      key={region.id}
                      className="rounded-full border border-ivory/15 bg-ivory/5 px-2 py-0.5 text-[10px] font-medium text-ivory/75"
                    >
                      {region.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-ivory/60">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold" />
                Prices in GHS
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold" />
                Track your order
              </span>
              <Link
                href="/track"
                className="inline-flex items-center gap-2 text-gold transition-colors hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold" />
                Track order →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}