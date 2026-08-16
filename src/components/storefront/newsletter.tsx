"use client";

import { useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <section className="relative overflow-hidden bg-navy">
      <Image
        src="/images/flatlay-editorial.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center opacity-40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy/85 via-navy/80 to-navy/90"
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
      <div className="relative mx-auto max-w-6xl px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
            Yemanuel Store
          </p>
          <h2 className="mt-3 text-balance font-display text-2xl font-medium tracking-tight text-ivory lg:text-3xl">
            Get the good stuff first
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-ivory/70">
            New arrivals, offers and restocks — straight to your inbox. No
            spam, only what matters.
          </p>

          {submitted ? (
            <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-lg border border-gold/40 bg-gold/10 px-5 py-3.5">
              <span aria-hidden="true" className="text-gold">✓</span>
              <p className="text-sm font-medium text-ivory">
                You&apos;re on the list — we&apos;ll be in touch soon.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row"
              noValidate
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="newsletter-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Your email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={error ? true : undefined}
                className="h-10 border-ivory/25 bg-ivory/10 text-ivory placeholder:text-ivory/45 focus:border-gold focus:outline-gold/40"
              />
              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-gold px-5 text-sm font-semibold text-navy-dark shadow-soft transition-colors hover:bg-gold-dark hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Join the list
                <span aria-hidden="true">→</span>
              </button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-3 text-xs font-medium text-gold">
              {error}
            </p>
          )}
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-ivory/40">
            Prices in GHS · Delivered across Ghana
          </p>
        </div>
      </div>
    </section>
  );
}