import { SectionHeader } from "@/components/storefront/section-header";
import { RailProductCard } from "@/components/storefront/rail-product-card";
import type { ShopProduct } from "@/lib/catalogue";
import { cn } from "@/lib/cn";

type ProductRailProps = {
  eyebrow: string;
  title: string;
  description?: string;
  href: string;
  actionLabel?: string;
  products: ShopProduct[];
  badge?: "New" | "Sale" | null;
  tone?: "paper" | "ivory";
  className?: string;
};

/**
 * Dense horizontal product strip used for department rails and the
 * best-seller fallback. Hides itself entirely when there is nothing real
 * to show.
 */
export function ProductRail({
  eyebrow,
  title,
  description,
  href,
  actionLabel = "View all",
  products,
  badge = null,
  tone = "paper",
  className,
}: ProductRailProps) {
  if (products.length === 0) return null;

  return (
    <section
      className={cn(
        "border-t border-line",
        tone === "paper" ? "bg-paper" : "bg-ivory",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-7 lg:py-9">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actionHref={href}
          actionLabel={actionLabel}
          titleSize="md"
        />
        <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((product) => (
            <RailProductCard key={product.id} product={product} badge={badge} />
          ))}
        </div>
      </div>
    </section>
  );
}
