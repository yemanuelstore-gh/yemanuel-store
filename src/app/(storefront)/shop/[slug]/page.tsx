import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { ProductViewer } from "@/components/storefront/product-viewer";
import { ProductCard } from "@/components/storefront/product-card";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { SectionHeader } from "@/components/storefront/section-header";
import {
  getDeliveryMethods,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/catalogue";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return {
      title: "Product not found",
      description: "This product is not available.",
    };
  }
  return {
    title: `${product.name} — Yemanuel Store`,
    description:
      product.description?.slice(0, 160) ??
      `Shop ${product.name} at Yemanuel Store in Ghana, priced in GHS.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  let product: Awaited<ReturnType<typeof getProductBySlug>> = null;
  let failed = false;
  try {
    product = await getProductBySlug(slug);
  } catch {
    failed = true;
  }
  if (!product) {
    if (failed) {
      return (
        <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
          <RetryPanel retryHref={`/shop/${slug}`} />
        </div>
      );
    }
    notFound();
  }
  const related = await getRelatedProducts(
    { id: product.id, categoryId: product.categoryId },
  ).catch(() => []);
  const deliveryMethods = await getDeliveryMethods().catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(product.category
            ? [{ label: product.category.name, href: `/categories/${product.category.slug}` }]
            : []),
          { label: product.name },
        ]}
      />

      <div className="mt-8">
        <ProductViewer product={product} />
      </div>

      {deliveryMethods.length > 0 && (
        <section
          aria-label="Delivery and payment"
          className="mt-8 grid gap-3 rounded-lg border border-line bg-paper p-4 sm:grid-cols-3 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-dark">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
                <path d="M10 17h4V5H2v12h3" />
                <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
                <path d="M14 17h1" />
                <circle cx="7.5" cy="17.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-semibold text-ink">Ghana-wide delivery</p>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft">
                {deliveryMethods.map((method) => method.name).join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-dark">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-semibold text-ink">Secure checkout</p>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft">
                Payment only confirmed when received
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-dark">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
                <path d="M6 3h12M6 21h12M9 3v18M15 3v18" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-semibold text-ink">Prices in GHS</p>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft">
                Ghanaian cedi, with sale prices marked
              </p>
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-10">
          <SectionHeader
            eyebrow="Related"
            title="You may also like"
            titleSize="md"
            actionHref="/shop"
            actionLabel="View all"
          />
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}