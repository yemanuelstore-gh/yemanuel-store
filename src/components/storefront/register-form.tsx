"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpAction, type AuthActionResult } from "@/lib/auth-actions";

const fieldClasses =
  "mt-1.5 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-navy/50 focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthActionResult, FormData>(
    signUpAction,
    { ok: true, message: "" },
  );

  if (state.ok && state.needsConfirmation) {
    return (
      <div className="rounded-md border border-navy/20 bg-navy-soft p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-ivory"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6L2 7" />
          </svg>
        </div>
        <h2 className="mt-4 font-display text-lg font-medium tracking-tight text-ink">
          Check your email
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          {state.message} Once confirmed, you can sign in and start shopping.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex h-9 items-center rounded-md bg-navy px-4 text-sm font-medium text-ivory transition-colors hover:bg-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="block text-xs font-medium uppercase tracking-wider text-ink-soft"
          >
            Full name
          </label>
          <Input
            id="fullName"
            type="text"
            name="fullName"
            autoComplete="name"
            required
            placeholder="Ama Owusu"
            className={fieldClasses}
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="block text-xs font-medium uppercase tracking-wider text-ink-soft"
          >
            Phone
          </label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            name="phone"
            autoComplete="tel"
            required
            placeholder="024 412 3456"
            className={fieldClasses}
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium uppercase tracking-wider text-ink-soft"
          >
            Email address
          </label>
          <Input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={fieldClasses}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-wider text-ink-soft"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className={fieldClasses}
          />
        </div>
      </div>

      {!state.ok && state.message !== "" && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
        >
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending} className="mt-6 w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="mt-4 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-navy hover:text-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}