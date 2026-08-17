"use client";

import { useEffect, useRef, useState } from "react";
import { completePosSaleAction } from "@/lib/pos/complete-sale";
import type {
  PosCatalogueItem,
  PosCategory,
  PosLocation,
  PosReceipt,
} from "@/lib/pos/types";
import { POS_MAX_QUANTITY } from "@/lib/pos/types";
import { coversTotal } from "@/lib/pos/format";
import { cn } from "@/lib/cn";
import { ProductBrowser } from "./product-browser";
import { CartPanel, cartSubtotal, type PosCartLine } from "./cart-panel";
import { CustomerPicker, type PosSelectedCustomer } from "./customer-picker";
import { PaymentPanel, type PosPaymentMethod } from "./payment-panel";
import { ReceiptView } from "./receipt-view";
import { PosIcon } from "./pos-icons";

export function PosRegister({
  initialItems,
  categories,
  locations,
  initialLocationId,
  canCompleteSale,
  canCreateCustomer,
}: {
  initialItems: PosCatalogueItem[];
  categories: PosCategory[];
  locations: PosLocation[];
  initialLocationId: string | null;
  canCompleteSale: boolean;
  canCreateCustomer: boolean;
}) {
  const [locationId, setLocationId] = useState<string | null>(initialLocationId);
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [customer, setCustomer] = useState<PosSelectedCustomer | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod | null>(null);
  const [cashTendered, setCashTendered] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<PosReceipt | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const requestIdRef = useRef(crypto.randomUUID());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const subtotal = cartSubtotal(lines);
  const total = subtotal;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === "Escape") {
        if (pickerOpen) setPickerOpen(false);
        else if (receipt) setReceipt(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickerOpen, receipt]);

  const addItem = (item: PosCatalogueItem) => {
    setError(null);
    setLines((current) => {
      const existing = current.find((line) => line.variantId === item.variantId);
      if (existing) {
        if (existing.quantity + 1 > Math.min(POS_MAX_QUANTITY, item.available)) {
          setError(
            `Only ${item.available} in stock for ${item.productName} at this location.`,
          );
          return current;
        }
        return current.map((line) =>
          line.variantId === item.variantId
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      if (item.available <= 0) {
        setError(`${item.productName} is out of stock.`);
        return current;
      }
      return [
        ...current,
        {
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          options: null,
          imageUrl: item.imageUrl,
          unitPrice: item.price,
          quantity: 1,
          available: item.available,
        },
      ];
    });
  };

  const setQuantity = (variantId: string, quantity: number) => {
    setError(null);
    setLines((current) => {
      if (quantity <= 0) {
        return current.filter((line) => line.variantId !== variantId);
      }
      const clamped = Math.min(POS_MAX_QUANTITY, quantity);
      return current.map((line) =>
        line.variantId === variantId ? { ...line, quantity: clamped } : line,
      );
    });
  };

  const removeLine = (variantId: string) => {
    setError(null);
    setLines((current) => current.filter((line) => line.variantId !== variantId));
  };

  const resetSale = () => {
    setLines([]);
    setCustomer(null);
    setGuestName("");
    setGuestPhone("");
    setPaymentMethod(null);
    setCashTendered("");
    setError(null);
    requestIdRef.current = crypto.randomUUID();
  };

  const handleComplete = async () => {
    if (submitting) return;
    const exceeded = lines.find((line) => line.quantity > line.available);
    if (exceeded) {
      setError(
        `Only ${exceeded.available} in stock for ${exceeded.productName}. Correct the quantity.`,
      );
      return;
    }
    const tendered = Number(cashTendered);
    if (
      paymentMethod === "cash" &&
      (!Number.isFinite(tendered) || !coversTotal(tendered, total))
    ) {
      setError("Cash tendered is below the amount due.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("requestId", requestIdRef.current);
      formData.set("locationId", locationId ?? "");
      if (customer) {
        formData.set("customerId", customer.id);
      } else {
        formData.set("guestName", guestName.trim());
        formData.set("guestPhone", guestPhone.trim());
      }
      formData.set("paymentMethod", paymentMethod as string);
      if (paymentMethod === "cash") {
        formData.set("cashTendered", cashTendered);
      }
      lines.forEach((line, index) => {
        formData.set(`variantId-${index}`, line.variantId);
        formData.set(`quantity-${index}`, String(line.quantity));
      });

      const result = await completePosSaleAction(null, formData);
      if (!result.ok) {
        setError(result.message);
      } else {
        resetSale();
        setReceipt(result.receipt);
      }
    } catch {
      setError("The sale could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-ink">Register</span>
          {locations.length > 1 ? (
            <select
              value={locationId ?? ""}
              onChange={(event) => setLocationId(event.target.value || null)}
              aria-label="Store location"
              className="h-7 rounded-md border border-line-strong bg-white px-2 text-[12px] font-medium text-ink focus:border-navy focus:outline-2 focus:outline-navy/25"
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="flex items-center gap-1.5 rounded-md border border-line-strong bg-white px-2 py-1 text-[11px] font-medium text-ink-soft">
              <PosIcon name="store" className="h-3.5 w-3.5" />
              {locations[0]?.name ?? "No location"}
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-[10px] text-ink-faint">
          <PosIcon name="keyboard" className="h-3.5 w-3.5" />
          <kbd>/</kbd> search · <kbd>Esc</kbd> close
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-2.5 py-1.5 text-[12px] text-danger"
        >
          <PosIcon name="alert" className="h-4 w-4 shrink-0" />
          {error}
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError(null)}
            className="ml-auto flex h-5 w-5 items-center justify-center rounded text-danger hover:bg-danger/10"
          >
            <PosIcon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1",
          "md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:grid-rows-[minmax(0,1fr)_auto]",
          "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_300px] lg:grid-rows-1",
        )}
      >
        <section
          className={cn(
            "order-1 flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-white",
            "h-[42vh] md:col-start-1 md:row-start-1 md:row-span-2 md:h-auto lg:col-start-1 lg:row-start-1",
          )}
        >
          <ProductBrowser
            initialItems={initialItems}
            categories={categories}
            locationId={locationId}
            initialLocationId={initialLocationId}
            searchInputRef={searchInputRef}
            onAdd={addItem}
          />
        </section>

        <section
          className={cn(
            "order-2 flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-white",
            "h-[40vh] md:col-start-2 md:row-start-1 md:h-auto lg:col-start-2 lg:row-start-1",
          )}
        >
          <CartPanel
            lines={lines}
            onSetQuantity={setQuantity}
            onRemove={removeLine}
            onClear={resetSale}
            subtotal={subtotal}
            total={total}
          />
        </section>

        <section
          className={cn(
            "order-3 flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-white",
            "md:col-start-2 md:row-start-2 lg:col-start-3 lg:row-start-1",
          )}
        >
          <PaymentPanel
            total={total}
            paymentMethod={paymentMethod}
            cashTendered={cashTendered}
            customer={customer}
            guestName={guestName}
            canCompleteSale={canCompleteSale}
            submitting={submitting}
            onMethodChange={setPaymentMethod}
            onCashTendered={setCashTendered}
            onOpenCustomerPicker={() => setPickerOpen(true)}
            onComplete={() => void handleComplete()}
          />
        </section>
      </div>

      <CustomerPicker
        open={pickerOpen}
        selected={customer}
        guestName={guestName}
        guestPhone={guestPhone}
        canCreateCustomer={canCreateCustomer}
        onClose={() => setPickerOpen(false)}
        onSelect={setCustomer}
        onGuestName={setGuestName}
        onGuestPhone={setGuestPhone}
      />

      <ReceiptView receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}