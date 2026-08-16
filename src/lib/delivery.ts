export const FREE_DELIVERY_THRESHOLD = 500;
export const FREE_DELIVERY_REGION = "Greater Accra";

export function freeDeliveryApplies(
  subtotal: number,
  regionName: string | null,
): boolean {
  return (
    regionName === FREE_DELIVERY_REGION &&
    subtotal > FREE_DELIVERY_THRESHOLD
  );
}