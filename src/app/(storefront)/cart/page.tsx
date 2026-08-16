import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/storefront/button-link";
import { ProductImage } from "@/components/storefront/product-image";
import { QuantityControl } from "@/components/storefront/quantity-control";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { EmptyCatalogueState } from "@/components/storefront/empty-state";
import { readCart } from "@/lib/cart";
import { clearCartAction, removeCartItemAction } from "@/lib/cart-actions";
import { getCartProductLines } from "@/lib/catalogue";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your Yemanuel Store cart.",
};

export default async function CartPage() {
  const cart = await readCart();
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
          Your cart
        </h1>
        <EmptyCatalogueState
          className="mt-8"
          title="Your cart is empty"
          description="When you find something you like, it will be waiting for you here."
        />
      </div>
    );
  }

  let lines: Awaited<ReturnType<typeof getCartProductLines>> = [];
  let failed = false;
  try {
    lines = await getCartProductLines(cart.map((item) => item.variantId));
  } catch {
    failed = true;
  }

  const unitPriceFor = (variantId: string) => {
    const line = lines.find((item) => item.variantId === variantId);
    if (!line) return null;
    return line.hasSale && line.salePrice !== null ? line.salePrice : line.price;
  };

  const availableItems = cart.filter((item) =>
    lines.some(
      (line) => line.variantId === item.variantId && line.available,
    ),
  );
  const subtotal = availableItems.reduce((total, item) => {
    const unitPrice = unitPriceFor(item.variantId);
    return unitPrice === null ? total : total + unitPrice * item.quantity;
  }, 0);

  const summary = (
    <Card className="h-fit p-6 lg:sticky lg:top-24">
      <h2 className="font-display text-lg font-medium tracking-tight text-ink">
        Order summary
      </h2>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-ink-soft">Subtotal</dt>
          <dd className="font-semibold text-ink">{formatGHS(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-ink-soft">Delivery</dt>
          <dd className="text-ink-soft">Calculated at checkout</dd>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-3">
          <dt className="font-medium text-ink">Total</dt>
          <dd className="text-lg font-semibold text-ink">
            {formatGHS(subtotal)}
          </dd>
        </div>
      </dl>
      <ButtonLink href="/checkout" className="mt-6 w-full">
        Checkout
      </ButtonLink>
      <ButtonLink
        href="/shop"
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
      >
        Continue shopping
      </ButtonLink>
      <p className="mt-4 text-xs leading-5 text-ink-faint">
        Delivery fees are confirmed at checkout. No payment is taken until your
        order is finalised.
      </p>
    </Card>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
            Your cart
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
            {itemCount} {itemCount === 1 ? "item" : "items"} in your cart.
          </p>
        </div>
        <form action={clearCartAction}>
          <button
            type="submit"
            className="text-xs font-medium text-ink-faint underline-offset-2 transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Clear cart
          </button>
        </form>
      </div>

      {failed ? (
        <RetryPanel className="mt-8" retryHref="/cart" />
      ) : (
        <>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-12">
            <ul className="divide-y divide-line border-t border-line">
              {cart.map((item) => {
                const line = lines.find(
                  (candidate) => candidate.variantId === item.variantId,
                );
                const unitPrice = unitPriceFor(item.variantId);
                const lineTotal =
                  unitPrice === null ? null : unitPrice * item.quantity;

                if (!line || !line.available) {
                  return (
                    <li
                      key={item.variantId}
                      className="flex flex-wrap items-center gap-4 py-6"
                    >
                      <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-sm border border-line bg-navy-soft">
                        <ProductImage
                          src={line?.imageUrl}
                          alt={line?.imageAlt ?? line?.productName ?? "Product"}
                          sizes="80px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">
                          {line?.productName ?? "Unavailable product"}
                        </p>
                        <p className="mt-1 text-xs text-danger">
                          This item is no longer available.
                        </p>
                      </div>
                      <form action={removeCartItemAction}>
                        <input
                          type="hidden"
                          name="variantId"
                          value={item.variantId}
                        />
                        <button
                          type="submit"
                          className="text-xs font-medium text-ink-faint underline-offset-2 transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                        >
                          Remove
                        </button>
                      </form>
                    </li>
                  );
                }

                return (
                  <li
                    key={item.variantId}
                    className="flex flex-wrap items-center gap-4 py-6"
                  >
                    <Link
                      href={`/shop/${line.productSlug}`}
                      className="relative block h-24 w-20 flex-shrink-0 overflow-hidden rounded-sm border border-line bg-navy-soft transition-colors hover:border-navy/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                    >
                      <ProductImage
                        src={line.imageUrl}
                        alt={line.imageAlt ?? line.productName}
                        sizes="80px"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/shop/${line.productSlug}`}
                        className="text-sm font-medium text-ink transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                      >
                        {line.productName}
                      </Link>
                      <p className="mt-1 text-xs text-ink-soft">
                        {line.variantName}
                        {line.optionLabels.length > 0 &&
                          ` · ${line.optionLabels
                            .map((option) => `${option.key}: ${option.value}`)
                            .join(" · ")}`}
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">SKU {line.sku}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          line.hasSale ? "text-gold-dark" : "text-ink",
                        )}
                      >
                        {unitPrice === null
                          ? "Price on request"
                          : formatGHS(unitPrice)}
                      </p>
                      {line.hasSale &&
                        line.salePrice !== null &&
                        line.price !== null && (
                          <p className="text-xs text-ink-faint line-through">
                            {formatGHS(line.price)}
                          </p>
                        )}
                    </div>
                    <div className="w-full lg:w-auto">
                      <QuantityControl
                        variantId={item.variantId}
                        quantity={item.quantity}
                      />
                    </div>
                    {lineTotal !== null && (
                      <p className="w-full text-right text-sm font-semibold text-ink lg:hidden">
                        {formatGHS(lineTotal)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="hidden lg:block">{summary}</div>
          </div>

          <div className="sticky bottom-0 z-30 mt-6 border-t border-line bg-ivory/95 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-xs text-ink-soft">Total</p>
                <p className="text-base font-semibold text-ink">
                  {formatGHS(subtotal)}
                </p>
              </div>
              <ButtonLink href="/checkout" size="sm" className="min-w-36">
                Checkout
              </ButtonLink>
            </div>
          </div>
        </>
      )}
    </div>
  );
}