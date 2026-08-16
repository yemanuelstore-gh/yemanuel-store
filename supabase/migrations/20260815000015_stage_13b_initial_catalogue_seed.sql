-- Stage 13b: Initial catalogue seed.
--
-- Seeds the store with 36 brands, 144 products, ~250 variants,
-- variant-level GHS pricing, product images (Pexels CDN) and
-- opening inventory at the Accra store location.
--
-- Requires stage 13a (owner identity) to have provisioned
-- owner@yemanuelstore.com — the prices.created_by reference is
-- resolved by email, never an invented UUID.
--
-- Idempotent: the whole block is atomic and skips when products
-- already exist.

set search_path = public, extensions;

do $$
declare
  v_owner uuid;
  v_loc uuid;
  v_prod uuid;
  v_var uuid;
  v_sale numeric;
begin
  select id into v_owner from auth.users where email = 'owner@yemanuelstore.com';
  if v_owner is null then
    raise exception 'Owner identity not found. Run stage 13a first.';
  end if;

  if exists (select 1 from public.products) then
    raise notice 'Catalogue already seeded; skipping stage 13b.';
    return;
  end if;

  -- Location ----------------------------------------------------
  insert into public.locations (code, name, location_type, region_id, city, address_line_1, phone)
  select 'ACCRA-STORE', 'Yemanuel Store - Accra', 'store', r.id, 'Accra', 'Accra Mall, Spintex Road, Accra', '+233 500 090 392'
  from public.regions r
  where r.name = 'Greater Accra'
  on conflict (code) do nothing;

  select id into v_loc from public.locations where code = 'ACCRA-STORE';

  -- Brands -------------------------------------------------------
  insert into public.brands (name, slug, description, status) values ('Woodin', 'woodin', 'Iconic Ghanaian and African print fabric house known for bold, premium cotton prints and elegant occasion wear.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('GTP', 'gtp', 'Ghana Textiles Print - a heritage Ghanaian brand celebrated for vibrant, durable wax-print fabrics and garments.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('RNG Apparel', 'rng-apparel', 'Contemporary Ghanaian fashion label crafting tailored, modern essentials for men, women and kids.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Nike', 'nike', 'Global sportswear leader delivering performance footwear, apparel and accessories for every active lifestyle.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Adidas', 'adidas', 'German sportswear giant offering iconic three-stripe footwear, apparel and sports accessories.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Puma', 'puma', 'Sportstyle brand blending performance and streetwear with bold, everyday classics.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Reebok', 'reebok', 'Heritage fitness and lifestyle brand known for timeless sneakers and training essentials.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Levi''s', 'levis', 'The original denim brand - authentic jeans, jackets and casual wear that never go out of style.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Tommy Hilfiger', 'tommy-hilfiger', 'American preppy-cool fashion house for classic shirts, chinos and smart-casual staples.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Calvin Klein', 'calvin-klein', 'Modern American minimalism in denim, underwear, accessories and fragrance.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Hush Puppies', 'hush-puppies', 'Comfort-first footwear and leather goods trusted for all-day ease and smart-casual polish.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Clarks', 'clarks', 'British shoemaker famous for handcrafted comfort - from desert boots to dress sandals.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Casio', 'casio', 'Japanese watch and electronics brand offering dependable digital and analog timepieces.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Ray-Ban', 'ray-ban', 'Legendary sunglasses brand - aviators and wayfarers trusted since 1937.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Samsung', 'samsung', 'Korean technology leader in smartphones, TVs, appliances, memory and wearables.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Apple', 'apple', 'Premium ecosystem of iPhones, iPads, MacBooks and accessories.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Tecno', 'tecno', 'Affordable smartphones and mobile accessories built for the African market.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Infinix', 'infinix', 'Value-focused smartphones and accessories popular with young African consumers.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Itel', 'itel', 'Everyday essential phones, feature phones and smart accessories at accessible prices.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Nokia', 'nokia', 'Finnish phone pioneer offering rugged feature phones and reliable connectivity.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Huawei', 'huawei', 'Chinese tech giant delivering premium laptops, phones and networking equipment.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Sony', 'sony', 'Japanese electronics powerhouse - audio, cameras, TVs, gaming and more.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('JBL', 'jbl', 'Harman-owned audio brand famous for punchy portable speakers, headphones and earbuds.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Anker', 'anker', 'Trusted charging and power accessories - cables, adapters and power banks.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('TP-Link', 'tp-link', 'World leader in Wi-Fi networking - routers, extenders and smart home gear.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Logitech', 'logitech', 'Computer peripherals and accessories - mice, keyboards and webcams.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('L''Oréal Paris', 'loreal-paris', 'Global beauty leader in skincare, haircare, colour and fragrance.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Maybelline New York', 'maybelline-new-york', 'Accessible, trend-led makeup from New York.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Nivea', 'nivea', 'Trusted skincare and personal care for the whole family - mild and effective.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Vaseline', 'vaseline', 'Daily skin protection and intensive care lotions trusted for generations.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Dove', 'dove', 'Gentle, caring personal care - body washes, haircare and moisturisers.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('CeraVe', 'cerave', 'Dermatologist-developed skincare with essential ceramides and niacinamide.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Binatone', 'binatone', 'Reliable home appliances - refrigerators, washing machines, microwaves and more.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Russell Hobbs', 'russell-hobbs', 'British home appliance and kitchenware brand known for dependable small appliances.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Kenwood', 'kenwood', 'Premium kitchen machines, kettles and cookware engineered to last.', 'active') on conflict (slug) do nothing;
  insert into public.brands (name, slug, description, status) values ('Nasco', 'nasco', 'Ghanaian household brand offering practical home, furniture and cleaning essentials.', 'active') on conflict (slug) do nothing;

  -- Products, variants, prices, images and inventory --------------

  -- Woodin Classic African Print Shirt  (category: shirts, brand: woodin)
  select id into v_prod from public.products where slug = 'woodin-classic-african-print-shirt';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'shirts'),
            (select id from public.brands where slug = 'woodin'),
            'Woodin Classic African Print Shirt',
            'woodin-classic-african-print-shirt',
            '100% cotton African print shirt, made in Ghana. Breathable weave and rich colours, perfect for work and weekend wear alike.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'WOODIN-2435-S', '7741589147269', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-2435-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 328.98, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 235.01, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 203.97, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'WOODIN-2435-M', '1270275029436', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-2435-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 310.34, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 245.69, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 192.41, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'WOODIN-2435-L', '6374612737680', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-2435-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 313.19, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 232.63, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 194.18, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800', 'Woodin Classic African Print Shirt', 0, true);
  end if;

  -- GTP Wax Print Dress Shirt  (category: shirts, brand: gtp)
  select id into v_prod from public.products where slug = 'gtp-wax-print-dress-shirt';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'shirts'),
            (select id from public.brands where slug = 'gtp'),
            'GTP Wax Print Dress Shirt',
            'gtp-wax-print-dress-shirt',
            'Heritage GTP wax-print dress shirt in vivid, colour-fast fabric. Proudly Ghanaian, sharp for work and occasions.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'GTP-1474-S', '9455049733401', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'GTP-1474-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 361.02, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 27, 0, 223.83, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'GTP-1474-M', '8534581297594', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'GTP-1474-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 346.21, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 27, 0, 214.65, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'GTP-1474-L', '9861074135668', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'GTP-1474-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 349.82, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 27, 0, 216.89, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800', 'GTP Wax Print Dress Shirt', 0, true);
  end if;

  -- Woodin Short-Sleeve Cotton Polo  (category: t-shirts-polos, brand: woodin)
  select id into v_prod from public.products where slug = 'woodin-short-sleeve-cotton-polo';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 't-shirts-polos'),
            (select id from public.brands where slug = 'woodin'),
            'Woodin Short-Sleeve Cotton Polo',
            'woodin-short-sleeve-cotton-polo',
            'Classic pique polo in authentic Woodin print. Lightweight, breathable and proudly Ghanaian — a wardrobe staple for warm days.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'WOODIN-9570-S', '2564796511365', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-9570-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 231.62, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 37, 0, 143.6, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'WOODIN-9570-L', '5027347580793', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-9570-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 225.74, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 37, 0, 139.96, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=800', 'Woodin Short-Sleeve Cotton Polo', 0, true);
  end if;

  -- Woodin All-Over Print T-Shirt  (category: t-shirts-polos, brand: woodin)
  select id into v_prod from public.products where slug = 'woodin-all-over-print-t-shirt';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 't-shirts-polos'),
            (select id from public.brands where slug = 'woodin'),
            'Woodin All-Over Print T-Shirt',
            'woodin-all-over-print-t-shirt',
            'Soft cotton tee with a vibrant all-over Woodin print. A bold statement piece that pairs well with jeans or shorts.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'WOODIN-8180-S', '5719353312733', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-8180-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 155.56, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 31, 0, 96.45, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'WOODIN-8180-M', '8993361556342', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-8180-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 165.35, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 31, 0, 102.52, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'WOODIN-8180-L', '2765359849646', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-8180-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 168.85, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 31, 0, 104.69, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800', 'Woodin All-Over Print T-Shirt', 0, true);
  end if;

  -- Levi's 511 Slim Fit Jeans  (category: jeans, brand: levis)
  select id into v_prod from public.products where slug = 'levi-s-511-slim-fit-jeans';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'jeans'),
            (select id from public.brands where slug = 'levis'),
            'Levi''s 511 Slim Fit Jeans',
            'levi-s-511-slim-fit-jeans',
            'The iconic 511 slim fit in dark stretch denim. Sits at the waist and slims through the thigh for a clean, modern line.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '32', 'LEVIS-5674-32', '9956015674266', '{"Colour":"32"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-5674-32'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 414.04, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 256.7, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '34', 'LEVIS-5674-34', '5561038340575', '{"Colour":"34"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-5674-34'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 417.82, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 259.05, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '36', 'LEVIS-5674-36', '9095789603659', '{"Colour":"36"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-5674-36'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 441.71, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 273.86, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1082528/pexels-photo-1082528.jpeg?auto=compress&cs=tinysrgb&w=800', 'Levi''s 511 Slim Fit Jeans', 0, true);
  end if;

  -- Levi's 501 Original Jeans  (category: jeans, brand: levis)
  select id into v_prod from public.products where slug = 'levi-s-501-original-jeans';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'jeans'),
            (select id from public.brands where slug = 'levis'),
            'Levi''s 501 Original Jeans',
            'levi-s-501-original-jeans',
            'The original button-fly straight-leg jean since 1873. Rugged, timeless and built to last — a true wardrobe icon.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '32', 'LEVIS-2111-32', '7606946771849', '{"Colour":"32"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-2111-32'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 458.57, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 11, 0, 284.31, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '34', 'LEVIS-2111-34', '1375883471230', '{"Colour":"34"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-2111-34'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 474.22, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 11, 0, 294.02, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '36', 'LEVIS-2111-36', '5776420685022', '{"Colour":"36"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-2111-36'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 464.17, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 11, 0, 287.79, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1222268/pexels-photo-1222268.jpeg?auto=compress&cs=tinysrgb&w=800', 'Levi''s 501 Original Jeans', 0, true);
  end if;

  -- Tommy Hilfiger Stretch Chino Trousers  (category: trousers-chinos, brand: tommy-hilfiger)
  select id into v_prod from public.products where slug = 'tommy-hilfiger-stretch-chino-trousers';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'trousers-chinos'),
            (select id from public.brands where slug = 'tommy-hilfiger'),
            'Tommy Hilfiger Stretch Chino Trousers',
            'tommy-hilfiger-stretch-chino-trousers',
            'Tailored stretch chinos in classic shades. Smart enough for the office, comfortable enough for all day.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '32', 'TOMMY-HILFIGER-8952-32', '5810817806987', '{"Colour":"32"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TOMMY-HILFIGER-8952-32'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 381.3, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 37, 0, 236.41, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '34', 'TOMMY-HILFIGER-8952-34', '7997675511975', '{"Colour":"34"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TOMMY-HILFIGER-8952-34'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 372.33, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 37, 0, 230.84, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '36', 'TOMMY-HILFIGER-8952-36', '2777190785151', '{"Colour":"36"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TOMMY-HILFIGER-8952-36'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 402.8, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 37, 0, 249.74, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tommy Hilfiger Stretch Chino Trousers', 0, true);
  end if;

  -- Calvin Klein Slim Chinos  (category: trousers-chinos, brand: calvin-klein)
  select id into v_prod from public.products where slug = 'calvin-klein-slim-chinos';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'trousers-chinos'),
            (select id from public.brands where slug = 'calvin-klein'),
            'Calvin Klein Slim Chinos',
            'calvin-klein-slim-chinos',
            'Modern slim-fit chinos with a touch of stretch. Versatile smart-casual trousers in versatile colours.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '32', 'CALVIN-KLEIN-5330-32', '2364024402171', '{"Colour":"32"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CALVIN-KLEIN-5330-32'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 359.09, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 222.64, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '34', 'CALVIN-KLEIN-5330-34', '2564400874374', '{"Colour":"34"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CALVIN-KLEIN-5330-34'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 340.2, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 210.92, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '36', 'CALVIN-KLEIN-5330-36', '5479125288849', '{"Colour":"36"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CALVIN-KLEIN-5330-36'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 344.24, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 213.43, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calvin Klein Slim Chinos', 0, true);
  end if;

  -- RNG Apparel Executive Suit  (category: mens-suits-blazers, brand: rng-apparel)
  select id into v_prod from public.products where slug = 'rng-apparel-executive-suit';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'mens-suits-blazers'),
            (select id from public.brands where slug = 'rng-apparel'),
            'RNG Apparel Executive Suit',
            'rng-apparel-executive-suit',
            'Two-piece tailored suit in a sharp contemporary cut. Locally tailored quality for interviews, weddings and formal events.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'RNG-APPAREL-1704-S', '4757908711199', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-1704-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 848.52, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 32, 0, 526.08, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'RNG-APPAREL-1704-M', '7886199575177', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-1704-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 870.24, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 32, 0, 539.55, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'RNG-APPAREL-1704-L', '9681847594009', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-1704-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 859.67, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 32, 0, 533.0, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1804079/pexels-photo-1804079.jpeg?auto=compress&cs=tinysrgb&w=800', 'RNG Apparel Executive Suit', 0, true);
  end if;

  -- RNG Apparel Lightweight Blazer  (category: mens-suits-blazers, brand: rng-apparel)
  select id into v_prod from public.products where slug = 'rng-apparel-lightweight-blazer';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'mens-suits-blazers'),
            (select id from public.brands where slug = 'rng-apparel'),
            'RNG Apparel Lightweight Blazer',
            'rng-apparel-lightweight-blazer',
            'Unstructured blazer that dresses up any outfit without the weight. Ideal for Accra''s warm business climate.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'RNG-APPAREL-9951-S', '9186346879898', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-9951-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 518.75, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 19, 0, 321.62, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'RNG-APPAREL-9951-L', '6430619778160', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-9951-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 547.78, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 19, 0, 339.62, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2861971/pexels-photo-2861971.jpeg?auto=compress&cs=tinysrgb&w=800', 'RNG Apparel Lightweight Blazer', 0, true);
  end if;

  -- Nike Dry-Fit Training Top  (category: mens-sportswear, brand: nike)
  select id into v_prod from public.products where slug = 'nike-dry-fit-training-top';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'mens-sportswear'),
            (select id from public.brands where slug = 'nike'),
            'Nike Dry-Fit Training Top',
            'nike-dry-fit-training-top',
            'Moisture-wicking Dry-Fit training tee that keeps you cool through the hottest workouts.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'NIKE-2288-S', '0930738250265', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-2288-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 259.56, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 160.93, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'NIKE-2288-M', '8087828947047', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-2288-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 262.09, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 162.5, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'NIKE-2288-L', '1651932756856', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-2288-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 269.96, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 167.38, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nike Dry-Fit Training Top', 0, true);
  end if;

  -- Adidas 3-Stripes Track Jacket  (category: mens-jackets-coats, brand: adidas)
  select id into v_prod from public.products where slug = 'adidas-3-stripes-track-jacket';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'mens-jackets-coats'),
            (select id from public.brands where slug = 'adidas'),
            'Adidas 3-Stripes Track Jacket',
            'adidas-3-stripes-track-jacket',
            'Classic track jacket with the iconic three stripes. A sporty layer for training or weekend style.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'ADIDAS-7799-S', '6601291335228', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-7799-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 415.79, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 257.79, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'ADIDAS-7799-M', '4375681744748', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-7799-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 428.87, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 265.9, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'ADIDAS-7799-L', '3408601986407', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-7799-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 411.55, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 255.16, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800', 'Adidas 3-Stripes Track Jacket', 0, true);
  end if;

  -- Woodin Traditional Kente Waistcoat  (category: mens-traditional-wear, brand: woodin)
  select id into v_prod from public.products where slug = 'woodin-traditional-kente-waistcoat';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'mens-traditional-wear'),
            (select id from public.brands where slug = 'woodin'),
            'Woodin Traditional Kente Waistcoat',
            'woodin-traditional-kente-waistcoat',
            'Elegant kente waistcoat for funerals, festivals and special occasions. Worn over a plain shirt and tailored trousers.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'WOODIN-1951-M', '0636805332345', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-1951-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 480.69, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 10, 0, 298.03, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'WOODIN-1951-L', '0215903074311', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-1951-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 487.03, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 10, 0, 301.96, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/8467410/pexels-photo-8467410.jpeg?auto=compress&cs=tinysrgb&w=800', 'Woodin Traditional Kente Waistcoat', 0, true);
  end if;

  -- Casio Analog Dress Watch  (category: mens-fashion-watches, brand: casio)
  select id into v_prod from public.products where slug = 'casio-analog-dress-watch';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'mens-fashion-watches'),
            (select id from public.brands where slug = 'casio'),
            'Casio Analog Dress Watch',
            'casio-analog-dress-watch',
            'Stainless-steel analog watch with date window and water resistance. Understated elegance for work and events.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'CASIO-3548-BLACK', '5716433436662', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CASIO-3548-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 680.15, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 518.48, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 38, 0, 421.69, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'SILVER', 'CASIO-3548-SILVER', '4301593161120', '{"Colour":"SILVER"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CASIO-3548-SILVER'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 704.01, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 580.29, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 38, 0, 436.49, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1308640/pexels-photo-1308640.jpeg?auto=compress&cs=tinysrgb&w=800', 'Casio Analog Dress Watch', 0, true);
  end if;

  -- Woodin Floral Print Maxi Dress  (category: dresses, brand: woodin)
  select id into v_prod from public.products where slug = 'woodin-floral-print-maxi-dress';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'dresses'),
            (select id from public.brands where slug = 'woodin'),
            'Woodin Floral Print Maxi Dress',
            'woodin-floral-print-maxi-dress',
            'Flowing maxi dress in a vibrant floral African print. Flattering fit with breathable cotton for day or evening.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'WOODIN-9410-S', '7243023745852', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-9410-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 502.18, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 45, 0, 311.35, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'WOODIN-9410-M', '6423083954420', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-9410-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 464.47, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 45, 0, 287.97, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'WOODIN-9410-L', '8154732032517', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-9410-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 504.39, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 45, 0, 312.72, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 'Woodin Floral Print Maxi Dress', 0, true);
  end if;

  -- RNG Apparel Slip Dress  (category: dresses, brand: rng-apparel)
  select id into v_prod from public.products where slug = 'rng-apparel-slip-dress';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'dresses'),
            (select id from public.brands where slug = 'rng-apparel'),
            'RNG Apparel Slip Dress',
            'rng-apparel-slip-dress',
            'Sleek satin slip dress that transitions from day to night. Minimal lines, maximum versatility.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'RNG-APPAREL-9750-S', '7027312718983', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-9750-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 254.42, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 12, 0, 157.74, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'RNG-APPAREL-9750-M', '5451905846647', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-9750-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 270.11, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 12, 0, 167.47, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1767432/pexels-photo-1767432.jpeg?auto=compress&cs=tinysrgb&w=800', 'RNG Apparel Slip Dress', 0, true);
  end if;

  -- Tommy Hilfiger Cotton Blouse  (category: tops-blouses, brand: tommy-hilfiger)
  select id into v_prod from public.products where slug = 'tommy-hilfiger-cotton-blouse';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'tops-blouses'),
            (select id from public.brands where slug = 'tommy-hilfiger'),
            'Tommy Hilfiger Cotton Blouse',
            'tommy-hilfiger-cotton-blouse',
            'Breezy cotton blouse with classic flag embroidery. A polished, feminine office essential.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'TOMMY-HILFIGER-2674-S', '7323645938952', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TOMMY-HILFIGER-2674-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 269.47, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 195.07, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 16, 0, 167.07, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'TOMMY-HILFIGER-2674-M', '9368963732453', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TOMMY-HILFIGER-2674-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 272.63, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 194.6, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 16, 0, 169.03, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tommy Hilfiger Cotton Blouse', 0, true);
  end if;

  -- Calvin Klein Ribbed Knit Top  (category: tops-blouses, brand: calvin-klein)
  select id into v_prod from public.products where slug = 'calvin-klein-ribbed-knit-top';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'tops-blouses'),
            (select id from public.brands where slug = 'calvin-klein'),
            'Calvin Klein Ribbed Knit Top',
            'calvin-klein-ribbed-knit-top',
            'Soft ribbed-knit top with a flattering fit. Easy to layer or wear alone for a clean everyday look.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'CALVIN-KLEIN-7633-S', '6124307546864', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CALVIN-KLEIN-7633-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 229.73, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 14, 0, 142.43, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'CALVIN-KLEIN-7633-M', '6363894550193', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CALVIN-KLEIN-7633-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 212.28, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 14, 0, 131.61, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1553783/pexels-photo-1553783.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calvin Klein Ribbed Knit Top', 0, true);
  end if;

  -- Levi's High-Rise Skinny Jeans  (category: womens-fashion-jeans, brand: levis)
  select id into v_prod from public.products where slug = 'levi-s-high-rise-skinny-jeans';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'womens-fashion-jeans'),
            (select id from public.brands where slug = 'levis'),
            'Levi''s High-Rise Skinny Jeans',
            'levi-s-high-rise-skinny-jeans',
            'High-rise skinny jeans with stretch for a sculpted, all-day-comfortable silhouette.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '28', 'LEVIS-3213-28', '2905471252669', '{"Colour":"28"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-3213-28'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 416.6, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 258.29, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '30', 'LEVIS-3213-30', '5772386460888', '{"Colour":"30"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-3213-30'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 437.36, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 271.16, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '32', 'LEVIS-3213-32', '9283991616721', '{"Colour":"32"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-3213-32'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 413.94, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 256.64, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800', 'Levi''s High-Rise Skinny Jeans', 0, true);
  end if;

  -- RNG Apparel Tailored Trousers  (category: trousers, brand: rng-apparel)
  select id into v_prod from public.products where slug = 'rng-apparel-tailored-trousers';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'trousers'),
            (select id from public.brands where slug = 'rng-apparel'),
            'RNG Apparel Tailored Trousers',
            'rng-apparel-tailored-trousers',
            'Sharp, tailored trousers with a modern straight leg. Workwear that keeps its crease.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'RNG-APPAREL-8100-S', '4015390999175', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-8100-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 338.7, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 44, 0, 209.99, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'RNG-APPAREL-8100-M', '0539426259889', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-8100-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 334.03, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 44, 0, 207.1, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800', 'RNG Apparel Tailored Trousers', 0, true);
  end if;

  -- Calvin Klein Wrap Skirt  (category: skirts, brand: calvin-klein)
  select id into v_prod from public.products where slug = 'calvin-klein-wrap-skirt';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'skirts'),
            (select id from public.brands where slug = 'calvin-klein'),
            'Calvin Klein Wrap Skirt',
            'calvin-klein-wrap-skirt',
            'Classic wrap skirt in a drape-friendly fabric. Feminine, flattering and easy to style.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'CALVIN-KLEIN-1422-S', '8383070668656', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CALVIN-KLEIN-1422-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 254.74, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 31, 0, 157.94, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'CALVIN-KLEIN-1422-M', '2189914160654', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CALVIN-KLEIN-1422-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 268.39, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 31, 0, 166.4, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1741235/pexels-photo-1741235.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calvin Klein Wrap Skirt', 0, true);
  end if;

  -- RNG Apparel Satin Jumpsuit  (category: jumpsuits, brand: rng-apparel)
  select id into v_prod from public.products where slug = 'rng-apparel-satin-jumpsuit';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'jumpsuits'),
            (select id from public.brands where slug = 'rng-apparel'),
            'RNG Apparel Satin Jumpsuit',
            'rng-apparel-satin-jumpsuit',
            'One-piece satin jumpsuit that makes a statement. Dress it up with heels for an evening out.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'RNG-APPAREL-1746-S', '7190586691457', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-1746-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 373.59, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 289.54, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 19, 0, 231.63, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'RNG-APPAREL-1746-M', '8989333808601', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-1746-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 385.26, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 308.55, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 19, 0, 238.86, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'RNG-APPAREL-1746-L', '0792208296254', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-1746-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 393.1, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 330.23, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 19, 0, 243.72, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/905391/pexels-photo-905391.jpeg?auto=compress&cs=tinysrgb&w=800', 'RNG Apparel Satin Jumpsuit', 0, true);
  end if;

  -- Woodin Ankara Wrap Dress  (category: womens-traditional-wear, brand: woodin)
  select id into v_prod from public.products where slug = 'woodin-ankara-wrap-dress';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'womens-traditional-wear'),
            (select id from public.brands where slug = 'woodin'),
            'Woodin Ankara Wrap Dress',
            'woodin-ankara-wrap-dress',
            'Vibrant Ankara wrap dress with true-to-size ties. A celebration of African style for every occasion.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'WOODIN-6539-S', '1583969228689', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-6539-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 439.62, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 34, 0, 272.56, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'WOODIN-6539-M', '8422265996294', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-6539-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 413.63, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 34, 0, 256.45, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'WOODIN-6539-L', '7965454402523', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-6539-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 440.04, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 34, 0, 272.82, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3130652/pexels-photo-3130652.jpeg?auto=compress&cs=tinysrgb&w=800', 'Woodin Ankara Wrap Dress', 0, true);
  end if;

  -- Woodin Kente Evening Gown  (category: womens-traditional-wear, brand: woodin)
  select id into v_prod from public.products where slug = 'woodin-kente-evening-gown';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'womens-traditional-wear'),
            (select id from public.brands where slug = 'woodin'),
            'Woodin Kente Evening Gown',
            'woodin-kente-evening-gown',
            'Show-stopping kente gown for weddings and black-tie events. Hand-finished detailing throughout.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'WOODIN-9801-S', '8438581580390', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-9801-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 645.12, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 23, 0, 399.97, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'WOODIN-9801-M', '8560915952365', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-9801-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 650.32, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 23, 0, 403.2, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/8467410/pexels-photo-8467410.jpeg?auto=compress&cs=tinysrgb&w=800', 'Woodin Kente Evening Gown', 0, true);
  end if;

  -- Nike Women's Run Shorts  (category: womens-sportswear, brand: nike)
  select id into v_prod from public.products where slug = 'nike-women-s-run-shorts';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'womens-sportswear'),
            (select id from public.brands where slug = 'nike'),
            'Nike Women''s Run Shorts',
            'nike-women-s-run-shorts',
            'Lightweight running shorts with inner brief and sweat-wicking fabric. Built for pace.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'NIKE-5611-S', '5586930700609', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-5611-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 174.26, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 37, 0, 108.04, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'NIKE-5611-M', '3873817362688', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-5611-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 181.36, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 37, 0, 112.44, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1124466/pexels-photo-1124466.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nike Women''s Run Shorts', 0, true);
  end if;

  -- Casio Women's Minimal Watch  (category: womens-fashion-watches, brand: casio)
  select id into v_prod from public.products where slug = 'casio-women-s-minimal-watch';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'womens-fashion-watches'),
            (select id from public.brands where slug = 'casio'),
            'Casio Women''s Minimal Watch',
            'casio-women-s-minimal-watch',
            'Slim minimalist watch with a delicate strap. Effortless everyday elegance.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'SILVER', 'CASIO-5382-SILVER', '5774702770688', '{"Colour":"SILVER"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CASIO-5382-SILVER'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 569.47, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 353.07, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'CASIO-5382-BLACK', '1122747024695', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CASIO-5382-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 549.9, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 340.94, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=800', 'Casio Women''s Minimal Watch', 0, true);
  end if;

  -- RNG Apparel Leather Tote Bag  (category: handbags, brand: rng-apparel)
  select id into v_prod from public.products where slug = 'rng-apparel-leather-tote-bag';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'handbags'),
            (select id from public.brands where slug = 'rng-apparel'),
            'RNG Apparel Leather Tote Bag',
            'rng-apparel-leather-tote-bag',
            'Roomy leather-look tote that fits a laptop and daily essentials. Structured and chic.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'RNG-APPAREL-1233-BLACK', '9750053579657', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-1233-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 288.84, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 179.08, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'TAN', 'RNG-APPAREL-1233-TAN', '9758108603401', '{"Colour":"TAN"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-1233-TAN'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 293.4, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 181.91, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1295953/pexels-photo-1295953.jpeg?auto=compress&cs=tinysrgb&w=800', 'RNG Apparel Leather Tote Bag', 0, true);
  end if;

  -- Adidas Women's Track Jacket  (category: womens-jackets-coats, brand: adidas)
  select id into v_prod from public.products where slug = 'adidas-women-s-track-jacket';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'womens-jackets-coats'),
            (select id from public.brands where slug = 'adidas'),
            'Adidas Women''s Track Jacket',
            'adidas-women-s-track-jacket',
            'Iconic track jacket in a women''s cut. Sporty comfort with street-ready style.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'ADIDAS-4418-S', '1522340427921', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-4418-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 386.2, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 24, 0, 239.44, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'ADIDAS-4418-M', '9775669118076', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-4418-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 386.92, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 24, 0, 239.89, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800', 'Adidas Women''s Track Jacket', 0, true);
  end if;

  -- Woodin Kids' African Print Shirt  (category: boys-clothing, brand: woodin)
  select id into v_prod from public.products where slug = 'woodin-kids-african-print-shirt';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'boys-clothing'),
            (select id from public.brands where slug = 'woodin'),
            'Woodin Kids'' African Print Shirt',
            'woodin-kids-african-print-shirt',
            'Bold print shirt for little gentlemen. Soft cotton, easy care and proudly Ghanaian.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '4Y', 'WOODIN-6256-4Y', '6358422135676', '{"Size":"4Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-6256-4Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 143.43, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 38, 0, 88.93, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '6Y', 'WOODIN-6256-6Y', '4476391856544', '{"Size":"6Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-6256-6Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 146.41, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 38, 0, 90.77, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '8Y', 'WOODIN-6256-8Y', '0365941662442', '{"Size":"8Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-6256-8Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 146.39, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 38, 0, 90.76, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800', 'Woodin Kids'' African Print Shirt', 0, true);
  end if;

  -- Levi's Kids' Denim Jeans  (category: boys-clothing, brand: levis)
  select id into v_prod from public.products where slug = 'levi-s-kids-denim-jeans';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'boys-clothing'),
            (select id from public.brands where slug = 'levis'),
            'Levi''s Kids'' Denim Jeans',
            'levi-s-kids-denim-jeans',
            'Hard-wearing denim jeans in a kids'' regular fit. Built for school, play and everything between.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '4Y', 'LEVIS-1547-4Y', '0704459288025', '{"Size":"4Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-1547-4Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 180.42, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 25, 0, 111.86, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '6Y', 'LEVIS-1547-6Y', '7564380796593', '{"Size":"6Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-1547-6Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 175.62, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 25, 0, 108.88, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '8Y', 'LEVIS-1547-8Y', '6012633807424', '{"Size":"8Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LEVIS-1547-8Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 188.82, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 25, 0, 117.07, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/196661/pexels-photo-196661.jpeg?auto=compress&cs=tinysrgb&w=800', 'Levi''s Kids'' Denim Jeans', 0, true);
  end if;

  -- RNG Apparel Girls' A-Line Dress  (category: girls-clothing, brand: rng-apparel)
  select id into v_prod from public.products where slug = 'rng-apparel-girls-a-line-dress';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'girls-clothing'),
            (select id from public.brands where slug = 'rng-apparel'),
            'RNG Apparel Girls'' A-Line Dress',
            'rng-apparel-girls-a-line-dress',
            'Sweet A-line dress with a twirl-worthy skirt. Comfortable cotton for parties and church.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '4Y', 'RNG-APPAREL-7269-4Y', '9906428005058', '{"Size":"4Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-7269-4Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 161.43, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 10, 0, 100.09, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '6Y', 'RNG-APPAREL-7269-6Y', '4799158670703', '{"Size":"6Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-7269-6Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 154.17, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 10, 0, 95.59, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '8Y', 'RNG-APPAREL-7269-8Y', '8822695258236', '{"Size":"8Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-7269-8Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 166.02, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 10, 0, 102.93, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 'RNG Apparel Girls'' A-Line Dress', 0, true);
  end if;

  -- Tommy Hilfiger Girls' Print Top  (category: girls-clothing, brand: tommy-hilfiger)
  select id into v_prod from public.products where slug = 'tommy-hilfiger-girls-print-top';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'girls-clothing'),
            (select id from public.brands where slug = 'tommy-hilfiger'),
            'Tommy Hilfiger Girls'' Print Top',
            'tommy-hilfiger-girls-print-top',
            'Colourful print top with a comfy fit. Mix, match and layer for school days.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '4Y', 'TOMMY-HILFIGER-8501-4Y', '8862564977912', '{"Size":"4Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TOMMY-HILFIGER-8501-4Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 146.33, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 25, 0, 90.72, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '6Y', 'TOMMY-HILFIGER-8501-6Y', '5465177275562', '{"Size":"6Y"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TOMMY-HILFIGER-8501-6Y'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 143.69, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 25, 0, 89.09, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tommy Hilfiger Girls'' Print Top', 0, true);
  end if;

  -- Woodin Baby Cotton Set  (category: baby-clothing, brand: woodin)
  select id into v_prod from public.products where slug = 'woodin-baby-cotton-set';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'baby-clothing'),
            (select id from public.brands where slug = 'woodin'),
            'Woodin Baby Cotton Set',
            'woodin-baby-cotton-set',
            'Two-piece soft cotton set with a gentle African print. Kind to delicate baby skin.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '0-6M', 'WOODIN-6035-0-6M', '9805231088121', '{"Size":"0-6M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-6035-0-6M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 122.68, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 97.64, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 23, 0, 76.06, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '6-12M', 'WOODIN-6035-6-12M', '4242347845227', '{"Size":"6-12M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'WOODIN-6035-6-12M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 119.88, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 93.59, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 23, 0, 74.33, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800', 'Woodin Baby Cotton Set', 0, true);
  end if;

  -- RNG Apparel School Uniform Shirt  (category: school-wear, brand: rng-apparel)
  select id into v_prod from public.products where slug = 'rng-apparel-school-uniform-shirt';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'school-wear'),
            (select id from public.brands where slug = 'rng-apparel'),
            'RNG Apparel School Uniform Shirt',
            'rng-apparel-school-uniform-shirt',
            'Crisp, durable uniform shirt with a comfortable cut. Made to withstand the school term.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'S', 'RNG-APPAREL-8822-S', '3195499397452', '{"Size":"S"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-8822-S'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 144.99, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 29, 0, 89.89, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'M', 'RNG-APPAREL-8822-M', '4097700454024', '{"Size":"M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-8822-M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 144.82, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 29, 0, 89.79, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'L', 'RNG-APPAREL-8822-L', '8254117916187', '{"Size":"L"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-8822-L'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 153.05, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 29, 0, 94.89, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=800', 'RNG Apparel School Uniform Shirt', 0, true);
  end if;

  -- Nike Air Max Sneakers  (category: sneakers, brand: nike)
  select id into v_prod from public.products where slug = 'nike-air-max-sneakers';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'sneakers'),
            (select id from public.brands where slug = 'nike'),
            'Nike Air Max Sneakers',
            'nike-air-max-sneakers',
            'Legendary Air Max cushioning in a classic silhouette. All-day comfort with unmistakable style.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '41', 'NIKE-1381-41', '3049962358917', '{"Colour":"41"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-1381-41'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 721.84, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 35, 0, 447.54, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '42', 'NIKE-1381-42', '9695443544832', '{"Colour":"42"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-1381-42'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 746.51, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 35, 0, 462.84, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '43', 'NIKE-1381-43', '5946512461845', '{"Colour":"43"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-1381-43'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 726.9, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 35, 0, 450.68, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nike Air Max Sneakers', 0, true);
  end if;

  -- Adidas Ultraboost Running Shoes  (category: sneakers, brand: adidas)
  select id into v_prod from public.products where slug = 'adidas-ultraboost-running-shoes';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'sneakers'),
            (select id from public.brands where slug = 'adidas'),
            'Adidas Ultraboost Running Shoes',
            'adidas-ultraboost-running-shoes',
            'Ultra-responsive Boost midsole for serious runners and streetwear fans alike.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '41', 'ADIDAS-8375-41', '4923718863155', '{"Colour":"41"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-8375-41'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 751.26, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 529.57, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 29, 0, 465.78, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '42', 'ADIDAS-8375-42', '0561691380371', '{"Colour":"42"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-8375-42'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 810.46, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 675.8, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 29, 0, 502.49, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '43', 'ADIDAS-8375-43', '5920083108095', '{"Colour":"43"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-8375-43'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 772.78, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 552.45, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 29, 0, 479.12, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1478442/pexels-photo-1478442.jpeg?auto=compress&cs=tinysrgb&w=800', 'Adidas Ultraboost Running Shoes', 0, true);
  end if;

  -- Clarks Desert Boot  (category: boots, brand: clarks)
  select id into v_prod from public.products where slug = 'clarks-desert-boot';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'boots'),
            (select id from public.brands where slug = 'clarks'),
            'Clarks Desert Boot',
            'clarks-desert-boot',
            'The timeless crepe-soled desert boot. Handcrafted comfort that goes with everything.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '41', 'CLARKS-9283-41', '4546789222005', '{"Colour":"41"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CLARKS-9283-41'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 604.58, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 30, 0, 374.84, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '42', 'CLARKS-9283-42', '2833778110293', '{"Colour":"42"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CLARKS-9283-42'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 622.2, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 30, 0, 385.76, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '43', 'CLARKS-9283-43', '9404704898559', '{"Colour":"43"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CLARKS-9283-43'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 605.44, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 30, 0, 375.37, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800', 'Clarks Desert Boot', 0, true);
  end if;

  -- Hush Puppies Formal Oxford  (category: formal-shoes, brand: hush-puppies)
  select id into v_prod from public.products where slug = 'hush-puppies-formal-oxford';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'formal-shoes'),
            (select id from public.brands where slug = 'hush-puppies'),
            'Hush Puppies Formal Oxford',
            'hush-puppies-formal-oxford',
            'Polished leather oxfords with cushioning for long days at work. Office-ready comfort.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '41', 'HUSH-PUPPIES-8228-41', '3505074238573', '{"Colour":"41"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'HUSH-PUPPIES-8228-41'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 462.62, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 375.34, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 286.82, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '42', 'HUSH-PUPPIES-8228-42', '6794907958208', '{"Colour":"42"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'HUSH-PUPPIES-8228-42'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 499.73, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 350.22, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 309.83, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '43', 'HUSH-PUPPIES-8228-43', '4316910136170', '{"Colour":"43"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'HUSH-PUPPIES-8228-43'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 464.77, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 357.28, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 288.16, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/267320/pexels-photo-267320.jpeg?auto=compress&cs=tinysrgb&w=800', 'Hush Puppies Formal Oxford', 0, true);
  end if;

  -- PUMA Slip-On Sandals  (category: sandals, brand: puma)
  select id into v_prod from public.products where slug = 'puma-slip-on-sandals';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'sandals'),
            (select id from public.brands where slug = 'puma'),
            'PUMA Slip-On Sandals',
            'puma-slip-on-sandals',
            'Everyday slip-on sandals with cushioned footbed. Ideal for the Ghanaian heat.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '41', 'PUMA-1728-41', '7645833491316', '{"Colour":"41"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'PUMA-1728-41'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 222.55, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 137.98, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '42', 'PUMA-1728-42', '8211348773576', '{"Colour":"42"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'PUMA-1728-42'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 226.43, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 140.39, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '43', 'PUMA-1728-43', '0935162343163', '{"Colour":"43"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'PUMA-1728-43'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 216.64, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 134.32, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3341481/pexels-photo-3341481.jpeg?auto=compress&cs=tinysrgb&w=800', 'PUMA Slip-On Sandals', 0, true);
  end if;

  -- Reebok Classic Sneakers  (category: sneakers, brand: reebok)
  select id into v_prod from public.products where slug = 'reebok-classic-sneakers';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'sneakers'),
            (select id from public.brands where slug = 'reebok'),
            'Reebok Classic Sneakers',
            'reebok-classic-sneakers',
            'Retro white leather sneakers with timeless appeal. Easy to wear, easy to love.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '41', 'REEBOK-2497-41', '3122129091060', '{"Colour":"41"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'REEBOK-2497-41'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 416.83, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 20, 0, 258.43, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '42', 'REEBOK-2497-42', '6271131998748', '{"Colour":"42"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'REEBOK-2497-42'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 431.55, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 20, 0, 267.56, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '43', 'REEBOK-2497-43', '3478222764852', '{"Colour":"43"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'REEBOK-2497-43'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 433.61, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 20, 0, 268.84, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 'Reebok Classic Sneakers', 0, true);
  end if;

  -- Hush Puppies Comfort Loafer  (category: mens-fashion-shoes, brand: hush-puppies)
  select id into v_prod from public.products where slug = 'hush-puppies-comfort-loafer';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'mens-fashion-shoes'),
            (select id from public.brands where slug = 'hush-puppies'),
            'Hush Puppies Comfort Loafer',
            'hush-puppies-comfort-loafer',
            'Slip-on loafers with generous cushioning. Smart-casual comfort from commute to weekend.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '41', 'HUSH-PUPPIES-8873-41', '0520455030488', '{"Colour":"41"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'HUSH-PUPPIES-8873-41'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 370.7, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 229.83, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '42', 'HUSH-PUPPIES-8873-42', '9166135069853', '{"Colour":"42"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'HUSH-PUPPIES-8873-42'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 383.38, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 237.7, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '43', 'HUSH-PUPPIES-8873-43', '2717068857733', '{"Colour":"43"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'HUSH-PUPPIES-8873-43'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 396.03, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 245.54, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/267320/pexels-photo-267320.jpeg?auto=compress&cs=tinysrgb&w=800', 'Hush Puppies Comfort Loafer', 0, true);
  end if;

  -- Clarks Women's Heeled Sandal  (category: womens-fashion-shoes, brand: clarks)
  select id into v_prod from public.products where slug = 'clarks-women-s-heeled-sandal';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'womens-fashion-shoes'),
            (select id from public.brands where slug = 'clarks'),
            'Clarks Women''s Heeled Sandal',
            'clarks-women-s-heeled-sandal',
            'Elegant block-heel sandal with a cushioned insole. Party-ready without the pain.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '38', 'CLARKS-7208-38', '5034087273045', '{"Colour":"38"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CLARKS-7208-38'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 359.69, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 36, 0, 223.01, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '39', 'CLARKS-7208-39', '4300337182292', '{"Colour":"39"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CLARKS-7208-39'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 340.75, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 36, 0, 211.26, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '40', 'CLARKS-7208-40', '1457226123775', '{"Colour":"40"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CLARKS-7208-40'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 330.42, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 36, 0, 204.86, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1329711/pexels-photo-1329711.jpeg?auto=compress&cs=tinysrgb&w=800', 'Clarks Women''s Heeled Sandal', 0, true);
  end if;

  -- Nike Kids' Court Shoes  (category: footwear-childrens-shoes, brand: nike)
  select id into v_prod from public.products where slug = 'nike-kids-court-shoes';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'footwear-childrens-shoes'),
            (select id from public.brands where slug = 'nike'),
            'Nike Kids'' Court Shoes',
            'nike-kids-court-shoes',
            'Durable court-style shoes for active kids. Easy velcro and go-anywhere grip.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '32', 'NIKE-7954-32', '3040970492747', '{"Colour":"32"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-7954-32'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 268.9, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 166.72, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '34', 'NIKE-7954-34', '5451333255271', '{"Colour":"34"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-7954-34'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 284.91, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 176.64, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '36', 'NIKE-7954-36', '9079571773638', '{"Colour":"36"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-7954-36'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 274.06, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 169.92, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nike Kids'' Court Shoes', 0, true);
  end if;

  -- Adidas Sports Training Shoes  (category: sports-shoes, brand: adidas)
  select id into v_prod from public.products where slug = 'adidas-sports-training-shoes';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'sports-shoes'),
            (select id from public.brands where slug = 'adidas'),
            'Adidas Sports Training Shoes',
            'adidas-sports-training-shoes',
            'Versatile training shoes with grippy outsole. Gym, court or track — they keep up.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '41', 'ADIDAS-5024-41', '9840626668021', '{"Colour":"41"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-5024-41'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 548.93, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 340.34, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '42', 'ADIDAS-5024-42', '1755690028214', '{"Colour":"42"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-5024-42'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 542.05, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 336.07, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '43', 'ADIDAS-5024-43', '4407644571570', '{"Colour":"43"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ADIDAS-5024-43'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 538.94, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 334.14, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1124466/pexels-photo-1124466.jpeg?auto=compress&cs=tinysrgb&w=800', 'Adidas Sports Training Shoes', 0, true);
  end if;

  -- Ray-Ban Aviator Sunglasses  (category: fashion-accessories-sunglasses, brand: ray-ban)
  select id into v_prod from public.products where slug = 'ray-ban-aviator-sunglasses';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'fashion-accessories-sunglasses'),
            (select id from public.brands where slug = 'ray-ban'),
            'Ray-Ban Aviator Sunglasses',
            'ray-ban-aviator-sunglasses',
            'The original aviator in gold-tone metal with G-15 lenses. Timeless pilot style with full UV protection.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'RAY-BAN-2623-BLACK', '6570314428752', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RAY-BAN-2623-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 457.01, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 283.35, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'GOLD', 'RAY-BAN-2623-GOLD', '2007452197553', '{"Colour":"GOLD"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RAY-BAN-2623-GOLD'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 451.21, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 279.75, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'GUN', 'RAY-BAN-2623-GUN', '5467438550272', '{"Colour":"GUN"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RAY-BAN-2623-GUN'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 455.3, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 282.29, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&w=800', 'Ray-Ban Aviator Sunglasses', 0, true);
  end if;

  -- Ray-Ban Wayfarer Sunglasses  (category: fashion-accessories-sunglasses, brand: ray-ban)
  select id into v_prod from public.products where slug = 'ray-ban-wayfarer-sunglasses';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'fashion-accessories-sunglasses'),
            (select id from public.brands where slug = 'ray-ban'),
            'Ray-Ban Wayfarer Sunglasses',
            'ray-ban-wayfarer-sunglasses',
            'The iconic Wayfarer frame that has defined cool for decades. Classic black with UV400 lenses.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'RAY-BAN-4242-BLACK', '1390389363179', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RAY-BAN-4242-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 406.31, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 299.97, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 30, 0, 251.91, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2580452/pexels-photo-2580452.jpeg?auto=compress&cs=tinysrgb&w=800', 'Ray-Ban Wayfarer Sunglasses', 0, true);
  end if;

  -- Casio Edifice Chronograph Watch  (category: fashion-accessories-watches, brand: casio)
  select id into v_prod from public.products where slug = 'casio-edifice-chronograph-watch';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'fashion-accessories-watches'),
            (select id from public.brands where slug = 'casio'),
            'Casio Edifice Chronograph Watch',
            'casio-edifice-chronograph-watch',
            'Sporty chronograph with multiple dials and stainless bracelet. Rugged yet refined.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'CASIO-8921-BLACK', '9940811232805', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CASIO-8921-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 502.89, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 11, 0, 311.79, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/277390/pexels-photo-277390.jpeg?auto=compress&cs=tinysrgb&w=800', 'Casio Edifice Chronograph Watch', 0, true);
  end if;

  -- Tommy Hilfiger Leather Belt  (category: fashion-accessories-belts, brand: tommy-hilfiger)
  select id into v_prod from public.products where slug = 'tommy-hilfiger-leather-belt';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'fashion-accessories-belts'),
            (select id from public.brands where slug = 'tommy-hilfiger'),
            'Tommy Hilfiger Leather Belt',
            'tommy-hilfiger-leather-belt',
            'Genuine leather belt with a polished buckle. Finish any outfit the right way.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '32', 'TOMMY-HILFIGER-1327-32', '3083629981445', '{"Colour":"32"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TOMMY-HILFIGER-1327-32'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 185.82, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 19, 0, 115.21, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '34', 'TOMMY-HILFIGER-1327-34', '6243023390275', '{"Colour":"34"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TOMMY-HILFIGER-1327-34'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 177.61, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 19, 0, 110.12, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '36', 'TOMMY-HILFIGER-1327-36', '7397614002739', '{"Colour":"36"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TOMMY-HILFIGER-1327-36'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 188.58, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 19, 0, 116.92, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2002719/pexels-photo-2002719.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tommy Hilfiger Leather Belt', 0, true);
  end if;

  -- Calvin Klein Leather Wallet  (category: fashion-accessories-wallets, brand: calvin-klein)
  select id into v_prod from public.products where slug = 'calvin-klein-leather-wallet';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'fashion-accessories-wallets'),
            (select id from public.brands where slug = 'calvin-klein'),
            'Calvin Klein Leather Wallet',
            'calvin-klein-leather-wallet',
            'Slim genuine leather wallet with multiple card slots. Minimal and durable.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'CALVIN-KLEIN-8032-BLACK', '5336530696983', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CALVIN-KLEIN-8032-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 157.6, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 35, 0, 97.71, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calvin Klein Leather Wallet', 0, true);
  end if;

  -- Nike Performance Cap  (category: caps-hats, brand: nike)
  select id into v_prod from public.products where slug = 'nike-performance-cap';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'caps-hats'),
            (select id from public.brands where slug = 'nike'),
            'Nike Performance Cap',
            'nike-performance-cap',
            'Breathable curved-brim cap with sweatband. Train or chill in classic Nike style.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'NIKE-8126-BLACK', '7981576828508', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-8126-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 91.98, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 42, 0, 57.03, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'NAVY', 'NIKE-8126-NAVY', '5497169414826', '{"Colour":"NAVY"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIKE-8126-NAVY'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 90.17, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 42, 0, 55.91, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2505705/pexels-photo-2505705.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nike Performance Cap', 0, true);
  end if;

  -- RNG Apparel Beaded Jewelry Set  (category: jewelry, brand: rng-apparel)
  select id into v_prod from public.products where slug = 'rng-apparel-beaded-jewelry-set';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'jewelry'),
            (select id from public.brands where slug = 'rng-apparel'),
            'RNG Apparel Beaded Jewelry Set',
            'rng-apparel-beaded-jewelry-set',
            'Handmade beaded necklace and bracelet set in vibrant colours. Statement pieces with local craft.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'GOLD', 'RNG-APPAREL-8722-GOLD', '9765698760476', '{"Colour":"GOLD"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-8722-GOLD'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 116.87, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 20, 0, 72.46, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'RNG-APPAREL-8722-BLACK', '1445069910614', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-8722-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 123.45, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 20, 0, 76.54, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'RED', 'RNG-APPAREL-8722-RED', '2953613208548', '{"Colour":"RED"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RNG-APPAREL-8722-RED'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 126.02, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 20, 0, 78.13, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1926767/pexels-photo-1926767.jpeg?auto=compress&cs=tinysrgb&w=800', 'RNG Apparel Beaded Jewelry Set', 0, true);
  end if;

  -- Hush Puppies Leather Tote Bag  (category: fashion-accessories-bags, brand: hush-puppies)
  select id into v_prod from public.products where slug = 'hush-puppies-leather-tote-bag';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'fashion-accessories-bags'),
            (select id from public.brands where slug = 'hush-puppies'),
            'Hush Puppies Leather Tote Bag',
            'hush-puppies-leather-tote-bag',
            'Genuine leather tote with sturdy handles. Spacious enough for work, smart enough for weekends.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BROWN', 'HUSH-PUPPIES-6236-BROWN', '4315754642250', '{"Colour":"BROWN"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'HUSH-PUPPIES-6236-BROWN'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 322.96, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 200.24, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg?auto=compress&cs=tinysrgb&w=800', 'Hush Puppies Leather Tote Bag', 0, true);
  end if;

  -- Samsung Galaxy A55 5G  (category: smartphones, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-galaxy-a55-5g';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'smartphones'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung Galaxy A55 5G',
            'samsung-galaxy-a55-5g',
            '6.6-inch Super AMOLED display, 50MP camera and long-lasting battery. A dependable 5G everyday phone.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '128GB', 'SAMSUNG-9817-128GB', '3144643700457', '{"Storage":"128GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-9817-128GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3085.39, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 2595.67, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 20, 0, 1912.94, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '256GB', 'SAMSUNG-9817-256GB', '0040848037844', '{"Storage":"256GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-9817-256GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3280.74, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 2365.46, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 20, 0, 2034.06, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2228550/pexels-photo-2228550.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung Galaxy A55 5G', 0, true);
  end if;

  -- Samsung Galaxy S24  (category: smartphones, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-galaxy-s24';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'smartphones'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung Galaxy S24',
            'samsung-galaxy-s24',
            'Flagship performance with an incredible camera system and Galaxy AI. The ultimate Android phone.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '256GB', 'SAMSUNG-4522-256GB', '9478764159684', '{"Storage":"256GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-4522-256GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 6122.06, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 3795.68, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '512GB', 'SAMSUNG-4522-512GB', '9240576843217', '{"Storage":"512GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-4522-512GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 6158.16, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 3818.06, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung Galaxy S24', 0, true);
  end if;

  -- Apple iPhone 15  (category: smartphones, brand: apple)
  select id into v_prod from public.products where slug = 'apple-iphone-15';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'smartphones'),
            (select id from public.brands where slug = 'apple'),
            'Apple iPhone 15',
            'apple-iphone-15',
            'Dynamic Island, A16 Bionic and a 48MP main camera. The definitive premium smartphone experience.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '128GB', 'APPLE-7417-128GB', '1163894045072', '{"Storage":"128GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'APPLE-7417-128GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 9453.88, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 9, 0, 5861.41, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '256GB', 'APPLE-7417-256GB', '1541703879344', '{"Storage":"256GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'APPLE-7417-256GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 9515.17, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 9, 0, 5899.41, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg?auto=compress&cs=tinysrgb&w=800', 'Apple iPhone 15', 0, true);
  end if;

  -- Tecno Spark 20  (category: smartphones, brand: tecno)
  select id into v_prod from public.products where slug = 'tecno-spark-20';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'smartphones'),
            (select id from public.brands where slug = 'tecno'),
            'Tecno Spark 20',
            'tecno-spark-20',
            'Big screen, huge battery and dual speakers — a feature-packed budget phone for everyday use.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '128GB', 'TECNO-1146-128GB', '1061261152517', '{"Storage":"128GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TECNO-1146-128GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 1318.27, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 9, 0, 817.33, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2228550/pexels-photo-2228550.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tecno Spark 20', 0, true);
  end if;

  -- Infinix Hot 40  (category: smartphones, brand: infinix)
  select id into v_prod from public.products where slug = 'infinix-hot-40';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'smartphones'),
            (select id from public.brands where slug = 'infinix'),
            'Infinix Hot 40',
            'infinix-hot-40',
            'Fast-charging 5000mAh battery and a smooth 90Hz display at an unbeatable price.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '128GB', 'INFINIX-6244-128GB', '7410421245769', '{"Storage":"128GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'INFINIX-6244-128GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 1293.17, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 11, 0, 801.77, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2228550/pexels-photo-2228550.jpeg?auto=compress&cs=tinysrgb&w=800', 'Infinix Hot 40', 0, true);
  end if;

  -- Itel P55  (category: smartphones, brand: itel)
  select id into v_prod from public.products where slug = 'itel-p55';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'smartphones'),
            (select id from public.brands where slug = 'itel'),
            'Itel P55',
            'itel-p55',
            'Reliable budget smartphone with a bright display and all-day battery. Great first phone.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '128GB', 'ITEL-6453-128GB', '8606015429786', '{"Storage":"128GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ITEL-6453-128GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 1078.83, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 6, 0, 668.87, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2228550/pexels-photo-2228550.jpeg?auto=compress&cs=tinysrgb&w=800', 'Itel P55', 0, true);
  end if;

  -- Nokia 105 Feature Phone  (category: feature-phones, brand: nokia)
  select id into v_prod from public.products where slug = 'nokia-105-feature-phone';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'feature-phones'),
            (select id from public.brands where slug = 'nokia'),
            'Nokia 105 Feature Phone',
            'nokia-105-feature-phone',
            'Rugged dual-SIM feature phone with a flashlight and FM radio. Weeks of battery life.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'NOKIA-2160-BLACK', '4282811319670', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NOKIA-2160-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 324.86, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 201.41, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nokia 105 Feature Phone', 0, true);
  end if;

  -- Itel A70 Feature Phone  (category: feature-phones, brand: itel)
  select id into v_prod from public.products where slug = 'itel-a70-feature-phone';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'feature-phones'),
            (select id from public.brands where slug = 'itel'),
            'Itel A70 Feature Phone',
            'itel-a70-feature-phone',
            'Affordable dual-SIM feature phone with a clear keypad and torch. Simple and dependable.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'ITEL-3329-BLACK', '8825351800435', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ITEL-3329-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 271.6, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 15, 0, 168.39, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=800', 'Itel A70 Feature Phone', 0, true);
  end if;

  -- Anker PowerCore 20000mAh Power Bank  (category: power-banks, brand: anker)
  select id into v_prod from public.products where slug = 'anker-powercore-20000mah-power-bank';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'power-banks'),
            (select id from public.brands where slug = 'anker'),
            'Anker PowerCore 20000mAh Power Bank',
            'anker-powercore-20000mah-power-bank',
            '20000mAh high-capacity power bank with fast charging for two devices at once.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'ANKER-1677-BLACK', '5947754851104', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ANKER-1677-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 353.95, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 25, 0, 219.45, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3888574/pexels-photo-3888574.jpeg?auto=compress&cs=tinysrgb&w=800', 'Anker PowerCore 20000mAh Power Bank', 0, true);
  end if;

  -- Anker PowerCore 10000mAh Power Bank  (category: power-banks, brand: anker)
  select id into v_prod from public.products where slug = 'anker-powercore-10000mah-power-bank';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'power-banks'),
            (select id from public.brands where slug = 'anker'),
            'Anker PowerCore 10000mAh Power Bank',
            'anker-powercore-10000mah-power-bank',
            'Pocket-friendly 10000mAh power bank with USB-C fast charge. Never run dry on the go.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'ANKER-7060-BLACK', '4036880821165', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ANKER-7060-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 217.28, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 10, 0, 134.71, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3888574/pexels-photo-3888574.jpeg?auto=compress&cs=tinysrgb&w=800', 'Anker PowerCore 10000mAh Power Bank', 0, true);
  end if;

  -- Samsung 25W Fast Charger  (category: fast-chargers, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-25w-fast-charger';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'fast-chargers'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung 25W Fast Charger',
            'samsung-25w-fast-charger',
            'Genuine Samsung 25W USB-C wall charger for rapid, safe top-ups.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'WHITE', 'SAMSUNG-1571-WHITE', '6457679960373', '{"Colour":"WHITE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-1571-WHITE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 189.35, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 6, 0, 117.4, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3225299/pexels-photo-3225299.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung 25W Fast Charger', 0, true);
  end if;

  -- Anker USB-C Cable (1m)  (category: usb-cables, brand: anker)
  select id into v_prod from public.products where slug = 'anker-usb-c-cable-1m';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'usb-cables'),
            (select id from public.brands where slug = 'anker'),
            'Anker USB-C Cable (1m)',
            'anker-usb-c-cable-1m',
            'Durable braided USB-C cable with fast data and charge speeds. Built to last.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '1M', 'ANKER-7542-1M', '5308959976366', '{"Length":"1M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ANKER-7542-1M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 82.46, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 11, 0, 51.13, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '2M', 'ANKER-7542-2M', '6255636696927', '{"Length":"2M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ANKER-7542-2M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 83.3, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 11, 0, 51.65, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3862629/pexels-photo-3862629.jpeg?auto=compress&cs=tinysrgb&w=800', 'Anker USB-C Cable (1m)', 0, true);
  end if;

  -- Anker 3-in-1 Wireless Charger  (category: wireless-chargers, brand: anker)
  select id into v_prod from public.products where slug = 'anker-3-in-1-wireless-charger';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'wireless-chargers'),
            (select id from public.brands where slug = 'anker'),
            'Anker 3-in-1 Wireless Charger',
            'anker-3-in-1-wireless-charger',
            'Charge your phone, earbuds and watch together on one sleek wireless pad.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'ANKER-1496-BLACK', '0540409861241', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ANKER-1496-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 262.32, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 28, 0, 162.64, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/4327055/pexels-photo-4327055.jpeg?auto=compress&cs=tinysrgb&w=800', 'Anker 3-in-1 Wireless Charger', 0, true);
  end if;

  -- Tecno Clear Phone Case  (category: phone-cases, brand: tecno)
  select id into v_prod from public.products where slug = 'tecno-clear-phone-case';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'phone-cases'),
            (select id from public.brands where slug = 'tecno'),
            'Tecno Clear Phone Case',
            'tecno-clear-phone-case',
            'Slim transparent case that shows off your Spark while protecting it.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'CLEAR', 'TECNO-9207-CLEAR', '3438461791781', '{"Colour":"CLEAR"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TECNO-9207-CLEAR'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 61.17, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 51.67, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 25, 0, 37.93, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3923547/pexels-photo-3923547.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tecno Clear Phone Case', 0, true);
  end if;

  -- Samsung Galaxy Silicone Case  (category: phone-cases, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-galaxy-silicone-case';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'phone-cases'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung Galaxy Silicone Case',
            'samsung-galaxy-silicone-case',
            'Soft-touch silicone case with precise cutouts. Lightweight protection in bold colours.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'SAMSUNG-7145-BLACK', '6184773128018', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-7145-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 87.2, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 70.34, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 9, 0, 54.06, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'NAVY', 'SAMSUNG-7145-NAVY', '6065514526273', '{"Colour":"NAVY"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-7145-NAVY'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 88.82, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 74.85, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 9, 0, 55.07, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'TEAL', 'SAMSUNG-7145-TEAL', '1546287305548', '{"Colour":"TEAL"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-7145-TEAL'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 86.56, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 72.15, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 9, 0, 53.67, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/6249441/pexels-photo-6249441.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung Galaxy Silicone Case', 0, true);
  end if;

  -- Infinix Tempered Glass Screen Protector  (category: screen-protectors, brand: infinix)
  select id into v_prod from public.products where slug = 'infinix-tempered-glass-screen-protector';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'screen-protectors'),
            (select id from public.brands where slug = 'infinix'),
            'Infinix Tempered Glass Screen Protector',
            'infinix-tempered-glass-screen-protector',
            '9H tempered glass with oleophobic coating. Crystal-clear protection for your display.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'CLEAR', 'INFINIX-1328-CLEAR', '7261200171607', '{"Colour":"CLEAR"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'INFINIX-1328-CLEAR'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 48.08, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 12, 0, 29.81, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1381553/pexels-photo-1381553.jpeg?auto=compress&cs=tinysrgb&w=800', 'Infinix Tempered Glass Screen Protector', 0, true);
  end if;

  -- Samsung Galaxy Tab S9  (category: android-tablets, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-galaxy-tab-s9';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'android-tablets'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung Galaxy Tab S9',
            'samsung-galaxy-tab-s9',
            'Premium 11-inch AMOLED tablet with S Pen included. A productivity and entertainment powerhouse.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '128GB', 'SAMSUNG-8192-128GB', '7361230369460', '{"Storage":"128GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-8192-128GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3742.26, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 23, 0, 2320.2, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '256GB', 'SAMSUNG-8192-256GB', '1986220578903', '{"Storage":"256GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-8192-256GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3714.31, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 23, 0, 2302.87, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung Galaxy Tab S9', 0, true);
  end if;

  -- Tecno MegaPad 11  (category: android-tablets, brand: tecno)
  select id into v_prod from public.products where slug = 'tecno-megapad-11';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'android-tablets'),
            (select id from public.brands where slug = 'tecno'),
            'Tecno MegaPad 11',
            'tecno-megapad-11',
            'Big 11-inch display for study, movies and browsing at a friendly price.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '128GB', 'TECNO-8392-128GB', '3282201959524', '{"Storage":"128GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TECNO-8392-128GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 1455.48, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 27, 0, 902.4, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1556228/pexels-photo-1556228.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tecno MegaPad 11', 0, true);
  end if;

  -- Apple iPad (10th Gen)  (category: ipads, brand: apple)
  select id into v_prod from public.products where slug = 'apple-ipad-10th-gen';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'ipads'),
            (select id from public.brands where slug = 'apple'),
            'Apple iPad (10th Gen)',
            'apple-ipad-10th-gen',
            'Stunning 10.9-inch Liquid Retina display and A14 chip. The versatile all-round iPad.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '64GB', 'APPLE-3412-64GB', '7163689213550', '{"Storage":"64GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'APPLE-3412-64GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 5212.55, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 15, 0, 3231.78, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '256GB', 'APPLE-3412-256GB', '7097764625528', '{"Storage":"256GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'APPLE-3412-256GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 5097.89, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 15, 0, 3160.69, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?auto=compress&cs=tinysrgb&w=800', 'Apple iPad (10th Gen)', 0, true);
  end if;

  -- Apple MacBook Air M3  (category: laptops, brand: apple)
  select id into v_prod from public.products where slug = 'apple-macbook-air-m3';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'laptops'),
            (select id from public.brands where slug = 'apple'),
            'Apple MacBook Air M3',
            'apple-macbook-air-m3',
            'Ultra-thin M3-powered MacBook Air with all-day battery. Silent, fast and beautifully light.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '256GB', 'APPLE-8962-256GB', '0544757661621', '{"Storage":"256GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'APPLE-8962-256GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 11081.61, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 27, 0, 6870.6, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '512GB', 'APPLE-8962-512GB', '6086166180101', '{"Storage":"512GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'APPLE-8962-512GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 11234.77, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 27, 0, 6965.56, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1804894/pexels-photo-1804894.jpeg?auto=compress&cs=tinysrgb&w=800', 'Apple MacBook Air M3', 0, true);
  end if;

  -- Huawei MateBook D16  (category: laptops, brand: huawei)
  select id into v_prod from public.products where slug = 'huawei-matebook-d16';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'laptops'),
            (select id from public.brands where slug = 'huawei'),
            'Huawei MateBook D16',
            'huawei-matebook-d16',
            '16-inch Huawei laptop with a comfortable keyboard and long battery. Serious work, serious value.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '512GB', 'HUAWEI-8256-512GB', '9354418292320', '{"Storage":"512GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'HUAWEI-8256-512GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 6332.62, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 3926.22, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=800', 'Huawei MateBook D16', 0, true);
  end if;

  -- Samsung Galaxy Book4  (category: laptops, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-galaxy-book4';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'laptops'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung Galaxy Book4',
            'samsung-galaxy-book4',
            'Sleek Galaxy Book with vivid AMOLED display and fast performance for professionals.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '512GB', 'SAMSUNG-4776-512GB', '6526510441804', '{"Storage":"512GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-4776-512GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 8037.25, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 4983.1, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/47261/pexels-photo-47261.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung Galaxy Book4', 0, true);
  end if;

  -- Samsung 27-inch Smart Monitor  (category: monitors, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-27-inch-smart-monitor';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'monitors'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung 27-inch Smart Monitor',
            'samsung-27-inch-smart-monitor',
            '27-inch QHD monitor with smart TV apps built in. Work and watch from one screen.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'SAMSUNG-8050-BLACK', '6991694459639', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-8050-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 2121.25, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 16, 0, 1315.17, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung 27-inch Smart Monitor', 0, true);
  end if;

  -- Logitech Wireless Mouse  (category: mice, brand: logitech)
  select id into v_prod from public.products where slug = 'logitech-wireless-mouse';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'mice'),
            (select id from public.brands where slug = 'logitech'),
            'Logitech Wireless Mouse',
            'logitech-wireless-mouse',
            'Silent-click wireless mouse with 2-year battery life. Comfortable and dependable.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'LOGITECH-3058-BLACK', '6451278758942', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOGITECH-3058-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 144.94, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 8, 0, 89.86, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/460719/pexels-photo-460719.jpeg?auto=compress&cs=tinysrgb&w=800', 'Logitech Wireless Mouse', 0, true);
  end if;

  -- Sony WH-1000XM5 Headphones  (category: headphones, brand: sony)
  select id into v_prod from public.products where slug = 'sony-wh-1000xm5-headphones';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'headphones'),
            (select id from public.brands where slug = 'sony'),
            'Sony WH-1000XM5 Headphones',
            'sony-wh-1000xm5-headphones',
            'Industry-leading noise cancellation and exceptional sound. The best wireless headphones money can buy.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'SONY-9799-BLACK', '2228313865651', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-9799-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3111.59, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 1929.19, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'SILVER', 'SONY-9799-SILVER', '9317850349007', '{"Colour":"SILVER"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-9799-SILVER'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3221.21, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 1997.15, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/193003/pexels-photo-193003.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sony WH-1000XM5 Headphones', 0, true);
  end if;

  -- JBL Tune 770NC Headphones  (category: headphones, brand: jbl)
  select id into v_prod from public.products where slug = 'jbl-tune-770nc-headphones';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'headphones'),
            (select id from public.brands where slug = 'jbl'),
            'JBL Tune 770NC Headphones',
            'jbl-tune-770nc-headphones',
            'Adaptive noise cancelling and JBL Pure Bass sound in a comfortable over-ear design.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'JBL-7982-BLACK', '9508633388195', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'JBL-7982-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 1226.65, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 760.52, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLUE', 'JBL-7982-BLUE', '8970437030951', '{"Colour":"BLUE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'JBL-7982-BLUE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 1180.84, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 732.12, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800', 'JBL Tune 770NC Headphones', 0, true);
  end if;

  -- JBL Wave Buds Earbuds  (category: earbuds, brand: jbl)
  select id into v_prod from public.products where slug = 'jbl-wave-buds-earbuds';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'earbuds'),
            (select id from public.brands where slug = 'jbl'),
            'JBL Wave Buds Earbuds',
            'jbl-wave-buds-earbuds',
            'True wireless earbuds with rich JBL sound and a compact charging case.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'JBL-5730-BLACK', '7556767700477', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'JBL-5730-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 361.89, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 8, 0, 224.37, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=800', 'JBL Wave Buds Earbuds', 0, true);
  end if;

  -- Sony WF-C510 Earbuds  (category: earbuds, brand: sony)
  select id into v_prod from public.products where slug = 'sony-wf-c510-earbuds';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'earbuds'),
            (select id from public.brands where slug = 'sony'),
            'Sony WF-C510 Earbuds',
            'sony-wf-c510-earbuds',
            'Lightweight true wireless earbuds with clear calls and long battery life.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'SONY-4163-BLACK', '5761234765657', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-4163-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 436.43, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 270.59, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sony WF-C510 Earbuds', 0, true);
  end if;

  -- JBL Flip 6 Bluetooth Speaker  (category: bluetooth-speakers, brand: jbl)
  select id into v_prod from public.products where slug = 'jbl-flip-6-bluetooth-speaker';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'bluetooth-speakers'),
            (select id from public.brands where slug = 'jbl'),
            'JBL Flip 6 Bluetooth Speaker',
            'jbl-flip-6-bluetooth-speaker',
            'Waterproof portable speaker with bold JBL sound and 12 hours of playtime.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'JBL-5625-BLACK', '6346551925558', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'JBL-5625-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 826.93, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 512.7, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLUE', 'JBL-5625-BLUE', '0725834913288', '{"Colour":"BLUE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'JBL-5625-BLUE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 780.71, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 484.04, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800', 'JBL Flip 6 Bluetooth Speaker', 0, true);
  end if;

  -- Sony SRS-XB100 Speaker  (category: bluetooth-speakers, brand: sony)
  select id into v_prod from public.products where slug = 'sony-srs-xb100-speaker';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'bluetooth-speakers'),
            (select id from public.brands where slug = 'sony'),
            'Sony SRS-XB100 Speaker',
            'sony-srs-xb100-speaker',
            'Pocket-sized speaker with extra bass and a handy carry strap. Great for the beach or yard.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'SONY-7381-BLACK', '4002998938538', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-7381-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 295.02, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 23, 0, 182.91, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1587305/pexels-photo-1587305.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sony SRS-XB100 Speaker', 0, true);
  end if;

  -- Sony HT-S40R Soundbar  (category: soundbars, brand: sony)
  select id into v_prod from public.products where slug = 'sony-ht-s40r-soundbar';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'soundbars'),
            (select id from public.brands where slug = 'sony'),
            'Sony HT-S40R Soundbar',
            'sony-ht-s40r-soundbar',
            '5.1-channel soundbar with wireless rear speakers for true cinema sound at home.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'SONY-1330-BLACK', '2033858890583', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-1330-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 2261.27, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 1763.45, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 1401.99, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2360568/pexels-photo-2360568.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sony HT-S40R Soundbar', 0, true);
  end if;

  -- Samsung 55-inch 4K Smart TV  (category: smart-tvs, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-55-inch-4k-smart-tv';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'smart-tvs'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung 55-inch 4K Smart TV',
            'samsung-55-inch-4k-smart-tv',
            '55-inch Crystal 4K Smart TV with vivid colours and voice control. Upgrade your living room.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '55IN', 'SAMSUNG-9639-55IN', '4195879190818', '{"Size":"55IN"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-9639-55IN'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 5820.39, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 15, 0, 3608.64, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1684079/pexels-photo-1684079.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung 55-inch 4K Smart TV', 0, true);
  end if;

  -- Sony Bravia 50-inch 4K Google TV  (category: smart-tvs, brand: sony)
  select id into v_prod from public.products where slug = 'sony-bravia-50-inch-4k-google-tv';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'smart-tvs'),
            (select id from public.brands where slug = 'sony'),
            'Sony Bravia 50-inch 4K Google TV',
            'sony-bravia-50-inch-4k-google-tv',
            'Bravia 4K HDR TV with Google TV — brilliant pictures and all your apps built in.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '50IN', 'SONY-5583-50IN', '9684457254189', '{"Size":"50IN"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-5583-50IN'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 6174.32, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 13, 0, 3828.08, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3483098/pexels-photo-3483098.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sony Bravia 50-inch 4K Google TV', 0, true);
  end if;

  -- Samsung 43-inch LED TV  (category: led-tvs, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-43-inch-led-tv';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'led-tvs'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung 43-inch LED TV',
            'samsung-43-inch-led-tv',
            'Full HD LED TV with slim bezels. Reliable value for bedrooms and small living spaces.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '43IN', 'SAMSUNG-2546-43IN', '2229542912857', '{"Size":"43IN"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-2546-43IN'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3078.34, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 8, 0, 1908.57, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/4012966/pexels-photo-4012966.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung 43-inch LED TV', 0, true);
  end if;

  -- Itel Smart TV Box  (category: tv-boxes, brand: itel)
  select id into v_prod from public.products where slug = 'itel-smart-tv-box';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'tv-boxes'),
            (select id from public.brands where slug = 'itel'),
            'Itel Smart TV Box',
            'itel-smart-tv-box',
            'Turn any screen into a smart TV with streaming apps, 4K support and Wi-Fi.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'ITEL-6082-BLACK', '2404337007165', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'ITEL-6082-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 338.59, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 6, 0, 209.93, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=800', 'Itel Smart TV Box', 0, true);
  end if;

  -- Samsung Freestyle Projector  (category: projectors, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-freestyle-projector';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'projectors'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung Freestyle Projector',
            'samsung-freestyle-projector',
            'Portable smart projector that turns any wall into a 100-inch screen. Take cinema anywhere.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'WHITE', 'SAMSUNG-6903-WHITE', '8893724177255', '{"Colour":"WHITE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-6903-WHITE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 4207.25, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 24, 0, 2608.49, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3316920/pexels-photo-3316920.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung Freestyle Projector', 0, true);
  end if;

  -- Sony Alpha A6100 Mirrorless Camera  (category: digital-cameras, brand: sony)
  select id into v_prod from public.products where slug = 'sony-alpha-a6100-mirrorless-camera';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'digital-cameras'),
            (select id from public.brands where slug = 'sony'),
            'Sony Alpha A6100 Mirrorless Camera',
            'sony-alpha-a6100-mirrorless-camera',
            'Compact mirrorless camera with fast autofocus and 4K video. Perfect for creators.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BODY', 'SONY-5519-BODY', '1270742474493', '{"Body Only":"BODY"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-5519-BODY'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 5149.96, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 3192.98, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '16-50MM', 'SONY-5519-16-50MM', '4402493366377', '{"Lens":"16-50MM"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-5519-16-50MM'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 5130.24, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 3180.75, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1544012/pexels-photo-1544012.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sony Alpha A6100 Mirrorless Camera', 0, true);
  end if;

  -- Sony ZV-1 Vlog Camera  (category: digital-cameras, brand: sony)
  select id into v_prod from public.products where slug = 'sony-zv-1-vlog-camera';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'digital-cameras'),
            (select id from public.brands where slug = 'sony'),
            'Sony ZV-1 Vlog Camera',
            'sony-zv-1-vlog-camera',
            'Pocket vlogging camera with flip screen and great audio. Made for content creators.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'SONY-8282-BLACK', '4673949818836', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-8282-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3655.23, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 10, 0, 2266.24, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2115217/pexels-photo-2115217.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sony ZV-1 Vlog Camera', 0, true);
  end if;

  -- Samsung EVO Select 128GB Memory Card  (category: memory-cards, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-evo-select-128gb-memory-card';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'memory-cards'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung EVO Select 128GB Memory Card',
            'samsung-evo-select-128gb-memory-card',
            'Fast U3 microSD card for photos, video and apps. 128GB of reliable storage.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '128GB', 'SAMSUNG-2831-128GB', '5130699799062', '{"Storage":"128GB"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-2831-128GB'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 182.83, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 11, 0, 113.35, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3862629/pexels-photo-3862629.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung EVO Select 128GB Memory Card', 0, true);
  end if;

  -- Sony PlayStation 5 Console  (category: gaming-consoles, brand: sony)
  select id into v_prod from public.products where slug = 'sony-playstation-5-console';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'gaming-consoles'),
            (select id from public.brands where slug = 'sony'),
            'Sony PlayStation 5 Console',
            'sony-playstation-5-console',
            'Next-gen PS5 with lightning-fast SSD and stunning games. The heart of any serious gaming setup.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'DISC', 'SONY-8627-DISC', '5000250504520', '{"Edition":"DISC"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-8627-DISC'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 5036.88, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 25, 0, 3122.87, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'DIGITAL', 'SONY-8627-DIGITAL', '2037565731382', '{"Edition":"DIGITAL"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-8627-DIGITAL'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 4619.31, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 25, 0, 2863.97, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1493619/pexels-photo-1493619.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sony PlayStation 5 Console', 0, true);
  end if;

  -- Sony DualSense Wireless Controller  (category: gaming-controllers, brand: sony)
  select id into v_prod from public.products where slug = 'sony-dualsense-wireless-controller';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'gaming-controllers'),
            (select id from public.brands where slug = 'sony'),
            'Sony DualSense Wireless Controller',
            'sony-dualsense-wireless-controller',
            'Immersive haptic feedback and adaptive triggers in the iconic DualSense.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'WHITE', 'SONY-5823-WHITE', '3837598513592', '{"Colour":"WHITE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-5823-WHITE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 743.64, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 19, 0, 461.06, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1870382/pexels-photo-1870382.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sony DualSense Wireless Controller', 0, true);
  end if;

  -- Samsung Odyssey Gaming Monitor  (category: gaming-accessories, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-odyssey-gaming-monitor';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'gaming-accessories'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung Odyssey Gaming Monitor',
            'samsung-odyssey-gaming-monitor',
            'Crisp gaming monitor with fast refresh and low latency for competitive play.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '27IN', 'SAMSUNG-9162-27IN', '7506655968908', '{"Size":"27IN"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-9162-27IN'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3437.14, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 2131.03, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung Odyssey Gaming Monitor', 0, true);
  end if;

  -- Samsung Galaxy Watch 6  (category: smartwatches, brand: samsung)
  select id into v_prod from public.products where slug = 'samsung-galaxy-watch-6';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'smartwatches'),
            (select id from public.brands where slug = 'samsung'),
            'Samsung Galaxy Watch 6',
            'samsung-galaxy-watch-6',
            'Advanced smartwatch with health tracking, GPS and a gorgeous AMOLED display.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '40MM', 'SAMSUNG-9029-40MM', '4789154748520', '{"Size":"40MM"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-9029-40MM'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 2519.84, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 13, 0, 1562.3, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '44MM', 'SAMSUNG-9029-44MM', '6678132872365', '{"Size":"44MM"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SAMSUNG-9029-44MM'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 2737.44, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 13, 0, 1697.21, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3935130/pexels-photo-3935130.jpeg?auto=compress&cs=tinysrgb&w=800', 'Samsung Galaxy Watch 6', 0, true);
  end if;

  -- TP-Link Tapo Smart Wi-Fi Plug  (category: smart-plugs, brand: tp-link)
  select id into v_prod from public.products where slug = 'tp-link-tapo-smart-wi-fi-plug';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'smart-plugs'),
            (select id from public.brands where slug = 'tp-link'),
            'TP-Link Tapo Smart Wi-Fi Plug',
            'tp-link-tapo-smart-wi-fi-plug',
            'Control appliances from your phone with voice control and scheduling. Set up in minutes.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'WHITE', 'TP-LINK-6580-WHITE', '8289249454191', '{"Colour":"WHITE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TP-LINK-6580-WHITE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 121.6, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 91.61, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 6, 0, 75.39, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1748905/pexels-photo-1748905.jpeg?auto=compress&cs=tinysrgb&w=800', 'TP-Link Tapo Smart Wi-Fi Plug', 0, true);
  end if;

  -- TP-Link 6-Outlet Extension Board  (category: extension-boards, brand: tp-link)
  select id into v_prod from public.products where slug = 'tp-link-6-outlet-extension-board';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'extension-boards'),
            (select id from public.brands where slug = 'tp-link'),
            'TP-Link 6-Outlet Extension Board',
            'tp-link-6-outlet-extension-board',
            'Six outlets with surge protection and a long power cord. Power your setup safely.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '4M', 'TP-LINK-1754-4M', '4328273320028', '{"Length":"4M"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TP-LINK-1754-4M'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 174.94, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 10, 0, 108.46, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1625978/pexels-photo-1625978.jpeg?auto=compress&cs=tinysrgb&w=800', 'TP-Link 6-Outlet Extension Board', 0, true);
  end if;

  -- Sony Cycle Energy AA Rechargeables (4-pack)  (category: rechargeable-batteries, brand: sony)
  select id into v_prod from public.products where slug = 'sony-cycle-energy-aa-rechargeables-4-pack';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'rechargeable-batteries'),
            (select id from public.brands where slug = 'sony'),
            'Sony Cycle Energy AA Rechargeables (4-pack)',
            'sony-cycle-energy-aa-rechargeables-4-pack',
            'Pre-charged rechargeable AA batteries that last for hundreds of charge cycles.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '4PACK', 'SONY-3725-4PACK', '1235904981967', '{"Pack":"4PACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'SONY-3725-4PACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 139.71, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 13, 0, 86.62, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3888574/pexels-photo-3888574.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sony Cycle Energy AA Rechargeables (4-pack)', 0, true);
  end if;

  -- TP-Link Archer AX55 Wi-Fi 6 Router  (category: wi-fi-routers, brand: tp-link)
  select id into v_prod from public.products where slug = 'tp-link-archer-ax55-wi-fi-6-router';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'wi-fi-routers'),
            (select id from public.brands where slug = 'tp-link'),
            'TP-Link Archer AX55 Wi-Fi 6 Router',
            'tp-link-archer-ax55-wi-fi-6-router',
            'Fast Wi-Fi 6 router with strong coverage for busy homes and streaming.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'TP-LINK-3680-BLACK', '8219496509856', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TP-LINK-3680-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 627.05, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 15, 0, 388.77, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1148820/pexels-photo-1148820.jpeg?auto=compress&cs=tinysrgb&w=800', 'TP-Link Archer AX55 Wi-Fi 6 Router', 0, true);
  end if;

  -- TP-Link RE330 Wi-Fi Extender  (category: wi-fi-extenders, brand: tp-link)
  select id into v_prod from public.products where slug = 'tp-link-re330-wi-fi-extender';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'wi-fi-extenders'),
            (select id from public.brands where slug = 'tp-link'),
            'TP-Link RE330 Wi-Fi Extender',
            'tp-link-re330-wi-fi-extender',
            'Eliminate dead zones with easy one-touch Wi-Fi extension.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'WHITE', 'TP-LINK-7617-WHITE', '6668863587492', '{"Colour":"WHITE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'TP-LINK-7617-WHITE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 260.78, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 8, 0, 161.68, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2119710/pexels-photo-2119710.jpeg?auto=compress&cs=tinysrgb&w=800', 'TP-Link RE330 Wi-Fi Extender', 0, true);
  end if;

  -- CeraVe Hydrating Facial Cleanser  (category: face-wash, brand: cerave)
  select id into v_prod from public.products where slug = 'cerave-hydrating-facial-cleanser';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'face-wash'),
            (select id from public.brands where slug = 'cerave'),
            'CeraVe Hydrating Facial Cleanser',
            'cerave-hydrating-facial-cleanser',
            'Dermatologist-developed cleanser with ceramides and hyaluronic acid. Gently cleanses without stripping.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '236ML', 'CERAVE-1685-236ML', '7927014140696', '{"Size":"236ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CERAVE-1685-236ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 176.38, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 127.86, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 20, 0, 109.36, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '473ML', 'CERAVE-1685-473ML', '7754097203228', '{"Size":"473ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CERAVE-1685-473ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 184.05, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 134.34, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 20, 0, 114.11, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3373735/pexels-photo-3373735.jpeg?auto=compress&cs=tinysrgb&w=800', 'CeraVe Hydrating Facial Cleanser', 0, true);
  end if;

  -- CeraVe Daily Moisturizing Lotion  (category: moisturizers, brand: cerave)
  select id into v_prod from public.products where slug = 'cerave-daily-moisturizing-lotion';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'moisturizers'),
            (select id from public.brands where slug = 'cerave'),
            'CeraVe Daily Moisturizing Lotion',
            'cerave-daily-moisturizing-lotion',
            'Lightweight, non-greasy lotion with ceramides. All-day hydration for face and body.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '236ML', 'CERAVE-1981-236ML', '1627337399103', '{"Size":"236ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CERAVE-1981-236ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 167.13, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 55, 0, 103.62, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '473ML', 'CERAVE-1981-473ML', '7200311894845', '{"Size":"473ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'CERAVE-1981-473ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 157.32, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 55, 0, 97.54, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2695846/pexels-photo-2695846.jpeg?auto=compress&cs=tinysrgb&w=800', 'CeraVe Daily Moisturizing Lotion', 0, true);
  end if;

  -- L'Oréal Paris Revitalift Filler Serum  (category: serums, brand: loreal-paris)
  select id into v_prod from public.products where slug = 'l-or-al-paris-revitalift-filler-serum';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'serums'),
            (select id from public.brands where slug = 'loreal-paris'),
            'L''Oréal Paris Revitalift Filler Serum',
            'l-or-al-paris-revitalift-filler-serum',
            'Anti-ageing serum with hyaluronic acid to visibly plump and firm skin.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '30ML', 'LOREAL-PARIS-5939-30ML', '1765443077710', '{"Size":"30ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-5939-30ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 289.91, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 59, 0, 179.74, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3997996/pexels-photo-3997996.jpeg?auto=compress&cs=tinysrgb&w=800', 'L''Oréal Paris Revitalift Filler Serum', 0, true);
  end if;

  -- Nivea Sun SPF 50 Sunscreen  (category: sunscreen, brand: nivea)
  select id into v_prod from public.products where slug = 'nivea-sun-spf-50-sunscreen';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'sunscreen'),
            (select id from public.brands where slug = 'nivea'),
            'Nivea Sun SPF 50 Sunscreen',
            'nivea-sun-spf-50-sunscreen',
            'High-protection SPF 50 sunscreen for strong sun. Essential daily protection in Ghana.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '50ML', 'NIVEA-3635-50ML', '5509149194106', '{"Size":"50ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIVEA-3635-50ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 87.57, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 48, 0, 54.29, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3999033/pexels-photo-3999033.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nivea Sun SPF 50 Sunscreen', 0, true);
  end if;

  -- Maybelline Clay Face Mask  (category: face-masks, brand: maybelline-new-york)
  select id into v_prod from public.products where slug = 'maybelline-clay-face-mask';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'face-masks'),
            (select id from public.brands where slug = 'maybelline-new-york'),
            'Maybelline Clay Face Mask',
            'maybelline-clay-face-mask',
            'Purifying clay mask that draws out impurities and leaves skin refreshed.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '75ML', 'MAYBELLINE-NEW-YORK-6812-75ML', '8894492292768', '{"Size":"75ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'MAYBELLINE-NEW-YORK-6812-75ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 58.19, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 18, 0, 36.08, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1021693/pexels-photo-1021693.jpeg?auto=compress&cs=tinysrgb&w=800', 'Maybelline Clay Face Mask', 0, true);
  end if;

  -- L'Oréal Paris Elvive Shampoo  (category: shampoos, brand: loreal-paris)
  select id into v_prod from public.products where slug = 'l-or-al-paris-elvive-shampoo';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'shampoos'),
            (select id from public.brands where slug = 'loreal-paris'),
            'L''Oréal Paris Elvive Shampoo',
            'l-or-al-paris-elvive-shampoo',
            'Nourishing shampoo for smooth, healthy-looking hair. For all hair types.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '400ML', 'LOREAL-PARIS-1660-400ML', '8911697853713', '{"Size":"400ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-1660-400ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 86.91, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 66.47, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 31, 0, 53.88, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1620777/pexels-photo-1620777.jpeg?auto=compress&cs=tinysrgb&w=800', 'L''Oréal Paris Elvive Shampoo', 0, true);
  end if;

  -- Dove Hair Therapy Conditioner  (category: conditioners, brand: dove)
  select id into v_prod from public.products where slug = 'dove-hair-therapy-conditioner';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'conditioners'),
            (select id from public.brands where slug = 'dove'),
            'Dove Hair Therapy Conditioner',
            'dove-hair-therapy-conditioner',
            'Deep-conditioning formula that repairs and strengthens damaged hair.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '350ML', 'DOVE-5300-350ML', '9094076633089', '{"Size":"350ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'DOVE-5300-350ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 91.08, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 22, 0, 56.47, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1670766/pexels-photo-1670766.jpeg?auto=compress&cs=tinysrgb&w=800', 'Dove Hair Therapy Conditioner', 0, true);
  end if;

  -- L'Oréal Paris Anti-Frizz Hair Cream  (category: hair-creams, brand: loreal-paris)
  select id into v_prod from public.products where slug = 'l-or-al-paris-anti-frizz-hair-cream';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'hair-creams'),
            (select id from public.brands where slug = 'loreal-paris'),
            'L''Oréal Paris Anti-Frizz Hair Cream',
            'l-or-al-paris-anti-frizz-hair-cream',
            'Tames frizz and adds shine in Ghana''s humid weather. Apply to damp hair and style.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '200ML', 'LOREAL-PARIS-6617-200ML', '8295224553742', '{"Size":"200ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-6617-200ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 97.24, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 37, 0, 60.29, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3992889/pexels-photo-3992889.jpeg?auto=compress&cs=tinysrgb&w=800', 'L''Oréal Paris Anti-Frizz Hair Cream', 0, true);
  end if;

  -- Dove Coconut Hair Oil  (category: hair-oils, brand: dove)
  select id into v_prod from public.products where slug = 'dove-coconut-hair-oil';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'hair-oils'),
            (select id from public.brands where slug = 'dove'),
            'Dove Coconut Hair Oil',
            'dove-coconut-hair-oil',
            'Lightweight coconut oil that nourishes and adds gloss without weighing hair down.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '150ML', 'DOVE-5859-150ML', '6348590490066', '{"Size":"150ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'DOVE-5859-150ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 71.66, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 51.63, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 59, 0, 44.43, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=800', 'Dove Coconut Hair Oil', 0, true);
  end if;

  -- L'Oréal Paris Excellence Hair Colour  (category: hair-colour, brand: loreal-paris)
  select id into v_prod from public.products where slug = 'l-or-al-paris-excellence-hair-colour';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'hair-colour'),
            (select id from public.brands where slug = 'loreal-paris'),
            'L''Oréal Paris Excellence Hair Colour',
            'l-or-al-paris-excellence-hair-colour',
            'Ammonia-free permanent colour with deep, long-lasting shade. Salon results at home.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '1N', 'LOREAL-PARIS-3590-1N', '2312209567375', '{"Colour":"1N"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-3590-1N'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 66.52, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 49.65, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 41.24, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '3N', 'LOREAL-PARIS-3590-3N', '2556242480868', '{"Colour":"3N"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-3590-3N'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 64.77, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 53.64, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 40.16, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '4N', 'LOREAL-PARIS-3590-4N', '8679196120940', '{"Colour":"4N"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-3590-4N'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 67.45, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 53.24, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 41.82, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '5N', 'LOREAL-PARIS-3590-5N', '4471033795090', '{"Colour":"5N"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-3590-5N'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 63.49, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 53.9, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 39.36, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1670766/pexels-photo-1670766.jpeg?auto=compress&cs=tinysrgb&w=800', 'L''Oréal Paris Excellence Hair Colour', 0, true);
  end if;

  -- Maybelline SuperStay Matte Lipstick  (category: lipstick, brand: maybelline-new-york)
  select id into v_prod from public.products where slug = 'maybelline-superstay-matte-lipstick';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'lipstick'),
            (select id from public.brands where slug = 'maybelline-new-york'),
            'Maybelline SuperStay Matte Lipstick',
            'maybelline-superstay-matte-lipstick',
            '24-hour matte lipstick that stays through food, drink and long days.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'RUBY', 'MAYBELLINE-NEW-YORK-5664-RUBY', '9107512046999', '{"Colour":"RUBY"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'MAYBELLINE-NEW-YORK-5664-RUBY'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 66.64, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 15, 0, 41.32, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'NUDES', 'MAYBELLINE-NEW-YORK-5664-NUDES', '2675182924895', '{"Colour":"NUDES"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'MAYBELLINE-NEW-YORK-5664-NUDES'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 67.1, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 15, 0, 41.6, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'CORAL', 'MAYBELLINE-NEW-YORK-5664-CORAL', '4723496182840', '{"Colour":"CORAL"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'MAYBELLINE-NEW-YORK-5664-CORAL'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 67.96, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 15, 0, 42.14, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1271620/pexels-photo-1271620.jpeg?auto=compress&cs=tinysrgb&w=800', 'Maybelline SuperStay Matte Lipstick', 0, true);
  end if;

  -- Maybelline Fit Me Matte Foundation  (category: foundation, brand: maybelline-new-york)
  select id into v_prod from public.products where slug = 'maybelline-fit-me-matte-foundation';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'foundation'),
            (select id from public.brands where slug = 'maybelline-new-york'),
            'Maybelline Fit Me Matte Foundation',
            'maybelline-fit-me-matte-foundation',
            'Natural matte foundation with broad shade range, including rich deep tones for Ghanaian skin.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '110', 'MAYBELLINE-NEW-YORK-3007-110', '7114699117932', '{"Colour":"110"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'MAYBELLINE-NEW-YORK-3007-110'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 99.92, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 44, 0, 61.95, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '220', 'MAYBELLINE-NEW-YORK-3007-220', '5887831208912', '{"Colour":"220"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'MAYBELLINE-NEW-YORK-3007-220'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 94.46, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 44, 0, 58.57, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '330', 'MAYBELLINE-NEW-YORK-3007-330', '2065651462070', '{"Colour":"330"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'MAYBELLINE-NEW-YORK-3007-330'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 96.89, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 44, 0, 60.07, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '360', 'MAYBELLINE-NEW-YORK-3007-360', '4333761645798', '{"Colour":"360"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'MAYBELLINE-NEW-YORK-3007-360'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 93.07, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 44, 0, 57.7, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2294353/pexels-photo-2294353.jpeg?auto=compress&cs=tinysrgb&w=800', 'Maybelline Fit Me Matte Foundation', 0, true);
  end if;

  -- Maybelline Lash Sensational Mascara  (category: mascara, brand: maybelline-new-york)
  select id into v_prod from public.products where slug = 'maybelline-lash-sensational-mascara';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'mascara'),
            (select id from public.brands where slug = 'maybelline-new-york'),
            'Maybelline Lash Sensational Mascara',
            'maybelline-lash-sensational-mascara',
            'Fan-effect mascara for dramatically volumised lashes. Smudge-resistant formula.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'MAYBELLINE-NEW-YORK-5100-BLACK', '4299604228996', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'MAYBELLINE-NEW-YORK-5100-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 79.26, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 60, 0, 49.14, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1957578/pexels-photo-1957578.jpeg?auto=compress&cs=tinysrgb&w=800', 'Maybelline Lash Sensational Mascara', 0, true);
  end if;

  -- Maybelline Nude Eyeshadow Palette  (category: eyeshadow, brand: maybelline-new-york)
  select id into v_prod from public.products where slug = 'maybelline-nude-eyeshadow-palette';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'eyeshadow'),
            (select id from public.brands where slug = 'maybelline-new-york'),
            'Maybelline Nude Eyeshadow Palette',
            'maybelline-nude-eyeshadow-palette',
            '12 nude shades from matte to shimmer. Build your perfect everyday eye look.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'NUDE', 'MAYBELLINE-NEW-YORK-8080-NUDE', '7123808042393', '{"Colour":"NUDE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'MAYBELLINE-NEW-YORK-8080-NUDE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 115.25, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 56, 0, 71.45, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2398241/pexels-photo-2398241.jpeg?auto=compress&cs=tinysrgb&w=800', 'Maybelline Nude Eyeshadow Palette', 0, true);
  end if;

  -- L'Oréal Paris Signature Eau de Parfum  (category: perfumes, brand: loreal-paris)
  select id into v_prod from public.products where slug = 'l-or-al-paris-signature-eau-de-parfum';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'perfumes'),
            (select id from public.brands where slug = 'loreal-paris'),
            'L''Oréal Paris Signature Eau de Parfum',
            'l-or-al-paris-signature-eau-de-parfum',
            'Long-lasting floral fragrance with warm base notes. A confident everyday signature.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '50ML', 'LOREAL-PARIS-3434-50ML', '9987391994785', '{"Size":"50ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-3434-50ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 426.89, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 16, 0, 264.67, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '100ML', 'LOREAL-PARIS-3434-100ML', '4797915847450', '{"Size":"100ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-3434-100ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 431.76, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 16, 0, 267.69, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/322207/pexels-photo-322207.jpeg?auto=compress&cs=tinysrgb&w=800', 'L''Oréal Paris Signature Eau de Parfum', 0, true);
  end if;

  -- L'Oréal Paris La Vie Est Belle  (category: womens-fragrance, brand: loreal-paris)
  select id into v_prod from public.products where slug = 'l-or-al-paris-la-vie-est-belle';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'womens-fragrance'),
            (select id from public.brands where slug = 'loreal-paris'),
            'L''Oréal Paris La Vie Est Belle',
            'l-or-al-paris-la-vie-est-belle',
            'Iris and gourmand masterpiece — the iconic French fragrance in a collector bottle.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '75ML', 'LOREAL-PARIS-4740-75ML', '3490906681231', '{"Size":"75ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-4740-75ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 385.44, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 18, 0, 238.97, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1961791/pexels-photo-1961791.jpeg?auto=compress&cs=tinysrgb&w=800', 'L''Oréal Paris La Vie Est Belle', 0, true);
  end if;

  -- L'Oréal Paris Men Expert Fragrance  (category: mens-fragrance, brand: loreal-paris)
  select id into v_prod from public.products where slug = 'l-or-al-paris-men-expert-fragrance';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'mens-fragrance'),
            (select id from public.brands where slug = 'loreal-paris'),
            'L''Oréal Paris Men Expert Fragrance',
            'l-or-al-paris-men-expert-fragrance',
            'Fresh, woody men''s fragrance with confident sillage for work and evenings.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '75ML', 'LOREAL-PARIS-1548-75ML', '2655190593856', '{"Size":"75ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-1548-75ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 273.27, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 47, 0, 169.43, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3945809/pexels-photo-3945809.jpeg?auto=compress&cs=tinysrgb&w=800', 'L''Oréal Paris Men Expert Fragrance', 0, true);
  end if;

  -- Dove Deep Moisture Body Wash  (category: body-wash, brand: dove)
  select id into v_prod from public.products where slug = 'dove-deep-moisture-body-wash';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'body-wash'),
            (select id from public.brands where slug = 'dove'),
            'Dove Deep Moisture Body Wash',
            'dove-deep-moisture-body-wash',
            'Creamy body wash that nourishes skin with 24-hour moisturising.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '500ML', 'DOVE-2228-500ML', '0373621394965', '{"Size":"500ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'DOVE-2228-500ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 77.03, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 50, 0, 47.76, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2878761/pexels-photo-2878761.jpeg?auto=compress&cs=tinysrgb&w=800', 'Dove Deep Moisture Body Wash', 0, true);
  end if;

  -- Vaseline Intensive Care Body Lotion  (category: body-lotions, brand: vaseline)
  select id into v_prod from public.products where slug = 'vaseline-intensive-care-body-lotion';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'body-lotions'),
            (select id from public.brands where slug = 'vaseline'),
            'Vaseline Intensive Care Body Lotion',
            'vaseline-intensive-care-body-lotion',
            'Fast-absorbing lotion that repairs dryness and protects with active botanicals.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '250ML', 'VASELINE-4181-250ML', '5261534336613', '{"Size":"250ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'VASELINE-4181-250ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 61.47, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 33, 0, 38.11, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2695846/pexels-photo-2695846.jpeg?auto=compress&cs=tinysrgb&w=800', 'Vaseline Intensive Care Body Lotion', 0, true);
  end if;

  -- Nivea Refreshing Bath Soap  (category: bath-soaps, brand: nivea)
  select id into v_prod from public.products where slug = 'nivea-refreshing-bath-soap';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'bath-soaps'),
            (select id from public.brands where slug = 'nivea'),
            'Nivea Refreshing Bath Soap',
            'nivea-refreshing-bath-soap',
            'Classic bar soap with a fresh, clean scent for everyday showering.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '3X75G', 'NIVEA-5734-3X75G', '1891261448552', '{"Pack":"3X75G"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIVEA-5734-3X75G'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 24.61, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 18.5, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 54, 0, 15.26, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3373735/pexels-photo-3373735.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nivea Refreshing Bath Soap', 0, true);
  end if;

  -- Nivea Men Shaving Foam  (category: shaving, brand: nivea)
  select id into v_prod from public.products where slug = 'nivea-men-shaving-foam';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'shaving'),
            (select id from public.brands where slug = 'nivea'),
            'Nivea Men Shaving Foam',
            'nivea-men-shaving-foam',
            'Rich protective foam for a smooth, comfortable shave without irritation.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '200ML', 'NIVEA-8839-200ML', '6092089167143', '{"Size":"200ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIVEA-8839-200ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 45.94, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 39, 0, 28.48, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3998376/pexels-photo-3998376.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nivea Men Shaving Foam', 0, true);
  end if;

  -- Nivea Men Beard & Face Wash  (category: beard-care, brand: nivea)
  select id into v_prod from public.products where slug = 'nivea-men-beard-face-wash';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'beard-care'),
            (select id from public.brands where slug = 'nivea'),
            'Nivea Men Beard & Face Wash',
            'nivea-men-beard-face-wash',
            'Daily wash that cleans skin and softens beard for a well-groomed look.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '150ML', 'NIVEA-2977-150ML', '2867886373776', '{"Size":"150ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIVEA-2977-150ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 54.78, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 30, 0, 33.96, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1843668/pexels-photo-1843668.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nivea Men Beard & Face Wash', 0, true);
  end if;

  -- L'Oréal Paris Steampod Hair Straightener  (category: hair-straighteners, brand: loreal-paris)
  select id into v_prod from public.products where slug = 'l-or-al-paris-steampod-hair-straightener';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'hair-straighteners'),
            (select id from public.brands where slug = 'loreal-paris'),
            'L''Oréal Paris Steampod Hair Straightener',
            'l-or-al-paris-steampod-hair-straightener',
            'Professional steam straightener that smooths hair while protecting its health.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'LOREAL-PARIS-6841-BLACK', '7103988540698', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'LOREAL-PARIS-6841-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 452.96, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 24, 0, 280.84, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/3440698/pexels-photo-3440698.jpeg?auto=compress&cs=tinysrgb&w=800', 'L''Oréal Paris Steampod Hair Straightener', 0, true);
  end if;

  -- Nivea Men Roll-On Deodorant  (category: personal-care-deodorants, brand: nivea)
  select id into v_prod from public.products where slug = 'nivea-men-roll-on-deodorant';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'personal-care-deodorants'),
            (select id from public.brands where slug = 'nivea'),
            'Nivea Men Roll-On Deodorant',
            'nivea-men-roll-on-deodorant',
            '48-hour protection with a fresh, masculine scent. Non-sticky and alcohol-free.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '50ML', 'NIVEA-5837-50ML', '7298911644182', '{"Size":"50ML"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NIVEA-5837-50ML'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 39.98, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 26, 0, 24.79, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1961791/pexels-photo-1961791.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nivea Men Roll-On Deodorant', 0, true);
  end if;

  -- Russell Hobbs 4-Slice Toaster  (category: kitchen-appliances, brand: russell-hobbs)
  select id into v_prod from public.products where slug = 'russell-hobbs-4-slice-toaster';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'kitchen-appliances'),
            (select id from public.brands where slug = 'russell-hobbs'),
            'Russell Hobbs 4-Slice Toaster',
            'russell-hobbs-4-slice-toaster',
            'Wide-slot 4-slice toaster with variable browning. Family-sized breakfasts in minutes.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'RUSSELL-HOBBS-1417-BLACK', '6412836312440', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RUSSELL-HOBBS-1417-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 493.73, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 6, 0, 306.11, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1422186/pexels-photo-1422186.jpeg?auto=compress&cs=tinysrgb&w=800', 'Russell Hobbs 4-Slice Toaster', 0, true);
  end if;

  -- Kenwood Chef Stand Mixer  (category: kitchen-appliances, brand: kenwood)
  select id into v_prod from public.products where slug = 'kenwood-chef-stand-mixer';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'kitchen-appliances'),
            (select id from public.brands where slug = 'kenwood'),
            'Kenwood Chef Stand Mixer',
            'kenwood-chef-stand-mixer',
            'Powerful stand mixer with multiple attachments. The baker''s best friend.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'WHITE', 'KENWOOD-7009-WHITE', '3997391903010', '{"Colour":"WHITE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'KENWOOD-7009-WHITE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 2161.69, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 14, 0, 1340.25, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1461448/pexels-photo-1461448.jpeg?auto=compress&cs=tinysrgb&w=800', 'Kenwood Chef Stand Mixer', 0, true);
  end if;

  -- Kenwood Stainless Cookware Set  (category: cookware, brand: kenwood)
  select id into v_prod from public.products where slug = 'kenwood-stainless-cookware-set';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'cookware'),
            (select id from public.brands where slug = 'kenwood'),
            'Kenwood Stainless Cookware Set',
            'kenwood-stainless-cookware-set',
            '7-piece stainless cookware set with lids. Even heating, easy cleaning, built to last.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '7PC', 'KENWOOD-6755-7PC', '0661077336098', '{"Size":"7PC"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'KENWOOD-6755-7PC'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 470.05, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 15, 0, 291.43, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1560630/pexels-photo-1560630.jpeg?auto=compress&cs=tinysrgb&w=800', 'Kenwood Stainless Cookware Set', 0, true);
  end if;

  -- Russell Hobbs Dinnerware Set  (category: dinnerware, brand: russell-hobbs)
  select id into v_prod from public.products where slug = 'russell-hobbs-dinnerware-set';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'dinnerware'),
            (select id from public.brands where slug = 'russell-hobbs'),
            'Russell Hobbs Dinnerware Set',
            'russell-hobbs-dinnerware-set',
            '16-piece stoneware dinner set for four. Modern design that elevates every meal.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'WHITE', 'RUSSELL-HOBBS-9202-WHITE', '4040582125643', '{"Colour":"WHITE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'RUSSELL-HOBBS-9202-WHITE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 228.7, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 170.02, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 11, 0, 141.79, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1137570/pexels-photo-1137570.jpeg?auto=compress&cs=tinysrgb&w=800', 'Russell Hobbs Dinnerware Set', 0, true);
  end if;

  -- Nasco Glass Drinkware Set  (category: drinkware, brand: nasco)
  select id into v_prod from public.products where slug = 'nasco-glass-drinkware-set';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'drinkware'),
            (select id from public.brands where slug = 'nasco'),
            'Nasco Glass Drinkware Set',
            'nasco-glass-drinkware-set',
            '6-piece tempered glass tumbler set. Clear, sturdy and dishwasher-safe.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '6PC', 'NASCO-2420-6PC', '4653979494378', '{"Size":"6PC"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-2420-6PC'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 90.4, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 11, 0, 56.05, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1139556/pexels-photo-1139556.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nasco Glass Drinkware Set', 0, true);
  end if;

  -- Nasco Food Storage Container Set  (category: food-storage, brand: nasco)
  select id into v_prod from public.products where slug = 'nasco-food-storage-container-set';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'food-storage'),
            (select id from public.brands where slug = 'nasco'),
            'Nasco Food Storage Container Set',
            'nasco-food-storage-container-set',
            'Stackable airtight containers in assorted sizes. Keep food fresh and your kitchen tidy.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '12PC', 'NASCO-9131-12PC', '3501065664352', '{"Size":"12PC"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-9131-12PC'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 106.14, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 12, 0, 65.81, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1692549/pexels-photo-1692549.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nasco Food Storage Container Set', 0, true);
  end if;

  -- Binatone 420L Refrigerator  (category: refrigerators, brand: binatone)
  select id into v_prod from public.products where slug = 'binatone-420l-refrigerator';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'refrigerators'),
            (select id from public.brands where slug = 'binatone'),
            'Binatone 420L Refrigerator',
            'binatone-420l-refrigerator',
            'Large 420L double-door fridge with efficient cooling and quiet operation.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'SILVER', 'BINATONE-7115-SILVER', '2087012579005', '{"Colour":"SILVER"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'BINATONE-7115-SILVER'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 5449.56, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 12, 0, 3378.73, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1662296/pexels-photo-1662296.jpeg?auto=compress&cs=tinysrgb&w=800', 'Binatone 420L Refrigerator', 0, true);
  end if;

  -- Binatone 8kg Washing Machine  (category: washing-machines, brand: binatone)
  select id into v_prod from public.products where slug = 'binatone-8kg-washing-machine';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'washing-machines'),
            (select id from public.brands where slug = 'binatone'),
            'Binatone 8kg Washing Machine',
            'binatone-8kg-washing-machine',
            '8kg front-loader with multiple programmes. Clean clothes, less effort.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'WHITE', 'BINATONE-3163-WHITE', '6486098574427', '{"Colour":"WHITE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'BINATONE-3163-WHITE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3684.72, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 17, 0, 2284.53, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2102585/pexels-photo-2102585.jpeg?auto=compress&cs=tinysrgb&w=800', 'Binatone 8kg Washing Machine', 0, true);
  end if;

  -- Binatone 25L Microwave  (category: microwaves, brand: binatone)
  select id into v_prod from public.products where slug = 'binatone-25l-microwave';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'microwaves'),
            (select id from public.brands where slug = 'binatone'),
            'Binatone 25L Microwave',
            'binatone-25l-microwave',
            '25L microwave with grill function and easy digital controls.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'BINATONE-8485-BLACK', '5319131292761', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'BINATONE-8485-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 1198.08, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 5, 0, 742.81, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1846165/pexels-photo-1846165.jpeg?auto=compress&cs=tinysrgb&w=800', 'Binatone 25L Microwave', 0, true);
  end if;

  -- Kenwood 1.7L Electric Kettle  (category: electric-kettles, brand: kenwood)
  select id into v_prod from public.products where slug = 'kenwood-1-7l-electric-kettle';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'electric-kettles'),
            (select id from public.brands where slug = 'kenwood'),
            'Kenwood 1.7L Electric Kettle',
            'kenwood-1-7l-electric-kettle',
            'Fast-boil 1.7L kettle with auto shut-off and a cool-touch handle.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'KENWOOD-3822-BLACK', '2611058532818', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'KENWOOD-3822-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 296.91, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 6, 0, 184.08, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=800', 'Kenwood 1.7L Electric Kettle', 0, true);
  end if;

  -- Nasco 18-inch Pedestal Fan  (category: fans, brand: nasco)
  select id into v_prod from public.products where slug = 'nasco-18-inch-pedestal-fan';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'fans'),
            (select id from public.brands where slug = 'nasco'),
            'Nasco 18-inch Pedestal Fan',
            'nasco-18-inch-pedestal-fan',
            'Powerful pedestal fan with 3 speeds and oscillation. Beat the Accra heat.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLACK', 'NASCO-1392-BLACK', '1050219220088', '{"Colour":"BLACK"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-1392-BLACK'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 327.09, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 259.51, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 8, 0, 202.8, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1743227/pexels-photo-1743227.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nasco 18-inch Pedestal Fan', 0, true);
  end if;

  -- Binatone Steam Iron  (category: irons, brand: binatone)
  select id into v_prod from public.products where slug = 'binatone-steam-iron';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'irons'),
            (select id from public.brands where slug = 'binatone'),
            'Binatone Steam Iron',
            'binatone-steam-iron',
            'Powerful steam iron with non-stick soleplate and anti-drip. Crisp clothes in one pass.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLUE', 'BINATONE-4535-BLUE', '7129657007453', '{"Colour":"BLUE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'BINATONE-4535-BLUE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 173.67, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 4, 0, 107.68, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1918291/pexels-photo-1918291.jpeg?auto=compress&cs=tinysrgb&w=800', 'Binatone Steam Iron', 0, true);
  end if;

  -- Binatone 1.5HP Air Conditioner  (category: air-conditioners, brand: binatone)
  select id into v_prod from public.products where slug = 'binatone-1-5hp-air-conditioner';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'air-conditioners'),
            (select id from public.brands where slug = 'binatone'),
            'Binatone 1.5HP Air Conditioner',
            'binatone-1-5hp-air-conditioner',
            '1.5HP split AC with rapid cooling and energy-saving mode. Keep cool all year round.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '1.5HP', 'BINATONE-6036-1-5HP', '5591434753143', '{"Capacity":"1.5HP"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'BINATONE-6036-1-5HP'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3879.73, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 21, 0, 2405.43, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1094632/pexels-photo-1094632.jpeg?auto=compress&cs=tinysrgb&w=800', 'Binatone 1.5HP Air Conditioner', 0, true);
  end if;

  -- Nasco 3-Seater Fabric Sofa  (category: sofas, brand: nasco)
  select id into v_prod from public.products where slug = 'nasco-3-seater-fabric-sofa';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'sofas'),
            (select id from public.brands where slug = 'nasco'),
            'Nasco 3-Seater Fabric Sofa',
            'nasco-3-seater-fabric-sofa',
            'Comfortable 3-seater fabric sofa with sturdy frame. The heart of your living room.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'GREY', 'NASCO-2878-GREY', '8390613315410', '{"Colour":"GREY"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-2878-GREY'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3947.5, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 2944.44, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 10, 0, 2447.45, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BLUE', 'NASCO-2878-BLUE', '9625631285452', '{"Colour":"BLUE"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-2878-BLUE'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 3975.38, v_owner);
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'sale', 2809.66, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 10, 0, 2464.74, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1048283/pexels-photo-1048283.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nasco 3-Seater Fabric Sofa', 0, true);
  end if;

  -- Nasco 6-Seater Dining Table Set  (category: tables, brand: nasco)
  select id into v_prod from public.products where slug = 'nasco-6-seater-dining-table-set';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'tables'),
            (select id from public.brands where slug = 'nasco'),
            'Nasco 6-Seater Dining Table Set',
            'nasco-6-seater-dining-table-set',
            'Solid dining table with 6 chairs. Perfect for family meals and entertaining.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '6SEAT', 'NASCO-5218-6SEAT', '0059526873537', '{"Colour":"6SEAT"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-5218-6SEAT'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 2542.62, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 8, 0, 1576.42, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nasco 6-Seater Dining Table Set', 0, true);
  end if;

  -- Nasco Wardrobe Storage Cabinet  (category: storage, brand: nasco)
  select id into v_prod from public.products where slug = 'nasco-wardrobe-storage-cabinet';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'storage'),
            (select id from public.brands where slug = 'nasco'),
            'Nasco Wardrobe Storage Cabinet',
            'nasco-wardrobe-storage-cabinet',
            'Spacious wardrobe with hanging rail and shelves. Organise your home in style.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'BROWN', 'NASCO-1008-BROWN', '0536027393721', '{"Colour":"BROWN"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-1008-BROWN'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 1585.47, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 23, 0, 982.99, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1571453/pexels-photo-1571453.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nasco Wardrobe Storage Cabinet', 0, true);
  end if;

  -- Nasco Scented Candle Set  (category: home-decor, brand: nasco)
  select id into v_prod from public.products where slug = 'nasco-scented-candle-set';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'home-decor'),
            (select id from public.brands where slug = 'nasco'),
            'Nasco Scented Candle Set',
            'nasco-scented-candle-set',
            'Set of 3 long-burning scented candles. Add warmth and fragrance to any room.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'VANILLA', 'NASCO-9658-VANILLA', '3248282389339', '{"Colour":"VANILLA"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-9658-VANILLA'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 124.58, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 15, 0, 77.24, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1570807/pexels-photo-1570807.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nasco Scented Candle Set', 0, true);
  end if;

  -- Nasco Multipurpose Cleaning Set  (category: cleaning-supplies, brand: nasco)
  select id into v_prod from public.products where slug = 'nasco-multipurpose-cleaning-set';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'cleaning-supplies'),
            (select id from public.brands where slug = 'nasco'),
            'Nasco Multipurpose Cleaning Set',
            'nasco-multipurpose-cleaning-set',
            'Broom, dustpan and mop set for easy everyday cleaning.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, 'SET', 'NASCO-1763-SET', '0765958692454', '{"Set":"SET"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-1763-SET'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 88.69, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 6, 0, 54.99, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/2793827/pexels-photo-2793827.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nasco Multipurpose Cleaning Set', 0, true);
  end if;

  -- Nasco Laundry Basket Set  (category: laundry, brand: nasco)
  select id into v_prod from public.products where slug = 'nasco-laundry-basket-set';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'laundry'),
            (select id from public.brands where slug = 'nasco'),
            'Nasco Laundry Basket Set',
            'nasco-laundry-basket-set',
            'Two sturdy laundry baskets with comfortable handles. Tidy laundry, tidy home.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '2PC', 'NASCO-8967-2PC', '8936856381784', '{"Size":"2PC"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-8967-2PC'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 61.05, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 19, 0, 37.85, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/4089460/pexels-photo-4089460.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nasco Laundry Basket Set', 0, true);
  end if;

  -- Nasco Storage Containers (assorted)  (category: storage-containers, brand: nasco)
  select id into v_prod from public.products where slug = 'nasco-storage-containers-assorted';
  if v_prod is null then
    insert into public.products (category_id, brand_id, name, slug, description, status)
    values ((select id from public.categories where slug = 'storage-containers'),
            (select id from public.brands where slug = 'nasco'),
            'Nasco Storage Containers (assorted)',
            'nasco-storage-containers-assorted',
            'Airtight storage containers for grains, rice and staples. Keep your pantry organised.',
            'active')
    returning id into v_prod;
  end if;
  insert into public.product_variants (product_id, name, sku, barcode, options, status)
  values (v_prod, '8PC', 'NASCO-6810-8PC', '4520828602485', '{"Size":"8PC"}'::jsonb, 'active')
  on conflict (sku) do nothing
  returning id into v_var;
  if v_var is null then select id into v_var from public.product_variants where sku = 'NASCO-6810-8PC'; end if;
  insert into public.prices (variant_id, price_type, amount, created_by)
  values (v_var, 'selling', 75.71, v_owner);
  insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)
  values (v_loc, v_var, 12, 0, 46.94, 6, 12)
  on conflict (location_id, variant_id) do nothing;
  if not exists (select 1 from public.product_images where product_id = v_prod and variant_id is null) then
    insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
    values (v_prod, 'https://images.pexels.com/photos/1692549/pexels-photo-1692549.jpeg?auto=compress&cs=tinysrgb&w=800', 'Nasco Storage Containers (assorted)', 0, true);
  end if;

  raise notice 'Stage 13b complete: catalogue seeded.';
end;
$$;
