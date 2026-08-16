"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInAction, type AuthActionResult } from "@/lib/auth-actions";

const fieldClasses =
  "mt-1.5 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-navy/50 focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthActionResult, FormData>(
    signInAction,
    { ok: true, message: "" },
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="space-y-4">
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
            autoComplete="current-password"
            required
            placeholder="Your password"
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
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="mt-4 text-center text-sm text-ink-soft">
        New to Yemanuel Store?{" "}
        <Link
          href="/register"
          className="font-medium text-navy hover:text-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}