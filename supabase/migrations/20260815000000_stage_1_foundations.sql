create extension if not exists pgcrypto with schema public;
create extension if not exists citext with schema public;

create schema if not exists app;

create type public.entity_status as enum ('active', 'inactive');
create type public.staff_status as enum ('active', 'inactive', 'suspended');
create type public.customer_status as enum ('active', 'inactive', 'blocked');
create type public.customer_type as enum ('individual', 'business');
create type public.product_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.location_type as enum ('store', 'warehouse');
create type public.price_type as enum ('selling', 'sale');
create type public.movement_type as enum ('opening_stock', 'purchase_receipt', 'sale', 'sale_return', 'transfer_out', 'transfer_in', 'adjustment', 'damage');
create type public.transfer_status as enum ('draft', 'in_transit', 'received', 'cancelled');
create type public.transfer_item_status as enum ('pending', 'shipped', 'received');
create type public.adjustment_status as enum ('draft', 'applied', 'cancelled');
create type public.purchase_order_status as enum ('draft', 'sent', 'partially_received', 'received', 'cancelled');
create type public.goods_receipt_status as enum ('draft', 'completed', 'cancelled');
create type public.invoice_status as enum ('pending', 'partially_paid', 'paid', 'cancelled');
create type public.payment_method as enum ('cash', 'mobile_money', 'card', 'bank_transfer', 'other');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
create type public.order_payment_status as enum ('unpaid', 'partially_paid', 'paid', 'refunded', 'partially_refunded');
create type public.fulfilment_status as enum ('unfulfilled', 'partially_fulfilled', 'fulfilled');
create type public.order_channel as enum ('online', 'in_store');
create type public.payment_status as enum ('pending', 'authorized', 'paid', 'void', 'refunded');
create type public.delivery_status as enum ('pending', 'processing', 'shipped', 'delivered', 'failed', 'cancelled');
create type public.return_status as enum ('pending', 'approved', 'received', 'rejected', 'cancelled');
create type public.return_reason as enum ('wrong_item', 'damaged', 'not_as_described', 'changed_mind', 'quality', 'other');
create type public.item_condition as enum ('resellable', 'not_resellable');
create type public.refund_status as enum ('pending', 'processed', 'failed', 'cancelled');

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create sequence app.seq_cus;
create sequence app.seq_sup;
create sequence app.seq_stf;
create sequence app.seq_so;
create sequence app.seq_po;
create sequence app.seq_gr;
create sequence app.seq_ret;
create sequence app.seq_rf;
create sequence app.seq_trf;
create sequence app.seq_adj;
create sequence app.seq_exp;

create or replace function app.next_document_number(p_prefix text)
returns text
language plpgsql
as $$
declare
  v_sequence regclass;
  v_number   bigint;
begin
  v_sequence := to_regclass('app.seq_' || lower(p_prefix));
  if v_sequence is null then
    raise exception 'no document sequence registered for prefix %', p_prefix;
  end if;
  select nextval(v_sequence) into v_number;
  return upper(p_prefix) || '-' || to_char(now() at time zone 'UTC', 'YYYY') || '-' || lpad(v_number::text, 5, '0');
end;
$$;

grant usage on schema app to service_role;

revoke usage on all sequences in schema app from public;
grant usage on all sequences in schema app to service_role;

revoke execute on function app.next_document_number(text) from public;
grant execute on function app.next_document_number(text) to service_role;