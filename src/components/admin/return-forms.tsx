"use client";

import { useEffect, useState } from "react";
import { ActionForm, Field, Select, TextInput } from "@/components/admin/ui";
import {
  createRefundAction,
  createReturnAction,
  updateRefundStatusAction,
  updateReturnStatusAction,
} from "@/lib/admin/return-actions";
import { formatGHS } from "@/lib/format";

type OrderItemOption = {
  id: string;
  variantId: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

export function ReturnForm({
  orders,
}: {
  orders: { id: string; orderNumber: string; customerName: string | null; status: string }[];
}) {
  const [orderId, setOrderId] = useState("");
  const [items, setItems] = useState<OrderItemOption[]>([]);
  const [rows, setRows] = useState<number[]>([0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    fetch(`/api/admin/order-items?orderId=${encodeURIComponent(orderId)}`)
      .then((response) => response.json())
      .then((data: { items: OrderItemOption[] }) => {
        if (cancelled) return;
        setItems(data.items);
        setRows([0]);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the order's items. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  function handleOrderChange(value: string) {
    setOrderId(value);
    if (value === "") {
      setItems([]);
      setRows([0]);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }
  }

  return (
    <div className="space-y-4">
      <ActionForm
        action={createReturnAction}
        submitLabel="Create return"
        pendingLabel="Creating…"
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Order" htmlFor="ret-order" required>
            <Select
              id="ret-order"
              name="orderId"
              required
              value={orderId}
              onChange={(event) => handleOrderChange(event.target.value)}
            >
              <option value="">Select order…</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} — {order.customerName ?? "Guest"} ({order.status})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason" htmlFor="ret-reason" required>
            <Select id="ret-reason" name="reason" required defaultValue="damaged">
              <option value="wrong_item">Wrong item</option>
              <option value="damaged">Damaged</option>
              <option value="not_as_described">Not as described</option>
              <option value="changed_mind">Changed mind</option>
              <option value="quality">Quality issue</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Reason note" htmlFor="ret-note">
            <TextInput id="ret-note" name="reasonNote" />
          </Field>
        </div>

        {orderId === "" ? (
          <p className="text-sm text-ink-faint">
            Select an order to load its items for the return.
          </p>
        ) : loading ? (
          <p className="text-sm text-ink-soft">Loading order items…</p>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink-faint">This order has no items to return.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={row} className="grid gap-2 sm:grid-cols-[1fr_90px_130px_110px_36px]">
                <Field label={index === 0 ? "Item" : undefined} htmlFor={`ret-item-${row}`}>
                  <Select
                    id={`ret-item-${row}`}
                    name={`orderItemId-${row}`}
                    required
                    onChange={(event) => {
                      const option = items.find((item) => item.id === event.target.value);
                      const refundInput = document.getElementById(
                        `ret-refund-${row}`,
                      ) as HTMLInputElement | null;
                      if (option && refundInput && refundInput.value === "") {
                        refundInput.value = String(option.quantity * option.unitPrice);
                      }
                    }}
                  >
                    <option value="">Select item…</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.variantName} ({item.sku}) · {formatGHS(item.unitPrice)} · {item.quantity} in stock
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={index === 0 ? "Qty" : undefined} htmlFor={`ret-qty-${row}`}>
                  <TextInput
                    id={`ret-qty-${row}`}
                    name={`quantity-${row}`}
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                  />
                </Field>
                <Field label={index === 0 ? "Condition" : undefined} htmlFor={`ret-cond-${row}`}>
                  <Select
                    id={`ret-cond-${row}`}
                    name={`condition-${row}`}
                    required
                    defaultValue="resellable"
                  >
                    <option value="resellable">Resellable</option>
                    <option value="not_resellable">Not resellable</option>
                  </Select>
                </Field>
                <Field
                  label={index === 0 ? "Refund amount" : undefined}
                  htmlFor={`ret-refund-${row}`}
                >
                  <TextInput
                    id={`ret-refund-${row}`}
                    name={`refundAmount-${row}`}
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </Field>
                <div className="flex items-end pb-0.5">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows((current) => current.filter((r) => r !== row))}
                      className="rounded border border-line px-2 py-1.5 text-xs text-danger hover:bg-danger-soft"
                      aria-label="Remove row"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRows((current) => [...current, current.length])}
              className="text-[11px] font-semibold text-navy hover:underline"
            >
              + Add item
            </button>
          </div>
        )}
      </ActionForm>
    </div>
  );
}

export function ReturnStatusForm({ returnId, current }: { returnId: string; current: string }) {
  return (
    <ActionForm
      action={updateReturnStatusAction}
      submitLabel="Update status"
      pendingLabel="Updating…"
      className="space-y-3"
    >
      <input type="hidden" name="returnId" value={returnId} />
      <Field label="Status" htmlFor="ret-status" required>
        <Select id="ret-status" name="status" required defaultValue={current}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="received">Received</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Field>
    </ActionForm>
  );
}

export function RefundForm({
  orders,
  returns,
  payments,
}: {
  orders: { id: string; orderNumber: string; customerName: string | null; status: string }[];
  returns: { id: string; returnNumber: string }[];
  payments: {
    id: string;
    reference: string | null;
    orderId: string;
    amount: number;
    method: string;
    status: string;
  }[];
}) {
  const [orderId, setOrderId] = useState("");
  const orderPayments = payments.filter((payment) => payment.orderId === orderId);

  return (
    <ActionForm
      action={createRefundAction}
      submitLabel="Record refund"
      pendingLabel="Recording…"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Order" htmlFor="rfd-order" required>
          <Select
            id="rfd-order"
            name="orderId"
            required
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
          >
            <option value="">Select order…</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNumber} — {order.customerName ?? "Guest"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Return (optional)" htmlFor="rfd-return">
          <Select id="rfd-return" name="returnId">
            <option value="">No linked return</option>
            {returns.map((returnRow) => (
              <option key={returnRow.id} value={returnRow.id}>
                {returnRow.returnNumber}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Original payment (optional)" htmlFor="rfd-payment">
          <Select id="rfd-payment" name="paymentId">
            <option value="">No linked payment</option>
            {orderPayments.map((payment) => (
              <option key={payment.id} value={payment.id}>
                {payment.reference ?? "—"} · {payment.method.replaceAll("_", " ")} ·{" "}
                {formatGHS(payment.amount)} ({payment.status})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (GH₵)" htmlFor="rfd-amount" required>
          <TextInput id="rfd-amount" name="amount" type="number" min="0.01" step="0.01" required />
        </Field>
        <Field label="Method" htmlFor="rfd-method" required>
          <Select id="rfd-method" name="method" required defaultValue="mobile_money">
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile money</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Refund date" htmlFor="rfd-date" required>
          <TextInput id="rfd-date" name="refundDate" type="date" required />
        </Field>
        <Field label="Reference" htmlFor="rfd-reference">
          <TextInput id="rfd-reference" name="reference" />
        </Field>
        <Field label="Reason" htmlFor="rfd-reason">
          <TextInput id="rfd-reason" name="reason" />
        </Field>
      </div>
    </ActionForm>
  );
}

export function RefundStatusForm({ refundId, current }: { refundId: string; current: string }) {
  return (
    <ActionForm
      action={updateRefundStatusAction}
      submitLabel="Update status"
      pendingLabel="Updating…"
      className="space-y-3"
    >
      <input type="hidden" name="refundId" value={refundId} />
      <Field label="Status" htmlFor="rfd-status" required>
        <Select id="rfd-status" name="status" required defaultValue={current}>
          <option value="pending">Pending</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Field>
    </ActionForm>
  );
}