"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateProfileAction,
  type AuthActionResult,
} from "@/lib/auth-actions";

const fieldClasses =
  "mt-1.5 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-navy/50 focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25";

const labelClasses =
  "block text-xs font-medium uppercase tracking-wider text-ink-soft";

export function ProfileForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const [state, formAction, pending] = useActionState<AuthActionResult, FormData>(
    updateProfileAction,
    { ok: true, message: "" },
  );

  return (
    <form action={formAction}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-fullName" className={labelClasses}>
            Full name
          </label>
          <Input
            id="profile-fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            defaultValue={initialName}
            placeholder="Your full name"
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="profile-phone" className={labelClasses}>
            Phone
          </label>
          <Input
            id="profile-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            defaultValue={initialPhone}
            placeholder="024 412 3456"
            className={fieldClasses}
          />
        </div>
      </div>

      {!state.ok && state.message !== "" && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {state.message}
        </p>
      )}
      {state.ok && state.message !== "" && (
        <p role="status" className="mt-3 text-sm text-navy">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-5">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}