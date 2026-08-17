"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { searchPosCustomersAction, createPosCustomerAction } from "@/lib/pos/customer";
import type { PosCustomerOption } from "@/lib/pos/types";
import { cn } from "@/lib/cn";
import { PosIcon } from "./pos-icons";

export type PosSelectedCustomer = {
  id: string;
  name: string;
  phone: string;
};

export function CustomerPicker({
  open,
  selected,
  guestName,
  guestPhone,
  canCreateCustomer,
  onClose,
  onSelect,
  onGuestName,
  onGuestPhone,
}: {
  open: boolean;
  selected: PosSelectedCustomer | null;
  guestName: string;
  guestPhone: string;
  canCreateCustomer: boolean;
  onClose: () => void;
  onSelect: (customer: PosSelectedCustomer) => void;
  onGuestName: (value: string) => void;
  onGuestPhone: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosCustomerOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createState, createAction, creating] = useActionState(
    createPosCustomerAction,
    null,
  );
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || query.trim() === "") {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchPosCustomersAction(query);
        if (!cancelled) setResults(found);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  if (!open) return null;

  const activeSearch = query.trim() !== "";
  const displayedResults = activeSearch ? results : [];

  const chooseCustomer = (customer: PosCustomerOption) => {
    onSelect({ id: customer.id, name: customer.name, phone: customer.phone });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Select a customer"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-line-strong bg-ivory shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2">
          <h2 className="text-[13px] font-bold text-ink">Customer</h2>
          <button
            type="button"
            aria-label="Close customer picker"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-ink-soft transition-colors hover:bg-line/60 hover:text-ink"
          >
            <PosIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="relative mb-2">
            <PosIcon
              name="search"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, phone or code…"
              className="h-8 w-full rounded-md border border-line-strong bg-white pl-8 pr-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-navy focus:outline-2 focus:outline-navy/25"
            />
          </div>

          {searching && activeSearch && (
            <p className="flex items-center gap-1.5 py-2 text-[11px] text-ink-faint">
              <PosIcon name="loader" className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </p>
          )}

          {!searching && activeSearch && displayedResults.length === 0 && (
            <p className="py-2 text-[11px] text-ink-faint">
              No customers match “{query.trim()}”.
            </p>
          )}

          <ul className="mb-2 flex flex-col gap-1">
            {displayedResults.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => chooseCustomer(customer)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
                    selected?.id === customer.id
                      ? "border-navy bg-navy/5"
                      : "border-line bg-white hover:border-navy/40",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-ink">
                      {customer.name}
                    </span>
                    <span className="block text-[10px] text-ink-faint">
                      {customer.phone}
                      {customer.customerCode ? ` · ${customer.customerCode}` : ""}
                    </span>
                  </span>
                  {selected?.id === customer.id && (
                    <PosIcon name="check" className="h-4 w-4 shrink-0 text-navy" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="mb-2 rounded-md border border-line bg-ink-soft/40 p-2">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Walk-in guest
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={guestName}
                onChange={(event) => onGuestName(event.target.value)}
                placeholder="Guest name"
                aria-label="Walk-in guest name"
                className="h-7 min-w-0 flex-1 rounded border border-line-strong bg-white px-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:border-navy focus:outline-2 focus:outline-navy/25"
              />
              <input
                type="tel"
                value={guestPhone}
                onChange={(event) => onGuestPhone(event.target.value)}
                placeholder="Phone (optional)"
                aria-label="Walk-in guest phone"
                className="h-7 w-32 rounded border border-line-strong bg-white px-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:border-navy focus:outline-2 focus:outline-navy/25"
              />
            </div>
            {selected && (
              <p className="mt-1.5 text-[10px] text-ink-faint">
                Selected: {selected.name} — choosing a guest clears the selection.
              </p>
            )}
          </div>

          {canCreateCustomer && (
            <div className="rounded-md border border-line bg-white p-2">
              {!showCreate ? (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-line-strong px-2 py-1.5 text-[12px] font-medium text-navy transition-colors hover:border-navy hover:bg-navy/5"
                >
                  <PosIcon name="user" className="h-3.5 w-3.5" />
                  Add new customer
                </button>
              ) : (
                <form action={createAction} className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                    New customer
                  </p>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      name="firstName"
                      required
                      placeholder="First name"
                      className="h-7 min-w-0 flex-1 rounded border border-line-strong bg-white px-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:border-navy focus:outline-2 focus:outline-navy/25"
                    />
                    <input
                      type="text"
                      name="lastName"
                      required
                      placeholder="Last name"
                      className="h-7 min-w-0 flex-1 rounded border border-line-strong bg-white px-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:border-navy focus:outline-2 focus:outline-navy/25"
                    />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="Phone e.g. 024 412 3456"
                    className="h-7 rounded border border-line-strong bg-white px-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:border-navy focus:outline-2 focus:outline-navy/25"
                  />
                  {createState && (
                    <p
                      role="alert"
                      className={cn(
                        "text-[11px] leading-4",
                        createState.ok ? "text-success" : "text-danger",
                      )}
                    >
                      {createState.message}
                    </p>
                  )}
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreate(false);
                        setQuery("");
                      }}
                      className="rounded border border-line-strong px-2 py-1 text-[11px] font-medium text-ink-soft hover:border-ink-faint"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex items-center gap-1 rounded bg-navy px-2 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {creating && <PosIcon name="loader" className="h-3 w-3 animate-spin" />}
                      Create
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}