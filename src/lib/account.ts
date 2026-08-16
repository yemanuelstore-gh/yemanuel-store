import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type SessionAccount = {
  userId: string;
  email: string;
  fullName: string | null;
};

export type AccountData = {
  userId: string;
  email: string;
  profile: {
    fullName: string;
    phone: string | null;
  } | null;
  customer: {
    id: string;
    customerCode: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    status: string;
  } | null;
};

export const getSessionAccount = cache(
  async (): Promise<SessionAccount | null> => {
    if (!isSupabaseConfigured()) return null;
    try {
      const client = await createClient();
      const { data } = await client.auth.getUser();
      if (!data.user) return null;
      const fullName =
        typeof data.user.user_metadata?.full_name === "string"
          ? data.user.user_metadata.full_name
          : null;
      return {
        userId: data.user.id,
        email: data.user.email ?? "",
        fullName,
      };
    } catch {
      return null;
    }
  },
);

export const getAccountData = cache(async (): Promise<AccountData | null> => {
  const session = await getSessionAccount();
  if (!session) return null;
  if (!isSupabaseConfigured()) return null;

  try {
    const client = await createClient();
    const [profileResult, customerResult] = await Promise.all([
      client
        .from("profiles")
        .select("full_name, phone")
        .eq("id", session.userId)
        .maybeSingle(),
      client
        .from("customers")
        .select(
          "id, customer_code, first_name, last_name, phone, email, status",
        )
        .eq("profile_id", session.userId)
        .maybeSingle(),
    ]);

    return {
      userId: session.userId,
      email: session.email,
      profile:
        profileResult.data && !profileResult.error
          ? {
              fullName: profileResult.data.full_name as string,
              phone: (profileResult.data.phone as string | null) ?? null,
            }
          : null,
      customer:
        customerResult.data && !customerResult.error
          ? {
              id: customerResult.data.id as string,
              customerCode: customerResult.data.customer_code as string,
              firstName: customerResult.data.first_name as string,
              lastName: customerResult.data.last_name as string,
              phone: customerResult.data.phone as string,
              email: (customerResult.data.email as string | null) ?? null,
              status: customerResult.data.status as string,
            }
          : null,
    };
  } catch {
    return null;
  }
});