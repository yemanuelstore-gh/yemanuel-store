-- Yemanuel Store ERP - Clean Operational State Reset
-- Preserves: customers (9848 records), all master/configuration data
-- Deletes: All transactional and operational data

-- =====================================================================
-- DEPENDENCY ANALYSIS TABLE
-- =====================================================================
-- TABLE                       | CURRENT ROWS | ACTION | REASON
-- ----------------------------|--------------|--------|--------------------------------------------------
-- profiles                    | 2            | KEEP   | Auth users
-- permissions                 | 31           | KEEP   | Permission definitions
-- roles                       | 1            | KEEP   | Role definitions
-- role_permissions            | 31           | KEEP   | Role-permission mappings
-- staff                       | 1            | KEEP   | Staff records
-- staff_roles                 | 1            | KEEP   | Staff-role mappings
-- regions                     | 16           | KEEP   | Ghana regions (reference data)
-- cities                      | 86           | KEEP   | Ghana cities (reference data)
-- customers                   | 9848         | KEEP   | Customer master data (MUST PRESERVE)
-- customer_addresses          | 0            | KEEP   | Customer master data
-- locations                   | 1            | KEEP   | Store/warehouse locations
-- categories                  | 301          | KEEP   | Product category master data
-- brands                      | 952          | KEEP   | Brand master data
-- products                    | 10275        | KEEP   | Product master data
-- product_variants            | 20054        | KEEP   | Product variant master data
-- product_images              | 10275        | KEEP   | Product image master data
-- prices                      | 21525        | KEEP   | Pricing master data
-- settings                    | 0            | KEEP   | Configuration settings
-- delivery_methods            | 3            | KEEP   | Delivery method master data
-- expense_categories          | 41           | KEEP   | Expense category master data
-- suppliers                   | 85           | KEEP   | Supplier master data
-- supplier_contacts           | 0            | KEEP   | Supplier master data
-- supplier_addresses          | 0            | KEEP   | Supplier master data
-- supplier_products           | 2818         | KEEP   | Supplier-product relationship master data
-- financial_accounts          | 0            | KEEP   | Financial account master data (not in DB yet)
-- ----------------------------|--------------|--------|--------------------------------------------------
-- stock_movements             | 69258        | DELETE | Transactional - inventory movements (leaf)
-- inventory_items             | 20054        | DELETE | Derived from stock movements (reset quantities)
-- stock_transfer_items        | 0            | DELETE | Transactional - transfer line items
-- stock_transfers             | 0            | DELETE | Transactional - stock transfers
-- stock_adjustment_items      | 0            | DELETE | Transactional - adjustment line items
-- stock_adjustments           | 0            | DELETE | Transactional - stock adjustments
-- goods_receipt_items         | 22599        | DELETE | Transactional - GR line items
-- goods_receipts              | 2325         | DELETE | Transactional - goods receipts
-- purchase_order_items        | 22599        | DELETE | Transactional - PO line items
-- purchase_orders             | 2325         | DELETE | Transactional - purchase orders
-- supplier_invoices           | 2325         | DELETE | Transactional - supplier invoices
-- purchase_payments           | 2627         | DELETE | Transactional - supplier payments
-- order_items                 | 0            | DELETE | Transactional - order line items
-- orders                      | 0            | DELETE | Transactional - orders
-- deliveries                  | 0            | DELETE | Transactional - deliveries
-- payments                    | 0            | DELETE | Transactional - payments
-- return_items                | 0            | DELETE | Transactional - return line items
-- returns                     | 0            | DELETE | Transactional - returns
-- refunds                     | 0            | DELETE | Transactional - refunds
-- expenses                    | 2300         | DELETE | Transactional - expenses
-- audit_logs                  | 56106        | DELETE | Transaction-derived audit trail
-- contact_messages            | 0            | DELETE | Contact messages
-- financial_account_transactions | 0         | DELETE | Transactional - financial ledger (not in DB)
-- quotations                  | 0            | DELETE | Transactional - quotations
-- quotation_items             | 0            | DELETE | Transactional - quotation line items
-- =====================================================================

-- =====================================================================
-- RESET EXECUTION - Transaction-safe deletion order (children first)
-- =====================================================================

BEGIN;

-- 1. Sales/Orders cascade (orders already 0, but clean up children)
DELETE FROM public.order_items;
DELETE FROM public.orders;

-- 2. Deliveries
DELETE FROM public.deliveries;

-- 3. Payments
DELETE FROM public.payments;

-- 4. Returns & Refunds
DELETE FROM public.return_items;
DELETE FROM public.returns;
DELETE FROM public.refunds;

-- 5. Quotations
DELETE FROM public.quotation_items;
DELETE FROM public.quotations;

-- 6. Inventory - Stock Movements (leaf, references inventory_items)
DELETE FROM public.stock_movements;

-- 7. Inventory Items - Reset quantities to 0 (keep the records for variant-location mapping)
UPDATE public.inventory_items
SET quantity_on_hand = 0,
    reserved_quantity = 0,
    average_cost = 0,
    updated_at = now();

-- 8. Stock Transfers
DELETE FROM public.stock_transfer_items;
DELETE FROM public.stock_transfers;

-- 9. Stock Adjustments
DELETE FROM public.stock_adjustment_items;
DELETE FROM public.stock_adjustments;

-- 10. Purchasing - Goods Receipts (references purchase_order_items)
DELETE FROM public.goods_receipt_items;
DELETE FROM public.goods_receipts;

-- 11. Purchasing - Purchase Orders
DELETE FROM public.purchase_order_items;
DELETE FROM public.purchase_orders;

-- 12. Purchasing - Supplier Invoices & Payments
DELETE FROM public.purchase_payments;
DELETE FROM public.supplier_invoices;

-- 13. Expenses
DELETE FROM public.expenses;

-- 14. Financial Transactions (if table exists)
DELETE FROM public.financial_account_transactions;

-- 15. Audit & Contact
DELETE FROM public.audit_logs;
DELETE FROM public.contact_messages;

-- 16. Reset sequences for document numbering
SELECT setval('app.seq_so', 1, false);
SELECT setval('app.seq_po', 1, false);
SELECT setval('app.seq_gr', 1, false);
SELECT setval('app.seq_ret', 1, false);
SELECT setval('app.seq_rf', 1, false);
SELECT setval('app.seq_trf', 1, false);
SELECT setval('app.seq_adj', 1, false);
SELECT setval('app.seq_exp', 1, false);

COMMIT;

-- =====================================================================
-- POST-RESET VERIFICATION QUERIES
-- =====================================================================
-- Run these after the transaction commits to verify the reset

-- Verify customers unchanged
-- SELECT count(*) as customer_count FROM public.customers;  -- Should be 9848

-- Verify transactional tables are empty
-- SELECT 'orders' as table_name, count(*) as rows FROM public.orders
-- UNION ALL SELECT 'order_items', count(*) FROM public.order_items
-- UNION ALL SELECT 'payments', count(*) FROM public.payments
-- UNION ALL SELECT 'refunds', count(*) FROM public.refunds
-- UNION ALL SELECT 'quotations', count(*) FROM public.quotations
-- UNION ALL SELECT 'quotation_items', count(*) FROM public.quotation_items
-- UNION ALL SELECT 'returns', count(*) FROM public.returns
-- UNION ALL SELECT 'return_items', count(*) FROM public.return_items
-- UNION ALL SELECT 'stock_movements', count(*) FROM public.stock_movements
-- UNION ALL SELECT 'stock_transfers', count(*) FROM public.stock_transfers
-- UNION ALL SELECT 'stock_transfer_items', count(*) FROM public.stock_transfer_items
-- UNION ALL SELECT 'stock_adjustments', count(*) FROM public.stock_adjustments
-- UNION ALL SELECT 'stock_adjustment_items', count(*) FROM public.stock_adjustment_items
-- UNION ALL SELECT 'purchase_orders', count(*) FROM public.purchase_orders
-- UNION ALL SELECT 'purchase_order_items', count(*) FROM public.purchase_order_items
-- UNION ALL SELECT 'goods_receipts', count(*) FROM public.goods_receipts
-- UNION ALL SELECT 'goods_receipt_items', count(*) FROM public.goods_receipt_items
-- UNION ALL SELECT 'supplier_invoices', count(*) FROM public.supplier_invoices
-- UNION ALL SELECT 'purchase_payments', count(*) FROM public.purchase_payments
-- UNION ALL SELECT 'expenses', count(*) FROM public.expenses
-- UNION ALL SELECT 'audit_logs', count(*) FROM public.audit_logs
-- UNION ALL SELECT 'contact_messages', count(*) FROM public.contact_messages
-- UNION ALL SELECT 'financial_account_transactions', count(*) FROM public.financial_account_transactions;

-- Verify inventory items have zero quantities
-- SELECT count(*) as items_with_stock FROM public.inventory_items WHERE quantity_on_hand > 0;  -- Should be 0

-- Verify master data preserved
-- SELECT 'customers' as table_name, count(*) as rows FROM public.customers
-- UNION ALL SELECT 'suppliers', count(*) FROM public.suppliers
-- UNION ALL SELECT 'products', count(*) FROM public.products
-- UNION ALL SELECT 'product_variants', count(*) FROM public.product_variants
-- UNION ALL SELECT 'categories', count(*) FROM public.categories
-- UNION ALL SELECT 'brands', count(*) FROM public.brands
-- UNION ALL SELECT 'locations', count(*) FROM public.locations
-- UNION ALL SELECT 'staff', count(*) FROM public.staff
-- UNION ALL SELECT 'roles', count(*) FROM public.roles
-- UNION ALL SELECT 'permissions', count(*) FROM public.permissions;