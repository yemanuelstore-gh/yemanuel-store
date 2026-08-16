import Link from "next/link";
import { StoreHeader } from "@/components/storefront/header";
import { StoreFooter } from "@/components/storefront/footer";
import { getSessionAccount } from "@/lib/account";
import { readCart } from "@/lib/cart";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [account, cart] = await Promise.all([
    getSessionAccount().catch(() => null),
    readCart(),
  ]);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="flex min-h-screen flex-col bg-ivory text-ink">
      <StoreHeader account={account} cartCount={cartCount} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-6 block text-center font-display text-2xl font-medium tracking-tight"
          >
            <span className="text-navy">Yemanuel</span>{" "}
            <span className="text-navy">Store</span>
            <span className="text-gold">.</span>
          </Link>
          {children}
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}