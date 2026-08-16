import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StoreHeader } from "@/components/storefront/header";
import { StoreFooter } from "@/components/storefront/footer";
import { getAccountData } from "@/lib/account";
import { readCart } from "@/lib/cart";
import { signOutAction } from "@/lib/auth-actions";

export const metadata: Metadata = {
  title: "Your Account — Yemanuel Store",
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [account, cart] = await Promise.all([
    getAccountData().catch(() => null),
    readCart(),
  ]);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  if (!account) {
    redirect("/login?next=/account");
  }

  const navItemClasses =
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

  const navIconClasses = "h-4 w-4 text-ink-faint";

  return (
    <div className="flex min-h-screen flex-col bg-ivory text-ink">
      <StoreHeader
        account={{
          userId: account.userId,
          email: account.email,
          fullName: account.profile?.fullName ?? null,
        }}
        cartCount={cartCount}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 lg:py-14">
        <Link
          href="/"
          className="text-sm text-ink-soft transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
        >
          ← Back to store
        </Link>
        <div className="mt-4 grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-12">
          <nav aria-label="Account" className="lg:sticky lg:top-24 lg:self-start">
            <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:pb-0">
              <li>
                <Link href="/account" className={navItemClasses}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={navIconClasses}>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
                  </svg>
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className={navItemClasses}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={navIconClasses}>
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  Orders
                </Link>
              </li>
              <li className="mt-0 lg:mt-4">
                <form action={signOutAction}>
                  <button type="submit" className={navItemClasses}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={navIconClasses}>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="m16 17 5-5-5-5" />
                      <path d="M21 12H9" />
                    </svg>
                    Sign out
                  </button>
                </form>
              </li>
            </ul>
          </nav>
          <div>{children}</div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}