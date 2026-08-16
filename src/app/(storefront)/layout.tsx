import { StoreHeader } from "@/components/storefront/header";
import { StoreFooter } from "@/components/storefront/footer";
import { MarketplaceNav } from "@/components/storefront/marketplace-nav";
import { readCart } from "@/lib/cart";
import { getSessionAccount } from "@/lib/account";
import { getCategories } from "@/lib/catalogue";
import { buildDepartments } from "@/lib/storefront-departments";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [account, cart, categories] = await Promise.all([
    getSessionAccount().catch(() => null),
    readCart(),
    getCategories().catch(() => []),
  ]);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const departments = buildDepartments(categories);

  return (
    <div className="flex min-h-screen flex-col bg-ivory text-ink">
      <StoreHeader
        account={account}
        cartCount={cartCount}
        departments={departments}
        categories={categories}
      />
      <MarketplaceNav categories={categories} />
      <main className="flex-1">{children}</main>
      <StoreFooter />
    </div>
  );
}