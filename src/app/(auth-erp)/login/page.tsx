import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getSessionAccount } from "@/lib/account";

export const metadata: Metadata = {
  title: "Sign in — Yemanuel ERP",
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
    <div className="w-full max-w-[400px] rounded-xl border border-erp-border bg-erp-canvas shadow-[0_1px_2px_rgb(7_24_41/0.4),0_24px_60px_-24px_rgb(7_24_41/0.8)]">
      <div className="px-7 pt-8 sm:px-8 sm:pt-9">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-erp-navy font-display text-base font-bold text-erp-gold"
          >
            Y
          </div>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-semibold tracking-[0.22em] text-erp-text">
              YEMANUEL
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-erp-gold">
              ERP
            </p>
          </div>
        </div>

        <div aria-hidden="true" className="mt-6 h-px w-full bg-erp-border" />
        <div aria-hidden="true" className="h-px w-10 bg-erp-gold" />

        <h1 className="mt-5 text-lg font-semibold tracking-tight text-erp-text">
          Management workspace
        </h1>
        <p className="mt-1 text-[13px] leading-5 text-erp-text-secondary">
          Sign in to access the store management workspace.
        </p>

        <div className="mt-6">
          <LoginForm next={safeNext} />
        </div>
      </div>

      <div className="border-t border-erp-border px-7 py-4 sm:px-8">
        <p className="text-center text-[11px] leading-4 text-erp-text-muted">
          Management workspace
          <span className="mx-1.5 text-erp-border">·</span>
          You need to sign in as a staff member to view the dashboard.
        </p>
      </div>
    </div>
  );
}