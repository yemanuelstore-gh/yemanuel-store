"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/storefront/product-image";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { formatGHS } from "@/lib/format";
import { addToCartAction } from "@/lib/cart-actions";
import { cn } from "@/lib/cn";
import type { ProductDetail } from "@/lib/catalogue";

export function ProductViewer({ product }: { product: ProductDetail }) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [state, formAction, pending] = useActionState(addToCartAction, {
    ok: true,
    added: false,
    message: "",
  });

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ?? null;

  const optionGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const variant of product.variants) {
      for (const option of variant.options) {
        const values = groups.get(option.key) ?? [];
        if (!values.includes(option.value)) values.push(option.value);
        groups.set(option.key, values);
      }
    }
    return Array.from(groups.entries()).map(([key, values]) => ({ key, values }));
  }, [product.variants]);

  const images =
    selectedVariant && selectedVariant.images.length > 0
      ? selectedVariant.images
      : product.productImages;

  const selectOption = (key: string, value: string) => {
    const match = product.variants.find((variant) =>
      variant.options.some(
        (option) => option.key === key && option.value === value,
      ),
    );
    if (match) {
      setSelectedVariantId(match.id);
      setActiveImage(0);
    }
  };

  const price = selectedVariant?.price ?? null;
  const salePrice =
    selectedVariant?.hasSale && selectedVariant.salePrice !== null
      ? selectedVariant.salePrice
      : null;
  const discount =
    salePrice !== null && price !== null && price > 0
      ? Math.round((1 - salePrice / price) * 100)
      : null;
  const canAdd = product.available && selectedVariant !== null;

  const stepImage = (direction: 1 | -1) => {
    if (images.length < 2) return;
    setActiveImage(
      (index) => (index + direction + images.length) % images.length,
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-line bg-navy-soft">
          <ProductImage
            src={images[activeImage]?.url}
            alt={images[activeImage]?.altText ?? product.name}
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            fallbackLetter={product.name.charAt(0)}
          />
          {(salePrice !== null || discount !== null) && (
            <div className="absolute left-4 top-4 flex flex-col items-start gap-1">
              {salePrice !== null && (
                <span className="rounded-sm bg-gold px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-dark">
                  Sale
                </span>
              )}
              {discount !== null && (
                <span className="rounded-sm bg-navy/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold backdrop-blur-sm">
                  −{discount}%
                </span>
              )}
            </div>
          )}
          <span className="absolute right-4 top-4">
            <WishlistButton
              product={{
                slug: product.slug,
                name: product.name,
                imageUrl: images[0]?.url ?? null,
                price,
                salePrice,
                hasSale: salePrice !== null,
              }}
            />
          </span>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => stepImage(-1)}
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/30 bg-navy/60 text-ivory backdrop-blur-sm transition-colors hover:bg-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => stepImage(1)}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/30 bg-navy/60 text-ivory backdrop-blur-sm transition-colors hover:bg-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div
            className="mt-3 grid grid-cols-5 gap-2"
            role="group"
            aria-label="Product images"
          >
            {images.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-pressed={activeImage === index}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-sm border bg-navy-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy",
                  activeImage === index
                    ? "border-navy"
                    : "border-line hover:border-line-strong",
                )}
              >
                <ProductImage
                  src={image.url}
                  alt={image.altText ?? product.name}
                  sizes="96px"
                  fallbackLetter={product.name.charAt(0)}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {product.category && (
            <Link
              href={`/categories/${product.category.slug}`}
              className="font-medium uppercase tracking-[0.18em] text-navy transition-colors hover:text-navy-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
            >
              {product.category.name}
            </Link>
          )}
          {product.brand && (
            <Link
              href={`/brands/${product.brand.slug}`}
              className="font-medium uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
            >
              {product.brand.name}
            </Link>
          )}
        </div>

        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink lg:text-4xl">
          {product.name}
        </h1>

        <div className="mt-5 flex items-baseline gap-3">
          {price !== null && (
            <>
              <p
                className={cn(
                  "text-2xl font-semibold",
                  salePrice !== null ? "text-gold-dark" : "text-ink",
                )}
              >
                {formatGHS(salePrice ?? price)}
              </p>
              {salePrice !== null && (
                <p className="text-base text-ink-faint line-through">
                  {formatGHS(price)}
                </p>
              )}
            </>
          )}
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
          <span
            aria-hidden="true"
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              product.available ? "bg-navy" : "bg-ink-faint",
            )}
          />
          {product.available ? "Available" : "Currently unavailable"}
        </p>

        {optionGroups.length > 0 && (
          <div className="mt-7 space-y-5">
            {optionGroups.map((group) => (
              <div key={group.key}>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
                  {group.key}
                </p>
                <div
                  className="mt-2 flex flex-wrap gap-2"
                  role="group"
                  aria-label={group.key}
                >
                  {group.values.map((value) => {
                    const selected =
                      selectedVariant?.options.some(
                        (option) =>
                          option.key === group.key && option.value === value,
                      ) ?? false;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => selectOption(group.key, value)}
                        aria-pressed={selected}
                        className={cn(
                          "rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy",
                          selected
                            ? "border-navy bg-navy text-ivory"
                            : "border-line-strong bg-white text-ink hover:border-navy/50 hover:text-navy",
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {optionGroups.length === 0 && selectedVariant && (
          <div className="mt-7">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
              Variant
            </p>
            <p className="mt-2 text-sm font-medium text-ink">
              {selectedVariant.name}
            </p>
          </div>
        )}

        {selectedVariant && (
          <dl className="mt-7 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
                SKU
              </dt>
              <dd className="mt-1 font-medium text-ink">{selectedVariant.sku}</dd>
            </div>
            {selectedVariant.options.length > 0 && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
                  Options
                </dt>
                <dd className="mt-1 text-ink-soft">
                  {selectedVariant.options
                    .map((option) => `${option.key}: ${option.value}`)
                    .join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        )}

        {canAdd ? (
          <form action={formAction} className="mt-8">
            <input
              type="hidden"
              name="variantId"
              value={selectedVariant?.id ?? ""}
            />
            <input type="hidden" name="quantity" value={String(quantity)} />
            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label="Quantity"
                className="flex items-center rounded-md border border-line-strong bg-white"
              >
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-11 w-11 items-center justify-center text-lg text-ink transition-colors hover:bg-navy-soft/60 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-navy"
                >
                  −
                </button>
                <span
                  aria-live="polite"
                  className="w-9 text-center text-sm font-medium text-ink"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                  aria-label="Increase quantity"
                  className="flex h-11 w-11 items-center justify-center text-lg text-ink transition-colors hover:bg-navy-soft/60 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-navy"
                >
                  +
                </button>
              </div>
              <Button type="submit" disabled={pending} className="min-w-44">
                {pending ? "Adding…" : "Add to Cart"}
              </Button>
            </div>
            {!state.ok && state.message !== "" && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {state.message}
              </p>
            )}
            {state.ok && state.added && (
              <p aria-live="polite" className="mt-3 text-sm text-navy">
                Added to cart.
              </p>
            )}
          </form>
        ) : (
          <div className="mt-8 rounded-md border border-line bg-line/40 p-5 text-sm leading-6 text-ink-soft">
            This product is currently unavailable.{" "}
            <Link
              href="/shop"
              className="font-medium text-navy hover:text-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Browse the shop
            </Link>
            .
          </div>
        )}

        {product.description && (
          <div className="mt-9 border-t border-line pt-7">
            <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
              Description
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-soft">
              {product.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}