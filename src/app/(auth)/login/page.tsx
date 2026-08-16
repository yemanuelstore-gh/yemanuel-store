import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/storefront/login-form";
import { getSessionAccount } from "@/lib/account";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const account = await getSessionAccount();
  if (account) {
    redirect("/account");
  }

  const { next } = await searchParams;
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : undefined;

  return (
    <Card className="p-6 lg:p-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Sign in
      </h1>
      <p className="mt-1 text-sm leading-6 text-ink-soft">
        Welcome back to Yemanuel Store.
      </p>
      <div className="mt-6">
        <LoginForm next={safeNext} />
      </div>
    </Card>
  );
}