import { ProductCard } from "@/components/storefront/product-card";
import { EmptyCatalogueState } from "@/components/storefront/empty-state";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { SectionHeader } from "@/components/storefront/section-header";
import type { ShopProduct } from "@/lib/catalogue";

type FeaturedProductsProps = {
  products: ShopProduct[];
  failed?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  priorityCount?: number;
};

/**
 * Dense product grid. Used as the homepage "Recommended for you" grid and
 * for the featured selection. Column count is responsive: 2 on mobile,
 * 3–4 on tablet, 5–6 on desktop.
 */
export function FeaturedProducts({
  products,
  failed = false,
  eyebrow = "Featured",
  title = "Featured products",
  description = "A hand-picked selection from the shelves — new pieces arrive often.",
  actionHref = "/shop",
  actionLabel = "Browse the shop",
  priorityCount = 3,
}: FeaturedProductsProps) {
  return (
    <section className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-7 lg:py-9">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actionHref={actionHref}
          actionLabel={actionLabel}
          titleSize="md"
        />

        {failed ? (
          <RetryPanel className="mt-6" retryHref="/" />
        ) : products.length === 0 ? (
          <EmptyCatalogueState className="mt-6" />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {products.slice(0, 24).map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < priorityCount}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
