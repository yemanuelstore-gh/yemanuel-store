import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "@/components/storefront/register-form";
import { getSessionAccount } from "@/lib/account";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function RegisterPage() {
  const account = await getSessionAccount();
  if (account) {
    redirect("/account");
  }

  return (
    <Card className="p-6 lg:p-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Create account
      </h1>
      <p className="mt-1 text-sm leading-6 text-ink-soft">
        Track orders and check out faster with a Yemanuel Store account.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </Card>
  );
}