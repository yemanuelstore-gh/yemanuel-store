-- Stage 16: African Wear category subtree under Fashion.
--
-- Adds a proper African Wear department inside Fashion with focused
-- subcategories for Ghanaian/African fashion. The tree is seeded with the
-- same app.seed_category() helper convention as stage 12, is idempotent
-- (slug conflict -> do nothing) and never touches existing categories.
--
-- No schema changes are made here.

create or replace function app.seed_category(
  p_name text,
  p_slug text,
  p_parent_slug text default null,
  p_sort integer default 10
)
returns void
language plpgsql
as $$
begin
  insert into public.categories (name, slug, parent_id, sort_order, status)
  values (
    p_name,
    p_slug,
    case
      when p_parent_slug is null then null
      else (select id from public.categories where slug = p_parent_slug)
    end,
    p_sort,
    'active'::public.entity_status
  )
  on conflict (slug) do nothing;
end;
$$;

-- =====================================================================
-- FASHION -> AFRICAN WEAR
-- =====================================================================

select app.seed_category('African Wear', 'african-wear', 'fashion', 50);

select app.seed_category('Ankara Wear', 'ankara-wear', 'african-wear', 10);
select app.seed_category('Kente Wear', 'kente-wear', 'african-wear', 20);
select app.seed_category('African Print Dresses', 'african-print-dresses', 'african-wear', 30);
select app.seed_category('African Print Shirts', 'african-print-shirts', 'african-wear', 40);
select app.seed_category('African Print Trousers', 'african-print-trousers', 'african-wear', 50);
select app.seed_category('Kaftans', 'kaftans', 'african-wear', 60);
select app.seed_category('Agbada', 'agbada', 'african-wear', 70);
select app.seed_category('Dashiki', 'dashiki', 'african-wear', 80);
select app.seed_category('Smock & Fugu', 'smock-fugu', 'african-wear', 90);
select app.seed_category('African Wedding Wear', 'african-wedding-wear', 'african-wear', 100);
select app.seed_category('African Event Wear', 'african-event-wear', 'african-wear', 110);
select app.seed_category('African Casual Wear', 'african-casual-wear', 'african-wear', 120);
select app.seed_category('African Office Wear', 'african-office-wear', 'african-wear', 130);
select app.seed_category('African Kids'' Wear', 'african-kids-wear', 'african-wear', 140);
select app.seed_category('Headwraps', 'headwraps', 'african-wear', 150);
select app.seed_category('African Bags', 'african-bags', 'african-wear', 160);
select app.seed_category('African Footwear', 'african-footwear', 'african-wear', 170);
select app.seed_category('African Jewelry', 'african-jewelry', 'african-wear', 180);
select app.seed_category('Beaded Accessories', 'beaded-accessories', 'african-wear', 190);
select app.seed_category('Kente Accessories', 'kente-accessories', 'african-wear', 200);

-- =====================================================================
-- COMPUTERS -> PRINTING & STORAGE (genuinely missing shelves)
-- =====================================================================

select app.seed_category('Printers', 'printers', 'computers', 130);
select app.seed_category('Storage', 'storage', 'computers', 140);

-- =====================================================================
-- Cleanup
-- =====================================================================

drop function if exists app.seed_category(text, text, text, integer);
