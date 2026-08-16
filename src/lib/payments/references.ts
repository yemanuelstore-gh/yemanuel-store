import { randomBytes } from "node:crypto";

export function makePaymentReference(): string {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `PAY-${suffix}`;
}

export function isPaymentReference(value: string): boolean {
  return /^PAY-[0-9A-F]{8}$/i.test(value);
}