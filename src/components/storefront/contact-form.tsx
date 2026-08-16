"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  submitContactMessageAction,
  type ContactSubmitState,
} from "@/lib/contact-actions";

const fieldClasses =
  "mt-1.5 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-navy/50 focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25";

const labelClasses = "block text-xs font-medium uppercase tracking-wider text-ink-soft";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactSubmitState, FormData>(
    submitContactMessageAction,
    { ok: true, message: "" },
  );

  if (state.ok && state.message !== "") {
    return (
      <div className="flex flex-col items-center rounded-lg border border-gold-dark/25 bg-gold-soft px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-ivory"
          >
            <path d="m4 12 5 5L20 6" />
          </svg>
        </div>
        <h3 className="mt-4 font-display text-xl font-medium tracking-tight text-ink">
          Message sent
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-fullName" className={labelClasses}>
            Full name
          </label>
          <Input
            id="contact-fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            placeholder="Ama Mensah"
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className={labelClasses}>
            Phone
          </label>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="024 412 3456"
            className={fieldClasses}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="contact-email" className={labelClasses}>
            Email <span className="normal-case text-ink-faint">(optional)</span>
          </label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={fieldClasses}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className={labelClasses}>
          Subject
        </label>
        <select
          id="contact-subject"
          name="subject"
          required
          defaultValue="order"
          className={fieldClasses}
        >
          <option value="order">Order enquiry</option>
          <option value="delivery">Delivery</option>
          <option value="payment">Payment</option>
          <option value="returns">Returns & refunds</option>
          <option value="product">Product question</option>
          <option value="other">Something else</option>
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className={labelClasses}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          minLength={10}
          maxLength={4000}
          placeholder="How can we help you? Include your order number if you have one."
          className={`${fieldClasses} min-h-32 resize-y`}
        />
      </div>

      {!state.ok && state.message !== "" && (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
        >
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send message"}
      </Button>
      <p className="text-xs leading-5 text-ink-faint">
        Prefer to track an existing order? Use our{" "}
        <a
          href="/track"
          className="font-semibold text-navy hover:text-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          order tracker
        </a>{" "}
        for instant status updates.
      </p>
    </form>
  );
}