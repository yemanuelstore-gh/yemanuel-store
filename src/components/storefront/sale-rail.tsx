import { SectionHeader } from "@/components/storefront/section-header";
import { RailProductCard } from "@/components/storefront/rail-product-card";
import type { ShopProduct } from "@/lib/catalogue";

/**
 * Flash sale rail: real active-sale products only. Every card shows the
 * marked-down price, the old price and the discount percentage computed
 * from actual catalogue pricing — nothing is fabricated.
 */
export function SaleRail({
  products,
  eyebrow = "Flash sale",
  title = "Deals on the shelves right now",
  description = "Marked-down prices on selected items — the old price is always shown alongside.",
  actionLabel = "See all deals",
}: {
  products: ShopProduct[];
  eyebrow?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="border-y border-gold/25 bg-gold-soft/70">
      <div className="mx-auto max-w-6xl px-4 py-7 lg:py-9">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actionHref="/shop"
          actionLabel={actionLabel}
          titleSize="md"
        />

        <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((product) => (
            <RailProductCard key={product.id} product={product} badge="Sale" />
          ))}
        </div>
      </div>
    </section>
  );
}
