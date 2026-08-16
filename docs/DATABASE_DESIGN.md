# Yemanuel Store — Database Design

**Status:** Design only. No tables, migrations, policies or data exist yet.
**Scope:** Authoritative specification for the Yemanuel Store PostgreSQL schema (Supabase), covering the customer e-commerce storefront and the internal store management (ERP) application.
**Currency:** Ghanaian Cedi (GHS / GH₵).

---

## Final Decisions (Phase 1C revision)

The following decisions are **FINAL for the initial implementation** and supersede any earlier wording in this document:

1. **Tax / VAT** — No tax rate is stored on products or variants. Tax is applied by application/business logic at sale time and preserved on the order snapshot via `taxable_amount`, `tax_rate` and `tax_amount` fields (per line and per order). No specific Ghana VAT rate is assumed (§6, §10).
2. **Inventory valuation** — **Weighted-average cost** is the initial valuation model, maintained on `inventory_items.average_cost`. Receipts recalculate the average; issues, returns and adjustments value at the current average. The design remains extensible for FIFO later (§7).
3. **Document numbers** — UUIDs remain primary keys. Human-readable document numbers (`SO-2026-00001`, `PO-2026-00001`, `GR-2026-00001`, `RET-2026-00001`, `EXP-2026-00001`, …) are generated transactionally from PostgreSQL sequences via `nextval` — never from `COUNT(*)` or existing-row counting (§17).
4. **Supplier–product relationship** — A dedicated `supplier_products` join table links suppliers to product variants with per-supplier SKU, name, last cost, preferred-supplier flag, lead time and minimum order quantity (§8).
5. **Settings scope** — `settings` supports system-wide defaults (NULL location) and location-specific overrides via a nullable `location_id`; a location-specific value overrides the system-wide default (§4).

All other approved decisions in this document remain in force.

---

## 1. Authentication & User Profiles

### What Supabase Auth owns (auth schema)

- Credentials (email/password, OTP, providers), email/phone verification state, recovery flows, MFA, and the session JWT.
- The stable user identifier: `auth.users.id` (UUID). Every app user is a row in `auth.users`.
- Auth must never store business data (names, addresses, customer codes, staff positions).

### What application tables own (public schema)

- All business and display identity: full names, phone numbers, avatars, customer records, staff records, addresses.
- The application never reads or writes `auth.users` directly; it only references the id.

### Tables

**profiles** — one row per signed-in app user; shared identity for customers and staff.
- id (PK, = `auth.users.id`, FK with cascade delete)
- full_name
- phone (nullable)
- avatar_url (nullable)
- created_at, updated_at

`profiles` is the single place where account-linked identity lives, so a person who is both a customer and a staff member has exactly one profile plus one `customers` row and one `staff` row.

**Note on customers without accounts:** a customer record is *not* tied to an account. Walk-in and guest sales must work with no `auth.users` row at all (`customers.profile_id` is nullable). Guest identity on an order is snapshotted on the order itself (see §10).

**Note on staff:** staff always have an account (`staff.profile_id` is NOT NULL), because management access requires authentication.

---

## 2. Staff, Roles & Permissions

### Design model

- **permissions** — a catalogue of discrete capabilities identified by a stable code string (e.g. `products.read`, `products.create`, `products.update`, `inventory.adjust`, `sales.create`, `sales.refund`, `customers.read`, `reports.view`, `settings.manage`).
- **roles** — named bundles of permissions (e.g. `owner`, `manager`, `cashier`, `sales_staff`).
- **role_permissions** — join table (many-to-many).
- **staff** — the business record for an authenticated employee.
- **staff_roles** — join table (many-to-many, a staff member may hold several roles).

### Tables

**permissions**
- id (PK), code (unique), description
- Rows are reference data, seeded and versioned in migrations; new permissions require a migration.

**roles**
- id (PK), code (unique), name, description, is_system (protects system roles from deletion)

**role_permissions**
- role_id (FK), permission_id (FK), composite PK

**staff**
- id (PK), profile_id (unique, FK → profiles), employee_code (unique, e.g. `STF-0001`)
- position (text), status (enum: active / inactive / suspended)
- hire_date (date, nullable), notes
- created_at, updated_at, created_by

**staff_roles**
- staff_id (FK), role_id (FK), composite PK

### Enforcement model

- **Application (server-side):** permission checks against the signed-in staff member's roles using a server helper that joins `staff → staff_roles → role_permissions → permissions`. Used by route handlers and Server Actions. Never trust client-side UI state.
- **Database (RLS):** security-definer functions (`app.has_permission('products.update')`) that resolve the current `auth.uid()` to a staff member and check permission membership. Policies call these functions; see §18.

---

## 3. Customers

### Tables

**customers**
- id (PK)
- customer_code (unique, human-readable, e.g. `CUS-0001`)
- profile_id (unique, nullable, FK → profiles) — set only when the customer has an account
- customer_type (enum: individual / business)
- first_name, last_name (individuals)
- business_name (nullable — business customers)
- phone (Ghanaian format, see §19)
- email (nullable; CI-text for case-insensitive uniqueness when present)
- tin_number (nullable — Ghana VAT/TIN for business customers)
- status (enum: active / inactive / blocked)
- notes
- created_at, updated_at, created_by

The customer record is the *business* record of truth: it exists independently of any account, so guest sales can reference it (or be order-only snapshots, §10).

**customer_addresses**
- id (PK)
- customer_id (FK)
- label (text: Home / Office / Shop / Other)
- recipient_name, recipient_phone (delivery contact — Ghanaian format)
- address_line_1, address_line_2 (nullable)
- city_id (FK → cities, nullable), region_id (FK → regions)
- postal_code (nullable)
- is_default_billing (boolean), is_default_delivery (boolean)
- notes, timestamps

An address may serve as billing and/or delivery. Order addresses are copied into a snapshot on the order at sale time (§10), so later edits to a customer address never rewrite history.

---

## 4. Stores / Locations

### Design model

Inventory, receiving, transfers and (optionally) pricing are scoped to a physical location from day one, so a second store or a warehouse never requires a redesign.

**locations**
- id (PK), code (unique, e.g. `LOC-ACC-01`)
- name, location_type (enum: store / warehouse)
- region_id (FK), city (text), address_line_1, address_line_2 (nullable)
- phone (nullable), status (enum: active / inactive)
- timestamps

Decisions:

- A single `locations` table covers stores and warehouses; `location_type` distinguishes them.
- **Sales channels are not locations.** Channel (online / in-store / future) is an order-level attribute (§10). Online orders are fulfilled from a location chosen at order time.
- Stock exists only at locations (`inventory_items`), never unassigned.
- Location-scoped pricing is optional and supported by `prices.location_id` being nullable (§6).

**settings** — key-value application configuration (store profile, business information, currency, payment configuration, delivery configuration, notification preferences, system settings).
- id (PK), key (unique per scope, see below), value (text), description (nullable)
- location_id (FK → locations, nullable — NULL = system-wide default; a non-NULL row is a location-specific override)
- is_system (boolean — protects critical values), timestamps, updated_by
- Written only by staff with `settings.manage`; never exposed to the storefront. `delivery_methods` remains the structured delivery configuration; `settings` covers everything else from the spec's Settings module.

Settings scoping rules:

- **System-wide settings:** rows with `location_id` NULL. They are the defaults.
- **Location-specific settings:** rows with `location_id` set. When a location-specific row exists for a key, it overrides the system-wide default for that location; otherwise the system-wide default applies.
- **Uniqueness:** enforced by partial unique indexes — one on `key` where `location_id IS NULL`, one on `(key, location_id)` where `location_id IS NOT NULL`. No two system-wide rows may share a key, and a location may have at most one value per key.
- **Resolution:** lookup order is location row first, system row second; the application never merges the two.
- The pattern supports future scoping beyond locations (e.g. channel-scoped settings) by adding scope columns, but no other scope is introduced now.

---

## 5. Product Catalogue

### Tables

**categories**
- id (PK), name, slug (unique)
- parent_id (FK → categories, nullable — one level of subcategory is the intended depth, arbitrary depth is permitted by the schema)
- description (nullable), image_url (nullable), sort_order
- status (enum: active / inactive)
- timestamps

**brands**
- id (PK), name, slug (unique), description (nullable), status (enum: active / inactive), timestamps

**products**
- id (PK), category_id (FK), brand_id (FK, nullable)
- name, slug (unique), description (nullable)
- status (enum: draft / active / inactive / archived)
- timestamps

**product_variants** — every saleable configuration.
- id (PK), product_id (FK)
- name (e.g. "M / Black" or "Default")
- sku (unique, NOT NULL — the only SKU authority)
- barcode (unique, nullable)
- options (JSONB object, e.g. `{"Colour": "Black", "Size": "M"}`) — nullable; empty/absent for simple products
- status (enum: active / inactive)
- timestamps

**product_images**
- id (PK), product_id (FK)
- variant_id (FK, nullable — images specific to one variant)
- url, alt_text (nullable), sort_order, is_primary (boolean; at most one primary per product via partial unique index)
- timestamps

### Product/variant convention (important)

- **Every saleable product has at least one variant row.** Simple products get a single default variant (created automatically, named after the product, no `options`).
- Rationale: stock, pricing, order items, purchase items and receipts all reference `product_variants` through one FK. A "product or variant" polymorphic pair in every downstream table would be error-prone and complicate RLS.
- SKU uniqueness therefore lives in one place: `product_variants.sku` (unique). SKUs are never stored on `products`.
- Fashion and electronics are both served by the same model: variants carry option values; images attach at product or variant level; category drives storefront grouping.

---

## 6. Pricing

### Design model

One **prices** table records every price as a dated, typed row. There is no separate "price history" table — history *is* the table.

**prices**
- id (PK)
- product_id (FK, nullable) / variant_id (FK, nullable) — exactly one must be set (check constraint)
- price_type (enum: selling / sale)
- amount (numeric(14,2))
- location_id (FK, nullable — NULL means "all locations"; a location-specific row overrides the general one)
- valid_from (timestamptz, NOT NULL), valid_to (timestamptz, nullable — NULL = open-ended)
- created_at, created_by

Rules:

- **Selling price** at any moment = the latest `selling` row whose window contains that moment (for the order's location, falling back to the location-independent row).
- **Sale price** = an active `sale` row; the storefront shows it when present and the original `selling` price when not. Sale windows are just `valid_from`/`valid_to` — no separate discount machinery is needed for catalogue sales.
- **Cost is not a price row.** With weighted-average cost adopted (§7), the working cost of stock lives on `inventory_items.average_cost`; the latest quoted cost per supplier lives on `supplier_products.last_cost` (§8). `price_type` covers only `selling` and `sale`.
- **Tax is not a price row either** — products and variants carry no tax rate; tax is applied at sale time by business logic and snapshotted on the order (§10).
- Order-level discounts are captured on the order (§10), not in `prices`.

### Money storage

- All monetary columns are `numeric(14,2)` — never `float`/`double precision`. Numeric is exact, so GHS amounts (cedis and pesewas) cannot suffer rounding drift. The JavaScript layer receives numerics as strings via Supabase and must convert with integer-pesewa arithmetic or exact decimal handling.
- Currency is implicitly GHS everywhere; no currency column is added because the application is single-currency by design. If multi-currency is ever needed, it becomes a deliberate project, not a column.

---

## 7. Inventory

### Tables

**inventory_items** — the authoritative current stock row per location per variant.
- id (PK)
- location_id (FK), variant_id (FK), unique (location_id, variant_id)
- quantity_on_hand (numeric(14,3), NOT NULL, default 0)
- reserved_quantity (numeric(14,3), NOT NULL, default 0)
- average_cost (numeric(14,2), NOT NULL, default 0) — weighted-average cost per unit for this location+variant (valuation model, §7)
- reorder_level (numeric(14,3), nullable), reorder_quantity (numeric(14,3), nullable)
- timestamps

**stock_movements** — append-only ledger explaining every change to on-hand stock.
- id (PK)
- inventory_item_id (FK)
- movement_type (enum: opening_stock / purchase_receipt / sale / sale_return / transfer_out / transfer_in / adjustment / damage)
- quantity_change (numeric(14,3), signed: positive in, negative out)
- unit_cost (numeric(14,2), nullable — snapshot at movement time)
- source_type (text) + source_id (uuid) — reference to the originating document (goods receipt, order, transfer, adjustment). This is a deliberate polymorphic reference kept as two indexed columns because ledgers legitimately span many document types.
- note (nullable), created_at, created_by

**stock_transfers** — inter-location movement.
- id (PK), transfer_number (unique, e.g. `TRF-2026-00001`)
- from_location_id (FK), to_location_id (FK), status (enum: draft / in_transit / received / cancelled)
- notes, timestamps, created_by

**stock_transfer_items**
- id (PK), transfer_id (FK), variant_id (FK)
- quantity (numeric(14,3))
- status (enum: pending / shipped / received) — per-line, so partial transfers work
- timestamps

**stock_adjustments** — audited manual corrections.
- id (PK), adjustment_number (unique, e.g. `ADJ-2026-00001`)
- reason (text), status (enum: draft / applied / cancelled)
- timestamps, created_by

**stock_adjustment_items**
- id (PK), adjustment_id (FK), inventory_item_id (FK)
- reason (text), quantity_change (numeric(14,3), signed)
- timestamps

### Calculation model

```
available_stock = quantity_on_hand - reserved_quantity
```

- `inventory_items.quantity_on_hand` is **authoritative** for current stock.
- `stock_movements` is the **explanatory ledger**: every change to on-hand is one signed movement row, written in the same transaction as the update to `inventory_items` (application code or a database function; decided at implementation time).
- `reserved_quantity` is raised when an order is confirmed (stock held for that order) and released when the order is cancelled or fulfilled. It is never negative.

### Weighted-average cost model (FINAL)

`inventory_items.average_cost` is the working valuation cost per unit, tracked per location+variant. All arithmetic uses exact numerics.

**Purchase receipts (average cost change):**

```
new_average_cost = (old_average_cost × old_quantity_on_hand + unit_cost_actual × quantity_received)
                   / (old_quantity_on_hand + quantity_received)
```

- The receipt writes a `purchase_receipt` movement with `unit_cost = unit_cost_actual` (the evidence), then recalculates `average_cost`.
- If `quantity_on_hand` is zero before the receipt, the new `average_cost` simply equals `unit_cost_actual` (no weighting against stale cost).

**Stock issues (no average-cost change):** sales, transfer-out, damage and negative adjustments reduce `quantity_on_hand` and reduce inventory value at the *current* `average_cost`. The movement records that `unit_cost` as the cost snapshot; `average_cost` itself is unchanged.

**Returns (`sale_return`, +):** increase `quantity_on_hand` at the current `average_cost`. Value added = quantity × average cost; the average cost is unchanged.

**Adjustments (+):** value in at the current `average_cost` unless the adjustment explicitly carries a cost (e.g. a damaged write-off with a recorded cost); the average cost changes only when a receipt or an explicit-cost adjustment moves it. Negative adjustments value at the current average.

**Transfers:** `transfer_out` values out at the source location's `average_cost`; `transfer_in` brings the stock in at the destination's `average_cost`. Destination average cost is recalculated as a weighted blend with the transferred quantity at the source's average cost, so value is conserved across the move.

**Valuation (reports):** on-hand × `average_cost`, computed in queries — no valuation table.

**FIFO extensibility:** `stock_movements.unit_cost` and the dated receipt history already capture per-lot costs, so a future FIFO costing layer can be added (e.g. a per-lot cost table) without redesigning the ledger or order snapshot. Only the valuation queries and the costing function change.

### Lifecycle rules

- Opening stock: an `opening_stock` movement per item at setup, setting both `quantity_on_hand` and `average_cost`.
- Purchase receipt: `purchase_receipt` movements (+), written when goods are received (§9), then average cost recalculated.
- Sale: on fulfilment, one `sale` movement (−) per item at the current `average_cost` and reservation released; the order item's `unit_cost` snapshot equals that average (§10).
- Return: `sale_return` (+); if the item is damaged on return, a `damage` adjustment instead (§13).
- Transfer: `transfer_out` (−) at the source when shipped, `transfer_in` (+) at the destination when received.
- Manual corrections: `stock_adjustments` lines produce `adjustment` movements and may target damaged goods explicitly.

---

## 8. Suppliers

### Tables

**suppliers**
- id (PK), supplier_code (unique, e.g. `SUP-0001`)
- name, contact_person (nullable)
- phone, email (nullable), website (nullable)
- status (enum: active / inactive)
- payment_terms_days (integer, nullable), notes
- timestamps, created_by

**supplier_contacts** — additional people at the supplier.
- id (PK), supplier_id (FK), name, role (nullable), phone, email (nullable), is_primary (boolean), timestamps

**supplier_addresses**
- id (PK), supplier_id (FK)
- label (nullable), address_line_1, address_line_2 (nullable), city (text), region_id (FK), postal_code (nullable), timestamps

Supplier addresses use free-text city (reference data matters more for customer-facing addresses); region still references the `regions` table.

**supplier_products** — the supplier–product relationship (FINAL): which variants each supplier supplies, and the purchasing defaults for that pairing.
- id (PK)
- supplier_id (FK), variant_id (FK) — unique (supplier_id, variant_id): a supplier supplies a variant at most once
- supplier_sku (text, nullable — the SKU the supplier uses for this item)
- supplier_product_name (text, nullable — the supplier's own name for the item)
- last_cost (numeric(14,2), nullable — latest quoted unit cost from this supplier; informs PO defaults and purchasing decisions)
- preferred_supplier (boolean, default false — at most one preferred supplier per variant, enforced by a partial unique index on variant_id where preferred_supplier is true)
- lead_time_days (integer, nullable), minimum_order_quantity (numeric(14,3), nullable)
- is_active (boolean, default true — soft-suppression of a pairing without deleting history)
- timestamps

Indexing:

- unique (supplier_id, variant_id) — the pairing key.
- index (variant_id) — find every supplier that supplies a variant.
- index (supplier_id) — list a supplier's catalogue (included in the unique index's leading column).
- partial unique index on (variant_id) where preferred_supplier is true — at most one preferred supplier per variant.
- `last_cost` is a working value, not an accounting record; actual purchase costs always come from `goods_receipt_items.unit_cost_actual` (§9).

---

## 9. Purchases

### Design model

Purchase orders are planned quantities at expected cost; receiving records reality at actual cost; invoices are the supplier's billing; payments settle them. Partial receiving and partial payment are supported by per-line quantities and per-invoice payment rows.

### Tables

**purchase_orders**
- id (PK), po_number (unique, e.g. `PO-2026-00001`)
- supplier_id (FK), location_id (FK — receiving location)
- status (enum: draft / sent / partially_received / received / cancelled)
- expected_date (date, nullable), notes
- timestamps, created_by, approved_by (nullable)

**purchase_order_items**
- id (PK), purchase_order_id (FK), variant_id (FK)
- quantity_ordered (numeric(14,3))
- unit_cost_expected (numeric(14,2))
- quantity_received (numeric(14,3), default 0 — tracked per line for partial receiving)
- timestamps

**goods_receipts**
- id (PK), receipt_number (unique, e.g. `GR-2026-00001`)
- purchase_order_id (FK, nullable — receipts may be created without a PO)
- location_id (FK), received_date (date), status (enum: draft / completed / cancelled)
- notes, timestamps, created_by

**goods_receipt_items**
- id (PK), goods_receipt_id (FK)
- purchase_order_item_id (FK, nullable — links back when receiving against a PO)
- variant_id (FK)
- quantity_received (numeric(14,3))
- unit_cost_actual (numeric(14,2)) — the real cost snapshot; may differ from the PO
- timestamps

Receiving rules:

- Completing a goods receipt writes `purchase_receipt` stock movements (with `unit_cost = unit_cost_actual`), increments `purchase_order_items.quantity_received`, **recalculates the location's weighted-average cost** for the variant (§7), optionally refreshes `supplier_products.last_cost`, and rolls the PO to `partially_received` or `received`.

**supplier_invoices**
- id (PK), invoice_number (text — the supplier's own number)
- supplier_id (FK), purchase_order_id (FK, nullable)
- invoice_date (date), due_date (date, nullable)
- amount (numeric(14,2)) — may differ from PO totals (freight, discounts, price differences)
- status (enum: pending / partially_paid / paid / cancelled)
- notes, timestamps, created_by

**purchase_payments**
- id (PK), supplier_id (FK)
- invoice_id (FK, nullable), purchase_order_id (FK, nullable) — an advance against a PO with no invoice yet is allowed; the payment still settles on the invoice when it arrives (application logic)
- amount (numeric(14,2)), payment_date (date)
- method (enum: cash / mobile_money / card / bank_transfer / other)
- reference (nullable — provider/transaction reference), notes
- timestamps, created_by

Partial payment is simply multiple rows against one invoice; invoice status is derived from the summed allocations.

---

## 10. Sales / Orders

### Tables

**orders**
- id (PK), order_number (unique, e.g. `SO-2026-00001`)
- customer_id (FK → customers, nullable — in-store and guest sales may have no customer record)
- channel (enum: online / in_store) — extensible for future channels
- status (enum: pending / confirmed / processing / shipped / delivered / cancelled)
- payment_status (enum: unpaid / partially_paid / paid / refunded / partially_refunded)
- fulfilment_status (enum: unfulfilled / partially_fulfilled / fulfilled)
- location_id (FK — fulfilment location)
- guest snapshot: guest_name, guest_phone, guest_email (all nullable — filled only when there is no customer record)
- billing snapshot: bill_to_recipient, bill_to_phone, bill_to_address_line_1, bill_to_address_line_2, bill_to_city, bill_to_region (nullable)
- delivery snapshot: delivery_method_name (text), delivery_fee (numeric(14,2), default 0), delivery_recipient, delivery_phone, delivery_address_line_1, delivery_address_line_2, delivery_city, delivery_region (nullable)
- money: subtotal (numeric(14,2), default 0), discount_total (numeric(14,2), default 0), delivery_fee (numeric(14,2), default 0), taxable_amount (numeric(14,2), default 0), tax_amount (numeric(14,2), default 0), tax_rate (numeric(5,2), nullable — blended/representative rate for reference only), total_amount (numeric(14,2), default 0)
- notes, timestamps, created_by, updated_by (nullable)

**order_items**
- id (PK), order_id (FK), variant_id (FK, nullable — retained for analytics even if the variant is later deleted)
- quantity (numeric(14,3))
- product snapshot: product_name (text), variant_name (text), sku (text), options (JSONB, nullable)
- unit_price (numeric(14,2)), unit_cost (numeric(14,2), nullable — the location's weighted-average cost at the time of sale, §7; snapshot for margin reporting)
- discount_amount (numeric(14,2), default 0), line_total (numeric(14,2))
- tax snapshot: taxable_amount (numeric(14,2), default 0), tax_rate (numeric(5,2), nullable), tax_amount (numeric(14,2), default 0)
- timestamps

### Tax / VAT snapshot (FINAL)

- **Products and variants carry no tax rate** (§6). Tax calculation lives in application/business logic, which reads the applicable configuration (e.g. a `settings` value) at the moment of sale and applies it to the taxable base.
- The snapshot fields `taxable_amount`, `tax_rate` and `tax_amount` exist **per line** (order_items) and are **aggregated on the order** (order-level `taxable_amount`/`tax_amount`; `tax_rate` stores the blended rate for display/reference).
- Per-line snapshots mean a mixed order (different rates or exempt lines) remains fully reconstructable forever, even if rates or rules change later.
- No specific Ghana VAT rate is hard-coded in the schema or assumed by the design; the rate applied is whatever is configured and current at sale time.

### Financial snapshot principle (critical)

An order is a **point-in-time financial document**. Every price, name, cost, fee and tax figure is copied onto the order/order item at sale time. Later changes to product prices, variant names, SKUs, delivery fees or tax rates never rewrite historical orders. `orders` and `order_items` are immutable in practice — corrections happen through returns, refunds and (for mistakes) explicit reversal workflows, never in-place edits of money columns.

### Totals arithmetic

```
line_total      = (unit_price × quantity) − line discount
subtotal        = Σ order_items.line_total
discount_total  = Σ line discounts + any order-level discount
taxable_amount  = Σ order_items.taxable_amount   (taxable base per line, per business rules)
tax_amount      = Σ order_items.tax_amount        (each line: taxable_amount × its tax_rate)
total_amount    = subtotal − discount_total + delivery_fee + tax_amount
```

All columns are stored (denormalised totals, not computed columns), so reports and receipts never re-derive history. Delivery fee taxability follows business rules at sale time and is reflected in the snapshots.

### Order lifecycle and stock

1. `pending` — no stock effect.
2. `confirmed` — reservations raised (`reserved_quantity`).
3. `processing` / `shipped` — no stock change; fulfilment tracked.
4. `delivered` (or pickup) — `sale` movements written, reservations released, `fulfilment_status = fulfilled`.
5. `cancelled` — reservations released; if items were already fulfilled, the reversal is a return flow (§13).

---

## 11. Payments

### Tables

**payments**
- id (PK), order_id (FK)
- amount (numeric(14,2))
- method (enum: cash / mobile_money / card / bank_transfer / other)
- status (enum: pending / authorized / paid / void / refunded)
- payment_date (timestamptz)
- reference (nullable — provider or gateway transaction reference)
- provider (text, nullable — e.g. a mobile-money provider code; **no provider is hard-coded**, the column is extensible for future integrations)
- provider_reference (nullable — raw gateway data)
- notes (nullable), received_by (FK → staff, nullable), timestamps

### Rules

- An order can have many payments (split cash + mobile money, partial payments over time). `orders.payment_status` is derived from the sum of `payments.amount` (excl. voids/refunds) versus `orders.total_amount`.
- Refunds are a separate flow (§13) and may reference a specific payment.
- Provider fields are free-form text precisely because no provider is chosen yet; a later integration can add structured columns without breaking history.

---

## 12. Delivery

### Tables

**delivery_methods** — configured options (e.g. standard delivery, express, in-store pickup).
- id (PK), code (unique), name
- fee (numeric(14,2), nullable — fixed fee; NULL means fee is set per order or configured by rules later)
- is_active (boolean), sort_order, timestamps

**deliveries**
- id (PK), order_id (FK)
- delivery_method_id (FK, nullable) plus method_name snapshot (text)
- status (enum: pending / processing / shipped / delivered / failed / cancelled)
- carrier (text, nullable), tracking_reference (text, nullable)
- delivered_at (timestamptz, nullable)
- notes, timestamps

The shipping address lives on the order snapshot (§10); the delivery row tracks execution status and references. Ghanaian addresses are served by `regions`/`cities` reference data (§19) copied into the order snapshot at sale time.

---

## 13. Returns & Refunds

### Distinctions (explicit)

| Term | Meaning |
| --- | --- |
| **Cancellation** | Order never fulfilled (or only partly). Stock reservations are released; paid amounts are refunded; no goods come back. |
| **Return** | Goods come back after fulfilment (full or partial). Stock and possibly money are affected. |
| **Refund** | Money goes back to the customer. May accompany a return or a cancellation; may also be standalone (goodwill). |

### Tables

**returns**
- id (PK), return_number (unique, e.g. `RET-2026-00001`)
- order_id (FK), customer_id (FK, nullable)
- status (enum: pending / approved / received / rejected / cancelled)
- reason (enum: wrong_item / damaged / not_as_described / changed_mind / quality / other) + reason_note (nullable)
- created_by (FK → staff, nullable — staff-initiated returns), approved_by (FK → staff, nullable)
- timestamps

**return_items**
- id (PK), return_id (FK), order_item_id (FK — links to the original line), variant_id (FK)
- quantity_returned (numeric(14,3))
- condition (enum: resellable / not_resellable)
- refund_amount (numeric(14,2), nullable — computed from the order item snapshot when refunding)
- timestamps

**refunds**
- id (PK), refund_number (unique, e.g. `RF-2026-00001`)
- order_id (FK), payment_id (FK, nullable — the payment being reversed), return_id (FK, nullable)
- amount (numeric(14,2)), method (enum: cash / mobile_money / card / bank_transfer / other)
- status (enum: pending / processed / failed / cancelled)
- reference (nullable), reason (nullable), processed_by (FK → staff, nullable)
- timestamps

### Stock consequences of a return

- Approved + received + `resellable` → `sale_return` movement (+ on hand), item available again.
- Approved + received + `not_resellable` → `damage` movement (off-shelf write-off), no stock added.
- Refund amount is taken from the *order item snapshot* (unit price at sale time), never the current product price.

---

## 14. Expenses

### Tables

**expense_categories**
- id (PK), name (unique), description (nullable), is_active (boolean), timestamps

**expenses**
- id (PK), category_id (FK)
- description, amount (numeric(14,2))
- expense_date (date)
- method (enum: cash / mobile_money / card / bank_transfer / other)
- reference_number (nullable — receipt/invoice/transaction reference)
- supplier_id (FK, nullable — vendor when the expense relates to a supplier)
- location_id (FK, nullable — which location incurred it)
- attachment_url (nullable), notes
- timestamps, created_by

Expenses deliberately reuse the `payment_method` enum type and keep supplier linkage optional, so petty-cash purchases and supplier-related costs share one table.

---

## 15. Audit Logging

### Table

**audit_logs**
- id (PK)
- actor_id (uuid, FK → auth.users, nullable — NULL for system/automated actions)
- action (text, e.g. `products.update`, `inventory.adjust`, `staff.assign_role`)
- entity_type (text — table/domain name), entity_id (uuid — the affected row; no FK, entities may be deleted)
- before (JSONB, nullable), after (JSONB, nullable) — changed field snapshots, not full rows
- metadata (JSONB, nullable — extra context such as source document numbers)
- created_at

### Rules

- Written by application code on privileged mutations (and by database functions where enforcement belongs in the database).
- **Never log secrets or raw payment credentials.** Sensitive fields (payment references, passwords, tokens) are excluded or masked; audit rows reference entity ids, not card/bank details.
- `entity_type`/`entity_id` are intentionally FK-less: the audited row may be deleted while its audit trail must survive. The pair is indexed for lookup.
- PII minimisation: audit stores what changed, not unrelated customer data. Retention policy is a deployment/settings concern.
- Privacy: audit rows are staff-only under RLS (§18).

---

## 16. Reporting Foundations

### Principle

**Reports are queries over transactional data — never snapshot tables.** Every report domain in the spec (sales, revenue, products, inventory, customers, purchases, expenses, profitability) can be answered from the tables above:

- Sales & revenue: `orders` (status = delivered/paid scope) joined to `order_items`, `payments`, `refunds`.
- Product performance: `order_items` by variant with `unit_cost`/`unit_price` snapshots (profitability needs no live price lookup).
- Inventory: `inventory_items` + `stock_movements`; valuation is on-hand × weighted-average cost (`inventory_items.average_cost`, §7).
- Purchases: `purchase_orders`, `goods_receipts`, `supplier_invoices`, `purchase_payments`.
- Expenses: `expenses` by category/date.
- Customers: `customers` + `orders` + `customer_addresses`.

### Justified database support (decided at implementation time, not now)

- **Indexes** over aggregates that are queried constantly: see the index list in §22.
- **Materialized views** only when a real dashboard query proves slow — the first likely candidate is a daily sales summary (orders × payments × refunds grouped by day). They will be introduced with a refresh strategy (on-demand or scheduled), not speculatively.
- **No report tables.** Nothing is pre-aggregated into tables because reports exist.

---

## 17. Database Conventions

| Concern | Decision |
| --- | --- |
| Primary keys | UUID (`gen_random_uuid()`) on every table. UUIDs are collision-safe, non-enumerable, and align with `auth.users.id` (UUID). No bigint identities. |
| Timestamps | `timestamptz`, stored in UTC; format for display in the application layer (Africa/Accra). `created_at` and `updated_at` on every business table, default `now()`. |
| updated_at maintenance | A single `set_updated_at()` function + trigger, defined once in Migration 1, applied to every table with an `updated_at` column. |
| Naming | `snake_case` tables and columns; plural table names; singular enum values; type names `snake_case`. Foreign keys named `<singular_table>_id`. |
| Enums | PostgreSQL native enum types for closed, stable lists (statuses, methods, movement types). TEXT + CHECK only where values are open-ended (e.g. `provider`, `carrier`). Adding an enum value later requires a migration — acceptable for a managed schema. |
| Nullable vs required | Business tables: `created_at`, `updated_at`, status, and identity/amount fields NOT NULL where they are structurally required (see each section). Optional references (brand, supplier, payment reference) nullable. |
| Soft deletion | **Avoided by default.** Business rows are archived via status (`archived`, `inactive`, `cancelled`), preserving history and foreign keys. No `deleted_at` columns unless a future requirement proves one necessary. |
| Money | `numeric(14,2)` everywhere (§6). Never float. |
| Quantity | `numeric(14,3)` everywhere (§7). Three decimals support fractional units (fabric, rice in kg, etc.) without float error. |
| SKU uniqueness | Single authority: `product_variants.sku` unique NOT NULL. Products never carry SKUs. |
| Barcodes | `product_variants.barcode` unique when present. |
| Document numbers | Human-readable, unique text columns per document type (`SO-2026-00001`, `PO-2026-00001`, `GR-2026-00001`, `RET-2026-00001`, `RF-2026-00001`, `TRF-2026-00001`, `ADJ-2026-00001`, `EXP-2026-00001`, plus plain codes `CUS-0001`, `SUP-0001`, `STF-0001`). **FINAL:** generated transactionally from dedicated PostgreSQL sequences (`nextval`), formatted as `PREFIX-YYYY-NNNNN` by a single database helper function; a per-type unique constraint remains the safety net. Never derived from `COUNT(*)` or existing-row counts. The year in the prefix comes from the current date at generation time, so sequences never need resetting at year boundaries; sequence gaps from rolled-back transactions are acceptable. `nextval` is atomic and concurrency-safe by definition. |
| created_by / updated_by | UUID columns referencing `auth.users` on internal business tables (purchases, adjustments, expenses, audit). Never rendered to customers. |
| Case-insensitive email | CI-text column type (citext extension) for `email` columns that must be unique case-insensitively. |
| Citext / UUID extensions | Enabled in Migration 1 (`pgcrypto` for gen_random_uuid, `citext`). |
| Schema | Application tables in the `public` schema, app helper functions in an `app` schema, Supabase-managed tables in `auth`/`storage` remain untouched. |
| Concurrency | Optimistic versioning is not introduced globally; money-adjacent mutations (reservations, stock, payments) are protected by row-level transactions in the application and strict RLS. |

---

## 18. Row Level Security

### Strategy

RLS is enabled on every `public` business table. Three capability tiers, enforced by policies:

| Tier | Who | Typical access |
| --- | --- | --- |
| **Public storefront** | `anon` role | Read-only on catalogue and reference data; **only** rows that are active/visible (product status = active, variants active, prices whose window contains now, active delivery methods, regions/cities). Never financial or customer data. |
| **Authenticated customer** | `authenticated` via `auth.uid()` = own `profiles.id` | Own profile row; own customer record; own addresses; own orders (read + create), own payments (read), own deliveries (read), own returns (create + read). Cannot read other customers' rows. |
| **Staff** | `authenticated` where `app.has_permission(code)` | Fine-grained by permission code per table/operation (§2). RLS policies call the security-definer helper, which resolves roles through `staff_roles → role_permissions`. |

### Per-domain intent

- **Catalogue (categories, brands, products, variants, product_images, prices):** `anon` select on active rows; staff select/update by `products.*` permissions; create/delete by `products.create`.
- **Customers, customer_addresses:** customer sees own rows; staff by `customers.read` (and `customers.create/update` for mutation). Customers never see other customers' data through customer-facing queries.
- **Orders, order_items, payments, deliveries, returns, refunds:** customer sees own documents (read); staff by `sales.*`/`orders.*` permission codes; creation of orders/payments server-side with staff or customer context.
- **Inventory (inventory_items, stock_movements, transfers, adjustments):** staff only (`inventory.*`), with `inventory.adjust` required for adjustments. Stock is never exposed to `anon`.
- **Purchasing (suppliers, supplier_products, purchase_orders, goods_receipts, supplier_invoices, purchase_payments):** staff only (`purchases.*`, `suppliers.*`).
- **Expenses:** staff only (`expenses.*`).
- **Staff, roles, permissions, staff_roles:** staff only, restricted to `settings.manage` / `staff.manage` for writes; staff may read their own profile.
- **Audit logs:** staff only (`reports.view` or `audit.view`); never anon or customers.
- **Reference data (regions, cities, delivery_methods, settings):** readable by `anon` and `authenticated` where public (regions/cities/delivery methods); settings are staff-only and managed by `settings.manage`.

**Policy writing is deferred to the RLS migration stage (§22) — no policies are written in this phase.**

---

## 19. Ghana-Specific Requirements

- **Currency:** GHS everywhere; `numeric(14,2)`; display formatting (GH₵) is an application concern (`src/lib/format.ts`).
- **Phone numbers:** Ghanaian formats (10-digit local `0XX…`, or `+233…`). Stored as plain text with application-level validation/formatting via `formatGhanaPhone`; no per-table phone format column. Customer, guest, supplier, delivery and recipient phones all use the same convention.
- **Regions & cities:**
  - **regions** (reference table): id, code (unique, e.g. `ACC`), name (all 16 Ghana regions).
  - **cities** (reference table): id, region_id (FK), name, is_active. Seeded with major Ghanaian cities.
  - Customer addresses reference both (city + region) for delivery routing; order snapshots copy the text so history survives renames.
- **Payments:** `payment_method` enum includes `cash`, `mobile_money`, `card`, `bank_transfer`, `other` — reused by payments, purchase payments and expenses.
- **Mobile money:** no specific provider is hard-coded. `payments.provider` and `payments.reference` are free-form; provider-specific integration is a later phase that extends these columns.
- **Delivery:** local delivery operations supported via `delivery_methods` (per-method fees) and `deliveries` (status + tracking). Delivery fees are snapshotted on the order.

---

## 20. Relationship Diagram (text ER)

```
auth.users (Supabase)
   │ 1:1
   ├────────── profiles ◄──────────┐
   │             │ 1:0..1          │
   │             ├── staff ──N:1───┘ (staff_roles: staff N:N roles)
   │             │                    roles N:N permissions (role_permissions)
   │             └── customers (profile_id nullable)
   │
   │  created_by/updated_by/actor references on many internal tables
   │
   ▼
regions 1:N cities
locations ──┐        customers 1:N customer_addresses ──N:1 cities/regions
            │
categories 1:N categories (parent)   brands
   │                                   │
products N:1 categories, N:1 brands    │
   │ 1:N                                │
product_variants N:1 products ◄────────┘
   │ 1:N                                │
   ├── product_images (variant_id nullable, product_id)
   ├── prices (product_id XOR variant_id, location_id nullable)
   ├── inventory_items 1:1 pair (location_id + variant_id)
   │       ├── 1:N stock_movements (ledger)
   │       ├── 1:N stock_adjustment_items N:1 stock_adjustments
   │       └── stock_transfer_items N:1 stock_transfers (from→to location)
   ├── order_items N:1 orders
   ├── purchase_order_items N:1 purchase_orders
   └── goods_receipt_items N:1 goods_receipts

orders 1:N order_items ──N:1 variants
orders 1:N payments
orders 1:N deliveries N:1 delivery_methods
orders 1:N returns 1:N return_items ──N:1 order_items
orders 1:N refunds (payment_id, return_id optional links)
orders 1:N customer_id → customers (nullable)

suppliers 1:N supplier_contacts / supplier_addresses
suppliers N:N product_variants via supplier_products (supplier_sku, last_cost, preferred_supplier)
suppliers 1:N purchase_orders 1:N purchase_order_items ──N:1 variants
purchase_orders 1:N goods_receipts 1:N goods_receipt_items (→ po_items, variants)
suppliers 1:N supplier_invoices (purchase_order_id nullable)
supplier_invoices 1:N purchase_payments (purchase_order_id nullable)

expense_categories 1:N expenses (supplier_id, location_id nullable)

settings (location_id nullable → locations): system-wide rows override by location rows
audit_logs — polymorphic (entity_type + entity_id), actor → auth.users
```

---

## 21. Table Inventory

**45 tables proposed.** Legend: Fin = contains financial data (money columns); RLS = requires row level security.

| Table | Purpose | PK | Key relationships | Fin | RLS |
| --- | --- | --- | --- | --- | --- |
| profiles | Shared identity for signed-in users | id | → auth.users; 1:1 staff, 1:0..1 customers | – | yes |
| roles | Role definitions | id | N:N permissions via role_permissions | – | yes |
| permissions | Permission catalogue | id | N:N roles via role_permissions | – | yes |
| role_permissions | Role ↔ permission join | composite | → roles, permissions | – | yes |
| staff | Employee business record | id | → profiles; N:N roles via staff_roles | – | yes |
| staff_roles | Staff ↔ role join | composite | → staff, roles | – | yes |
| customers | Customer business records | id | → profiles (nullable); 1:N orders, addresses | – | yes |
| customer_addresses | Customer billing/delivery addresses | id | → customers, cities, regions | – | yes |
| regions | Ghana region reference data | id | 1:N cities | – | read-only |
| cities | Ghana city reference data | id | → regions | – | read-only |
| locations | Stores & warehouses | id | → regions; 1:N inventory_items, transfers, receipts | – | yes |
| settings | Scoped key-value application configuration (system-wide + location overrides) | id | → locations (nullable); standalone (managed by `settings.manage`) | – | yes |
| categories | Product categories/subcategories | id | self-parent; 1:N products | – | yes |
| brands | Product brands | id | 1:N products | – | yes |
| products | Products (no SKU/pricing) | id | → categories, brands; 1:N variants/images | – | yes |
| product_variants | Saleable configurations (SKU authority) | id | → products; 1:N prices, inventory, order items, purchase items, receipts, return items; N:N suppliers via supplier_products | – | yes |
| product_images | Product/variant images | id | → products, variants (nullable) | – | yes |
| prices | Dated, typed prices (selling/sale) | id | → products/variants (XOR), locations (nullable) | **yes** | yes |
| inventory_items | Authoritative stock + weighted-average cost per location+variant | id | → locations, variants | **yes** (average_cost) | yes |
| stock_movements | Append-only stock ledger | id | → inventory_items | **yes** (unit_cost) | yes |
| stock_transfers | Inter-location transfer headers | id | → locations (from/to) | – | yes |
| stock_transfer_items | Transfer lines (per-line status) | id | → transfers, variants | – | yes |
| stock_adjustments | Audited stock corrections | id | 1:N adjustment items | – | yes |
| stock_adjustment_items | Adjustment lines | id | → adjustments, inventory_items | – | yes |
| suppliers | Supplier records | id | 1:N contacts, addresses, supplier_products, POs, invoices, expenses | – | yes |
| supplier_contacts | Supplier people | id | → suppliers | – | yes |
| supplier_addresses | Supplier locations | id | → suppliers, regions | – | yes |
| supplier_products | Supplier–variant pairing (SKU, last cost, preferred, lead time, MOQ) | id | → suppliers, variants; unique (supplier_id, variant_id) | **yes** (last_cost) | yes |
| purchase_orders | Purchase order headers | id | → suppliers, locations; 1:N items, receipts | **yes** | yes |
| purchase_order_items | PO lines with received quantity | id | → POs, variants | **yes** | yes |
| goods_receipts | Goods received headers | id | → POs (nullable), locations | **yes** | yes |
| goods_receipt_items | Received lines (actual cost) | id | → receipts, PO items (nullable), variants | **yes** | yes |
| supplier_invoices | Supplier billing | id | → suppliers, POs (nullable); 1:N purchase_payments | **yes** | yes |
| purchase_payments | Payments to suppliers | id | → invoices (nullable), POs (nullable), suppliers | **yes** | yes |
| orders | Sales order headers (financial snapshot) | id | → customers (nullable), locations; 1:N items, payments, deliveries, returns, refunds | **yes** | yes |
| order_items | Sales lines (price/cost snapshots) | id | → orders, variants (nullable) | **yes** | yes |
| payments | Customer payments | id | → orders; 1:N refunds | **yes** | yes |
| deliveries | Delivery execution | id | → orders, delivery_methods (nullable) | **yes** (fee snapshot on order) | yes |
| delivery_methods | Delivery options with fees | id | 1:N deliveries | **yes** (fee) | yes |
| returns | Sales return headers | id | → orders, customers (nullable); 1:N return_items; 1:N refunds | **yes** (refunds) | yes |
| return_items | Returned lines with condition | id | → returns, order_items, variants | **yes** (refund_amount) | yes |
| refunds | Money-back records | id | → orders, payments (nullable), returns (nullable) | **yes** | yes |
| expense_categories | Expense categories | id | 1:N expenses | – | yes |
| expenses | Business expenses | id | → categories, suppliers (nullable), locations (nullable) | **yes** | yes |
| audit_logs | Change audit trail | id | → auth.users (actor, nullable); polymorphic entity ref | – | yes |

---

## 22. Migration Strategy

Migrations are the only way the schema changes (§17). Proposed staging — each stage is one or more versioned migration files in `supabase/migrations/`:

| Stage | Content |
| --- | --- |
| **1 — Foundations** | Enable extensions (`pgcrypto`, `citext`); define shared enum types (statuses, methods, movement types, reasons; `price_type` covers selling/sale only); `app` schema; `set_updated_at()` function; the `app.next_document_number` helper (document-number formatting over per-type sequences). |
| **2 — Identity & access** | `profiles`, `roles`, `permissions`, `role_permissions`, `staff`, `staff_roles`; `app.has_permission()` helper (function form). |
| **3 — Customers & locations** | `regions`, `cities` (seeded reference data), `customers`, `customer_addresses`, `locations`. |
| **4 — Catalogue** | `categories`, `brands`, `products`, `product_variants`, `product_images`, `prices`, `settings` (scoped key/values). |
| **5 — Inventory** | `inventory_items` (incl. `average_cost`), `stock_movements`, `stock_transfers`, `stock_transfer_items`, `stock_adjustments`, `stock_adjustment_items`. |
| **6 — Purchasing** | `suppliers`, `supplier_contacts`, `supplier_addresses`, `supplier_products`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`, `supplier_invoices`, `purchase_payments`. |
| **7 — Sales** | `orders` (incl. tax/totals snapshots), `order_items` (incl. per-line tax and cost snapshots), `delivery_methods`, `deliveries`. |
| **8 — Payments** | `payments`. |
| **9 — Returns, refunds, expenses** | `returns`, `return_items`, `refunds`, `expense_categories`, `expenses`. |
| **10 — Audit, RLS, indexes** | `audit_logs`; RLS policies on every table (per §18 intent); the justified index set; audit-adjacent functions. |

**Indexes (justified set, created in Stage 10):** unique constraints are indexes by definition; additionally: `stock_movements(inventory_item_id, created_at)`, `order_items(variant_id)`, `order_items(order_id)`, `orders(created_at)` + `orders(status)`, `payments(order_id)`, `prices(variant_id, price_type, valid_from)`, `supplier_products(variant_id)`, `supplier_products` partial unique (variant_id) where preferred_supplier, `audit_logs(entity_type, entity_id)`, `audit_logs(created_at)`, `inventory_items(status-relevant filters)`, `purchase_order_items(purchase_order_id)`. More indexes follow real query patterns, never speculation.

---

## 23. Design Decisions Summary

1. **Every saleable item is a variant** — simple products get one default variant; all downstream tables use a single `variant_id` FK (no polymorphic product/variant pairs).
2. **Prices are dated rows** — history, sale windows and location pricing are one mechanism; no separate price-history table.
3. **Stock = one authoritative row + an append-only ledger** — `inventory_items.quantity_on_hand` authoritative; `stock_movements` explains every change in the same transaction.
4. **Orders are immutable financial snapshots** — prices, names, costs, fees and taxes copied at sale time; history never rewrites.
5. **Customers exist without accounts** — guest and walk-in sales are first-class; accounts attach later (`profile_id` nullable).
6. **Multiple locations from day one** — stock, receiving, transfers and optional pricing are location-scoped without redesign.
7. **Money is `numeric(14,2)`, quantities are `numeric(14,3)`** — no floats anywhere.
8. **UUID everywhere; human-readable document numbers as unique text columns.**
9. **No soft-delete columns; status-based archiving** preserves history and referential integrity.
10. **No report tables** — reports are queries over the transactional model; at most one or two justified materialized views later.
11. **Polymorphism is limited and deliberate** — `stock_movements.source_type/source_id` and `audit_logs.entity_type/entity_id`; everywhere else, real foreign keys.
12. **RLS is tiered** — anon (catalogue/reference, active rows only), customer (own data), staff (permission-coded, via `app.has_permission`).

### FINAL decisions (Phase 1C revision)

13. **Tax is a sale-time snapshot, never a product attribute (FINAL)** — per-line and per-order `taxable_amount`/`tax_rate`/`tax_amount`; rates applied by business logic from configuration; no rate assumed.
14. **Weighted-average cost (FINAL)** — `inventory_items.average_cost` per location+variant; receipts recalculate, issues/returns/adjustments value at the average; FIFO remains possible later without schema change.
15. **Document numbers via transactional sequences (FINAL)** — `PREFIX-YYYY-NNNNN` from per-type `nextval` through a single database helper; never `COUNT(*)`; year embedded in the prefix so sequences never reset; concurrency-safe.
16. **Dedicated `supplier_products` table (FINAL)** — supplier-SKU, supplier name, last cost, preferred-supplier flag (partial unique), lead time, MOQ.
17. **Scoped settings (FINAL)** — NULL `location_id` = system-wide default; location rows override; partial unique indexes enforce one value per scope.

## 24. Unresolved Design Questions

- **Tax rate values and display style:** the schema now snapshots tax per line/order, but the actual rate(s) to apply, price-inclusive vs exclusive display, and delivery-fee taxability remain business-logic configuration decisions (configured at runtime, not hard-coded).
- **FIFO costing:** deliberately deferred — weighted-average cost is final for the initial implementation; the ledger's per-movement `unit_cost` and dated receipt history make a later FIFO layer possible without schema redesign.
- **Payment gateway:** no provider chosen; `payments.provider`/`reference` are placeholders by design.
- **Cities seeding scope:** which Ghanaian cities to seed (major cities vs exhaustive) — a data decision for the customer-address feature.
- **Document-number prefix set:** `EXP-` for expenses is confirmed in the conventions; whether other document types (e.g. supplier-credit notes) need prefixes will be decided when those workflows are built.