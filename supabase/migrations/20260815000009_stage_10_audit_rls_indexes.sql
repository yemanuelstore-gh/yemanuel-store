create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create or replace function app.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before jsonb default null,
  p_after jsonb default null,
  p_metadata jsonb default null,
  p_actor_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after, metadata)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, p_before, p_after, p_metadata);
end;
$$;

revoke execute on function app.write_audit_log(text, text, uuid, jsonb, jsonb, jsonb, uuid) from public;
grant execute on function app.write_audit_log(text, text, uuid, jsonb, jsonb, jsonb, uuid) to service_role;

create or replace function app.current_customer_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public, app
as $$
declare
  v_customer_id uuid;
begin
  select c.id into v_customer_id
  from public.customers c
  where c.profile_id = auth.uid();
  return v_customer_id;
end;
$$;

revoke execute on function app.current_customer_id() from public;
grant execute on function app.current_customer_id() to authenticated;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff enable row level security;
alter table public.staff_roles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.regions enable row level security;
alter table public.cities enable row level security;
alter table public.locations enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.prices enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.stock_transfer_items enable row level security;
alter table public.stock_adjustments enable row level security;
alter table public.stock_adjustment_items enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_contacts enable row level security;
alter table public.supplier_addresses enable row level security;
alter table public.supplier_products enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.goods_receipts enable row level security;
alter table public.goods_receipt_items enable row level security;
alter table public.supplier_invoices enable row level security;
alter table public.purchase_payments enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.delivery_methods enable row level security;
alter table public.deliveries enable row level security;
alter table public.payments enable row level security;
alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.refunds enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;

create policy p_profiles_own_select on public.profiles for select to authenticated using (id = auth.uid());
create policy p_profiles_own_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy p_roles_staff_select on public.roles for select to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_roles_staff_insert on public.roles for insert to authenticated with check (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_roles_staff_update on public.roles for update to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage')) with check (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_roles_staff_delete on public.roles for delete to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage'));

create policy p_permissions_staff_select on public.permissions for select to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_permissions_staff_insert on public.permissions for insert to authenticated with check (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_permissions_staff_update on public.permissions for update to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage')) with check (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_permissions_staff_delete on public.permissions for delete to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage'));

create policy p_role_permissions_staff_select on public.role_permissions for select to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_role_permissions_staff_insert on public.role_permissions for insert to authenticated with check (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_role_permissions_staff_update on public.role_permissions for update to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage')) with check (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_role_permissions_staff_delete on public.role_permissions for delete to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage'));

create policy p_staff_staff_select on public.staff for select to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_staff_staff_insert on public.staff for insert to authenticated with check (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_staff_staff_update on public.staff for update to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage')) with check (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_staff_staff_delete on public.staff for delete to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage'));

create policy p_staff_roles_staff_select on public.staff_roles for select to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_staff_roles_staff_insert on public.staff_roles for insert to authenticated with check (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_staff_roles_staff_update on public.staff_roles for update to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage')) with check (app.has_permission('settings.manage') or app.has_permission('staff.manage'));
create policy p_staff_roles_staff_delete on public.staff_roles for delete to authenticated using (app.has_permission('settings.manage') or app.has_permission('staff.manage'));

create policy p_customers_own_select on public.customers for select to authenticated using (profile_id = auth.uid());
create policy p_customers_staff_select on public.customers for select to authenticated using (app.has_permission('customers.read'));
create policy p_customers_staff_insert on public.customers for insert to authenticated with check (app.has_permission('customers.create'));
create policy p_customers_staff_update on public.customers for update to authenticated using (app.has_permission('customers.update')) with check (app.has_permission('customers.update'));

create policy p_customer_addresses_own_select on public.customer_addresses for select to authenticated using (customer_id = app.current_customer_id());
create policy p_customer_addresses_staff_select on public.customer_addresses for select to authenticated using (app.has_permission('customers.read'));
create policy p_customer_addresses_staff_insert on public.customer_addresses for insert to authenticated with check (app.has_permission('customers.create'));
create policy p_customer_addresses_staff_update on public.customer_addresses for update to authenticated using (app.has_permission('customers.update')) with check (app.has_permission('customers.update'));

create policy p_regions_public_select on public.regions for select to anon, authenticated using (true);
create policy p_cities_public_select on public.cities for select to anon, authenticated using (is_active);

create policy p_locations_staff_select on public.locations for select to authenticated using (app.has_permission('settings.manage'));
create policy p_locations_staff_insert on public.locations for insert to authenticated with check (app.has_permission('settings.manage'));
create policy p_locations_staff_update on public.locations for update to authenticated using (app.has_permission('settings.manage')) with check (app.has_permission('settings.manage'));
create policy p_locations_staff_delete on public.locations for delete to authenticated using (app.has_permission('settings.manage'));

create policy p_settings_staff_select on public.settings for select to authenticated using (app.has_permission('settings.manage'));
create policy p_settings_staff_insert on public.settings for insert to authenticated with check (app.has_permission('settings.manage'));
create policy p_settings_staff_update on public.settings for update to authenticated using (app.has_permission('settings.manage')) with check (app.has_permission('settings.manage'));
create policy p_settings_staff_delete on public.settings for delete to authenticated using (app.has_permission('settings.manage'));

create policy p_categories_anon_select on public.categories for select to anon, authenticated using (status = 'active');
create policy p_categories_staff_select on public.categories for select to authenticated using (app.has_permission('products.read'));
create policy p_categories_staff_insert on public.categories for insert to authenticated with check (app.has_permission('products.create'));
create policy p_categories_staff_update on public.categories for update to authenticated using (app.has_permission('products.update')) with check (app.has_permission('products.update'));
create policy p_categories_staff_delete on public.categories for delete to authenticated using (app.has_permission('products.create'));

create policy p_brands_anon_select on public.brands for select to anon, authenticated using (status = 'active');
create policy p_brands_staff_select on public.brands for select to authenticated using (app.has_permission('products.read'));
create policy p_brands_staff_insert on public.brands for insert to authenticated with check (app.has_permission('products.create'));
create policy p_brands_staff_update on public.brands for update to authenticated using (app.has_permission('products.update')) with check (app.has_permission('products.update'));
create policy p_brands_staff_delete on public.brands for delete to authenticated using (app.has_permission('products.create'));

create policy p_products_anon_select on public.products for select to anon, authenticated using (status = 'active');
create policy p_products_staff_select on public.products for select to authenticated using (app.has_permission('products.read'));
create policy p_products_staff_insert on public.products for insert to authenticated with check (app.has_permission('products.create'));
create policy p_products_staff_update on public.products for update to authenticated using (app.has_permission('products.update')) with check (app.has_permission('products.update'));
create policy p_products_staff_delete on public.products for delete to authenticated using (app.has_permission('products.create'));

create policy p_product_variants_anon_select on public.product_variants for select to anon, authenticated using (status = 'active');
create policy p_product_variants_staff_select on public.product_variants for select to authenticated using (app.has_permission('products.read'));
create policy p_product_variants_staff_insert on public.product_variants for insert to authenticated with check (app.has_permission('products.create'));
create policy p_product_variants_staff_update on public.product_variants for update to authenticated using (app.has_permission('products.update')) with check (app.has_permission('products.update'));
create policy p_product_variants_staff_delete on public.product_variants for delete to authenticated using (app.has_permission('products.create'));

create policy p_product_images_anon_select on public.product_images for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_images.product_id and p.status = 'active'));
create policy p_product_images_staff_select on public.product_images for select to authenticated using (app.has_permission('products.read'));
create policy p_product_images_staff_insert on public.product_images for insert to authenticated with check (app.has_permission('products.create'));
create policy p_product_images_staff_update on public.product_images for update to authenticated using (app.has_permission('products.update')) with check (app.has_permission('products.update'));
create policy p_product_images_staff_delete on public.product_images for delete to authenticated using (app.has_permission('products.create'));

create policy p_prices_anon_select on public.prices for select to anon, authenticated using (valid_from <= now() and (valid_to is null or valid_to >= now()));
create policy p_prices_staff_select on public.prices for select to authenticated using (app.has_permission('products.read'));
create policy p_prices_staff_insert on public.prices for insert to authenticated with check (app.has_permission('products.create'));
create policy p_prices_staff_update on public.prices for update to authenticated using (app.has_permission('products.update')) with check (app.has_permission('products.update'));
create policy p_prices_staff_delete on public.prices for delete to authenticated using (app.has_permission('products.create'));

create policy p_inventory_items_staff_select on public.inventory_items for select to authenticated using (app.has_permission('inventory.read'));
create policy p_inventory_items_staff_insert on public.inventory_items for insert to authenticated with check (app.has_permission('inventory.create'));
create policy p_inventory_items_staff_update on public.inventory_items for update to authenticated using (app.has_permission('inventory.update')) with check (app.has_permission('inventory.update'));

create policy p_stock_movements_staff_select on public.stock_movements for select to authenticated using (app.has_permission('inventory.read'));
create policy p_stock_movements_staff_insert on public.stock_movements for insert to authenticated with check (app.has_permission('inventory.adjust'));

create policy p_stock_transfers_staff_select on public.stock_transfers for select to authenticated using (app.has_permission('inventory.read'));
create policy p_stock_transfers_staff_insert on public.stock_transfers for insert to authenticated with check (app.has_permission('inventory.create'));
create policy p_stock_transfers_staff_update on public.stock_transfers for update to authenticated using (app.has_permission('inventory.update')) with check (app.has_permission('inventory.update'));

create policy p_stock_transfer_items_staff_select on public.stock_transfer_items for select to authenticated using (app.has_permission('inventory.read'));
create policy p_stock_transfer_items_staff_insert on public.stock_transfer_items for insert to authenticated with check (app.has_permission('inventory.create'));
create policy p_stock_transfer_items_staff_update on public.stock_transfer_items for update to authenticated using (app.has_permission('inventory.update')) with check (app.has_permission('inventory.update'));

create policy p_stock_adjustments_staff_select on public.stock_adjustments for select to authenticated using (app.has_permission('inventory.read'));
create policy p_stock_adjustments_staff_insert on public.stock_adjustments for insert to authenticated with check (app.has_permission('inventory.adjust'));
create policy p_stock_adjustments_staff_update on public.stock_adjustments for update to authenticated using (app.has_permission('inventory.adjust')) with check (app.has_permission('inventory.adjust'));
create policy p_stock_adjustments_staff_delete on public.stock_adjustments for delete to authenticated using (app.has_permission('inventory.adjust'));

create policy p_stock_adjustment_items_staff_select on public.stock_adjustment_items for select to authenticated using (app.has_permission('inventory.read'));
create policy p_stock_adjustment_items_staff_insert on public.stock_adjustment_items for insert to authenticated with check (app.has_permission('inventory.adjust'));
create policy p_stock_adjustment_items_staff_update on public.stock_adjustment_items for update to authenticated using (app.has_permission('inventory.adjust')) with check (app.has_permission('inventory.adjust'));
create policy p_stock_adjustment_items_staff_delete on public.stock_adjustment_items for delete to authenticated using (app.has_permission('inventory.adjust'));

create policy p_suppliers_staff_select on public.suppliers for select to authenticated using (app.has_permission('suppliers.read'));
create policy p_suppliers_staff_insert on public.suppliers for insert to authenticated with check (app.has_permission('suppliers.create'));
create policy p_suppliers_staff_update on public.suppliers for update to authenticated using (app.has_permission('suppliers.update')) with check (app.has_permission('suppliers.update'));

create policy p_supplier_contacts_staff_select on public.supplier_contacts for select to authenticated using (app.has_permission('suppliers.read'));
create policy p_supplier_contacts_staff_insert on public.supplier_contacts for insert to authenticated with check (app.has_permission('suppliers.create'));
create policy p_supplier_contacts_staff_update on public.supplier_contacts for update to authenticated using (app.has_permission('suppliers.update')) with check (app.has_permission('suppliers.update'));

create policy p_supplier_addresses_staff_select on public.supplier_addresses for select to authenticated using (app.has_permission('suppliers.read'));
create policy p_supplier_addresses_staff_insert on public.supplier_addresses for insert to authenticated with check (app.has_permission('suppliers.create'));
create policy p_supplier_addresses_staff_update on public.supplier_addresses for update to authenticated using (app.has_permission('suppliers.update')) with check (app.has_permission('suppliers.update'));

create policy p_supplier_products_staff_select on public.supplier_products for select to authenticated using (app.has_permission('suppliers.read'));
create policy p_supplier_products_staff_insert on public.supplier_products for insert to authenticated with check (app.has_permission('suppliers.create'));
create policy p_supplier_products_staff_update on public.supplier_products for update to authenticated using (app.has_permission('suppliers.update')) with check (app.has_permission('suppliers.update'));

create policy p_purchase_orders_staff_select on public.purchase_orders for select to authenticated using (app.has_permission('purchases.read'));
create policy p_purchase_orders_staff_insert on public.purchase_orders for insert to authenticated with check (app.has_permission('purchases.create'));
create policy p_purchase_orders_staff_update on public.purchase_orders for update to authenticated using (app.has_permission('purchases.update')) with check (app.has_permission('purchases.update'));

create policy p_purchase_order_items_staff_select on public.purchase_order_items for select to authenticated using (app.has_permission('purchases.read'));
create policy p_purchase_order_items_staff_insert on public.purchase_order_items for insert to authenticated with check (app.has_permission('purchases.create'));
create policy p_purchase_order_items_staff_update on public.purchase_order_items for update to authenticated using (app.has_permission('purchases.update')) with check (app.has_permission('purchases.update'));

create policy p_goods_receipts_staff_select on public.goods_receipts for select to authenticated using (app.has_permission('purchases.read'));
create policy p_goods_receipts_staff_insert on public.goods_receipts for insert to authenticated with check (app.has_permission('purchases.create'));
create policy p_goods_receipts_staff_update on public.goods_receipts for update to authenticated using (app.has_permission('purchases.update')) with check (app.has_permission('purchases.update'));

create policy p_goods_receipt_items_staff_select on public.goods_receipt_items for select to authenticated using (app.has_permission('purchases.read'));
create policy p_goods_receipt_items_staff_insert on public.goods_receipt_items for insert to authenticated with check (app.has_permission('purchases.create'));
create policy p_goods_receipt_items_staff_update on public.goods_receipt_items for update to authenticated using (app.has_permission('purchases.update')) with check (app.has_permission('purchases.update'));

create policy p_supplier_invoices_staff_select on public.supplier_invoices for select to authenticated using (app.has_permission('purchases.read'));
create policy p_supplier_invoices_staff_insert on public.supplier_invoices for insert to authenticated with check (app.has_permission('purchases.create'));
create policy p_supplier_invoices_staff_update on public.supplier_invoices for update to authenticated using (app.has_permission('purchases.update')) with check (app.has_permission('purchases.update'));

create policy p_purchase_payments_staff_select on public.purchase_payments for select to authenticated using (app.has_permission('purchases.read'));
create policy p_purchase_payments_staff_insert on public.purchase_payments for insert to authenticated with check (app.has_permission('purchases.create'));
create policy p_purchase_payments_staff_update on public.purchase_payments for update to authenticated using (app.has_permission('purchases.update')) with check (app.has_permission('purchases.update'));

create policy p_orders_own_select on public.orders for select to authenticated using (customer_id = app.current_customer_id());
create policy p_orders_own_insert on public.orders for insert to authenticated with check (customer_id = app.current_customer_id());
create policy p_orders_staff_select on public.orders for select to authenticated using (app.has_permission('sales.read'));
create policy p_orders_staff_insert on public.orders for insert to authenticated with check (app.has_permission('sales.create'));
create policy p_orders_staff_update on public.orders for update to authenticated using (app.has_permission('sales.update')) with check (app.has_permission('sales.update'));

create policy p_order_items_own_select on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.customer_id = app.current_customer_id()));
create policy p_order_items_staff_select on public.order_items for select to authenticated using (app.has_permission('sales.read'));
create policy p_order_items_staff_insert on public.order_items for insert to authenticated with check (app.has_permission('sales.create'));
create policy p_order_items_staff_update on public.order_items for update to authenticated using (app.has_permission('sales.update')) with check (app.has_permission('sales.update'));

create policy p_delivery_methods_public_select on public.delivery_methods for select to anon, authenticated using (is_active);
create policy p_delivery_methods_staff_select on public.delivery_methods for select to authenticated using (app.has_permission('sales.read'));
create policy p_delivery_methods_staff_insert on public.delivery_methods for insert to authenticated with check (app.has_permission('settings.manage'));
create policy p_delivery_methods_staff_update on public.delivery_methods for update to authenticated using (app.has_permission('settings.manage')) with check (app.has_permission('settings.manage'));
create policy p_delivery_methods_staff_delete on public.delivery_methods for delete to authenticated using (app.has_permission('settings.manage'));

create policy p_deliveries_own_select on public.deliveries for select to authenticated using (exists (select 1 from public.orders o where o.id = deliveries.order_id and o.customer_id = app.current_customer_id()));
create policy p_deliveries_staff_select on public.deliveries for select to authenticated using (app.has_permission('sales.read'));
create policy p_deliveries_staff_insert on public.deliveries for insert to authenticated with check (app.has_permission('sales.create'));
create policy p_deliveries_staff_update on public.deliveries for update to authenticated using (app.has_permission('sales.update')) with check (app.has_permission('sales.update'));

create policy p_payments_own_select on public.payments for select to authenticated using (exists (select 1 from public.orders o where o.id = payments.order_id and o.customer_id = app.current_customer_id()));
create policy p_payments_staff_select on public.payments for select to authenticated using (app.has_permission('sales.read'));
create policy p_payments_staff_insert on public.payments for insert to authenticated with check (app.has_permission('sales.create'));
create policy p_payments_staff_update on public.payments for update to authenticated using (app.has_permission('sales.update')) with check (app.has_permission('sales.update'));

create policy p_returns_own_select on public.returns for select to authenticated using (exists (select 1 from public.orders o where o.id = returns.order_id and o.customer_id = app.current_customer_id()));
create policy p_returns_own_insert on public.returns for insert to authenticated with check (exists (select 1 from public.orders o where o.id = returns.order_id and o.customer_id = app.current_customer_id()));
create policy p_returns_staff_select on public.returns for select to authenticated using (app.has_permission('sales.read'));
create policy p_returns_staff_insert on public.returns for insert to authenticated with check (app.has_permission('sales.refund'));
create policy p_returns_staff_update on public.returns for update to authenticated using (app.has_permission('sales.refund')) with check (app.has_permission('sales.refund'));

create policy p_return_items_own_select on public.return_items for select to authenticated using (exists (select 1 from public.returns r where r.id = return_items.return_id and exists (select 1 from public.orders o where o.id = r.order_id and o.customer_id = app.current_customer_id())));
create policy p_return_items_staff_select on public.return_items for select to authenticated using (app.has_permission('sales.read'));
create policy p_return_items_staff_insert on public.return_items for insert to authenticated with check (app.has_permission('sales.refund'));
create policy p_return_items_staff_update on public.return_items for update to authenticated using (app.has_permission('sales.refund')) with check (app.has_permission('sales.refund'));

create policy p_refunds_own_select on public.refunds for select to authenticated using (exists (select 1 from public.orders o where o.id = refunds.order_id and o.customer_id = app.current_customer_id()));
create policy p_refunds_staff_select on public.refunds for select to authenticated using (app.has_permission('sales.read'));
create policy p_refunds_staff_insert on public.refunds for insert to authenticated with check (app.has_permission('sales.refund'));
create policy p_refunds_staff_update on public.refunds for update to authenticated using (app.has_permission('sales.refund')) with check (app.has_permission('sales.refund'));

create policy p_expense_categories_staff_select on public.expense_categories for select to authenticated using (app.has_permission('expenses.read'));
create policy p_expense_categories_staff_insert on public.expense_categories for insert to authenticated with check (app.has_permission('expenses.create'));
create policy p_expense_categories_staff_update on public.expense_categories for update to authenticated using (app.has_permission('expenses.update')) with check (app.has_permission('expenses.update'));

create policy p_expenses_staff_select on public.expenses for select to authenticated using (app.has_permission('expenses.read'));
create policy p_expenses_staff_insert on public.expenses for insert to authenticated with check (app.has_permission('expenses.create'));
create policy p_expenses_staff_update on public.expenses for update to authenticated using (app.has_permission('expenses.update')) with check (app.has_permission('expenses.update'));

create policy p_audit_logs_staff_select on public.audit_logs for select to authenticated using (app.has_permission('reports.view') or app.has_permission('audit.view'));

create index stock_movements_inventory_item_id_created_at_idx on public.stock_movements (inventory_item_id, created_at);
create index stock_movements_source_type_source_id_idx on public.stock_movements (source_type, source_id);
create index order_items_variant_id_idx on public.order_items (variant_id);
create index order_items_order_id_idx on public.order_items (order_id);
create index orders_created_at_idx on public.orders (created_at);
create index orders_status_idx on public.orders (status);
create index payments_order_id_idx on public.payments (order_id);
create index prices_variant_price_type_valid_from_idx on public.prices (variant_id, price_type, valid_from);
create index audit_logs_entity_type_entity_id_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at);
create index purchase_order_items_purchase_order_id_idx on public.purchase_order_items (purchase_order_id);