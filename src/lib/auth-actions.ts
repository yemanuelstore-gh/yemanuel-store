"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createServiceClient,
  isServiceConfigured,
} from "@/lib/supabase/service";
import {
  isValidEmail,
  isValidFullName,
  isValidGhanaPhone,
} from "@/lib/validation";

export type AuthActionResult = {
  ok: boolean;
  message: string;
  needsConfirmation?: boolean;
};

function safeNext(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function makeCustomerCode(): string {
  return `CUS-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function ensureCustomerRecord(
  userId: string,
  profile: { fullName: string; phone: string | null; email: string },
): Promise<void> {
  if (!isServiceConfigured()) return;
  const client = createServiceClient();

  const profileResult = await client
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!profileResult.data) {
    await client.from("profiles").insert({
      id: userId,
      full_name: profile.fullName,
      phone: profile.phone,
    });
  }

  const [firstName, ...rest] = profile.fullName.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const customerResult = await client
    .from("customers")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!customerResult.data) {
    const insert = {
      profile_id: userId,
      customer_type: "individual",
      first_name: firstName,
      last_name: lastName,
      business_name: null,
      phone: profile.phone ?? "",
      email: profile.email,
      status: "active",
      notes: null,
      created_by: userId,
    };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await client
        .from("customers")
        .insert({
          ...insert,
          customer_code: makeCustomerCode(),
        });
      if (!result.error) return;
      if (result.error.code !== "23505") return;
    }
  }
}

export async function signInAction(
  _previousState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

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

  if (user) {
    await ensureCustomerRecord(user.id, {
      fullName:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "",
      phone: null,
      email,
    });
  }

  redirect(next ?? "/account");
}

export async function signUpAction(
  _previousState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isValidFullName(fullName)) {
    return { ok: false, message: "Please enter your full name." };
  }
  if (!isValidGhanaPhone(phone)) {
    return {
      ok: false,
      message: "Please enter a valid Ghana phone number (e.g. 024 412 3456).",
    };
  }
  if (!isValidEmail(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  if (password.length < 8) {
    return {
      ok: false,
      message: "Password must be at least 8 characters.",
    };
  }

  let user;
  let hasSession = false;
  try {
    const client = await createClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }
    user = data.user;
    hasSession = Boolean(data.session);
  } catch {
    return {
      ok: false,
      message: "Registration is unavailable right now. Please try again shortly.",
    };
  }

  if (!user) {
    return {
      ok: false,
      message: "We could not create your account. Please try again.",
    };
  }

  await ensureCustomerRecord(user.id, { fullName, phone, email });

  if (!hasSession) {
    return {
      ok: true,
      needsConfirmation: true,
      message: "Check your email to confirm your account, then sign in.",
    };
  }

  redirect("/account");
}

export async function signOutAction(): Promise<void> {
  try {
    const client = await createClient();
    await client.auth.signOut();
  } catch {
    // Sign out should still proceed even if the network call fails.
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfileAction(
  _previousState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!isValidFullName(fullName)) {
    return { ok: false, message: "Please enter your full name." };
  }
  if (!isValidGhanaPhone(phone)) {
    return {
      ok: false,
      message: "Please enter a valid Ghana phone number (e.g. 024 412 3456).",
    };
  }

  let user;
  try {
    const client = await createClient();
    const { data } = await client.auth.getUser();
    user = data.user;
  } catch {
    return {
      ok: false,
      message: "You need to be signed in to update your profile.",
    };
  }
  if (!user) {
    return { ok: false, message: "You need to be signed in to update your profile." };
  }

  if (!isServiceConfigured()) {
    return { ok: false, message: "Profile updates are unavailable right now." };
  }

  const serviceClient = createServiceClient();

  const profileResult = await serviceClient
    .from("profiles")
    .upsert(
      { id: user.id, full_name: fullName, phone },
      { onConflict: "id" },
    );
  if (profileResult.error) {
    return { ok: false, message: "We could not save your profile. Please try again." };
  }

  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;
  const email = user.email ?? "";

  const customerResult = await serviceClient
    .from("customers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (customerResult.data) {
    const update = await serviceClient
      .from("customers")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
      })
      .eq("profile_id", user.id);
    if (update.error) {
      return { ok: false, message: "We could not save your profile. Please try again." };
    }
  } else {
    const insert = {
      profile_id: user.id,
      customer_type: "individual",
      first_name: firstName,
      last_name: lastName,
      business_name: null,
      phone,
      email,
      status: "active",
      notes: null,
      created_by: user.id,
    };
    let inserted = false;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await serviceClient
        .from("customers")
        .insert({ ...insert, customer_code: makeCustomerCode() });
      if (!result.error) {
        inserted = true;
        break;
      }
      if (result.error.code !== "23505") break;
    }
    if (!inserted) {
      return { ok: false, message: "We could not save your profile. Please try again." };
    }
  }

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { ok: true, message: "Your profile has been updated." };
}