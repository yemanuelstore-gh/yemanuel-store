"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/validation";

export type AdminLoginActionResult = {
  ok: boolean;
  message: string;
};

function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  return value;
}

/**
 * Admin Portal sign-in.
 *
 * Deliberately does NOT create profiles or customer records: the admin login
 * flow only authenticates an existing auth user. Staff access is granted
 * exclusively through a staff record + role + permissions, never through
 * registration.
 */
export async function signInAdminAction(
  _previousState: AdminLoginActionResult,
  formData: FormData,
): Promise<AdminLoginActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(email) || password.length < 6) {
    return {
      ok: false,
      message: "Please enter a valid email address and password.",
    };
  }

  let user;
  try {
    const client = await createClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return {
        ok: false,
        message: "The email or password is incorrect. Please try again.",
      };
    }
    user = data.user;
  } catch {
    return {
      ok: false,
      message: "Sign in is unavailable right now. Please try again shortly.",
    };
  }

  if (!user) {
    return {
      ok: false,
      message: "The email or password is incorrect. Please try again.",
    };
  }

  redirect(safeNext(formData.get("next")));
}
