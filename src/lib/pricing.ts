export type PriceRow = {
  price_type: "selling" | "sale";
  amount: string;
  variant_id: string | null;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function pricingFor(
  rows: PriceRow[],
  variantId: string | null,
): { selling: number | null; sale: number | null } {
  let selling: number | null = null;
  let sale: number | null = null;
  for (const row of rows) {
    if (row.variant_id !== variantId) continue;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;
    if (row.price_type === "selling") {
      if (selling === null || amount < selling) selling = amount;
    } else if (row.price_type === "sale") {
      if (sale === null || amount < sale) sale = amount;
    }
  }
  return { selling, sale };
}

export function effectivePricing(pricing: {
  selling: number | null;
  sale: number | null;
}): { price: number | null; salePrice: number | null; hasSale: boolean } {
  if (pricing.selling === null) {
    if (pricing.sale === null) {
      return { price: null, salePrice: null, hasSale: false };
    }
    return {
      price: roundMoney(pricing.sale),
      salePrice: null,
      hasSale: false,
    };
  }
  const sale = pricing.sale;
  const hasSale = sale !== null && sale < pricing.selling;
  return {
    price: roundMoney(pricing.selling),
    salePrice: hasSale ? roundMoney(sale) : null,
    hasSale,
  };
}