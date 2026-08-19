"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icons";
import { signInAction, type AuthActionResult } from "@/lib/auth-actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthActionResult, FormData>(
    signInAction,
    { ok: true, message: "" },
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary"
          >
            Staff ID or Email
          </label>
          <Input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="Enter your staff ID or email"
            className="mt-1.5"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary"
            >
              Password
            </label>
          </div>
          <div className="relative mt-1.5">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-md text-erp-text-muted transition-colors hover:text-erp-navy focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-erp-navy/25"
            >
              <Icon name={showPassword ? "eye-off" : "eye"} size={16} />
            </button>
          </div>
        </div>
      </div>

      {!state.ok && state.message !== "" && (
        <div
          role="alert"
          className="erp-fade-in mt-5 rounded-md border border-erp-cancelled/25 bg-erp-cancelled-soft px-4 py-3"
        >
          <p className="text-[13px] font-semibold text-erp-cancelled">
            Unable to sign in
          </p>
          <p className="mt-0.5 text-xs leading-5 text-erp-text-secondary">
            {state.message}
          </p>
        </div>
      )}

      <Button
        type="submit"
        variant="gold"
        size="md"
        disabled={pending}
        className="mt-6 w-full text-[13px] font-semibold shadow-[0_1px_0_rgb(11_31_51/0.08),0_6px_14px_-6px_rgb(11_31_51/0.35)] transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:shadow-[0_1px_0_rgb(11_31_51/0.08),0_10px_18px_-6px_rgb(11_31_51/0.4)] active:translate-y-0 active:shadow-[0_1px_0_rgb(11_31_51/0.08)] motion-reduce:transform-none"
      >
        {pending ? (
          <>
            <span
              aria-hidden="true"
              className="size-3.5 animate-spin rounded-full border-[1.5px] border-erp-navy-deep/25 border-t-erp-navy-deep"
            />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <span aria-hidden="true">→</span>
          </>
        )}
      </Button>
    </form>
  );
}