import { SectionHeader } from "@/components/storefront/section-header";
import { RailProductCard } from "@/components/storefront/rail-product-card";
import type { ShopProduct } from "@/lib/catalogue";

export function NewArrivals({ products }: { products: ShopProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="border-t border-line bg-ivory">
      <div className="mx-auto max-w-6xl px-4 py-7 lg:py-9">
        <SectionHeader
          eyebrow="New arrivals"
          title="Just added to the store"
          description="The newest pieces from the latest batches — fresh stock, priced in GHS."
          actionHref="/shop"
          actionLabel="View all new arrivals"
          titleSize="md"
        />

        <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((product) => (
            <RailProductCard key={product.id} product={product} badge="New" />
          ))}
        </div>
      </div>
    </section>
  );
}