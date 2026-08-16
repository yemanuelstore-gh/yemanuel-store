export const FREE_DELIVERY_THRESHOLD = 1000;

export function freeDeliveryApplies(subtotal: number): boolean {
  return subtotal >= FREE_DELIVERY_THRESHOLD;
}