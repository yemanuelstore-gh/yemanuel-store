-- Stage 12c: repair seed of the Yemanuel Store category tree.
--
-- Stages 12 and 12b never landed because app.seed_category() resolved the
-- parent via "parent.slug is not distinct from p_parent_slug". With slug
-- NOT NULL, root categories (parent null) matched zero rows, so nothing was
-- inserted. This migration uses the corrected helper (root parent resolves
-- to NULL directly) and re-runs the same 279 inserts. Every insert uses
-- "on conflict (slug) do nothing", so it converges to exactly the same
-- 279 categories whether the table is empty or already seeded.
-- The temporary helper is dropped again at the end of the migration.

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
-- 1. FASHION
-- =====================================================================

select app.seed_category('Fashion', 'fashion', null, 10);

select app.seed_category('Men''s Fashion', 'mens-fashion', 'fashion', 10);
select app.seed_category('T-Shirts & Polos', 't-shirts-polos', 'mens-fashion', 10);
select app.seed_category('Shirts', 'shirts', 'mens-fashion', 20);
select app.seed_category('Trousers & Chinos', 'trousers-chinos', 'mens-fashion', 30);
select app.seed_category('Jeans', 'jeans', 'mens-fashion', 40);
select app.seed_category('Shorts', 'shorts', 'mens-fashion', 50);
select app.seed_category('Suits & Blazers', 'mens-suits-blazers', 'mens-fashion', 60);
select app.seed_category('Jackets & Coats', 'mens-jackets-coats', 'mens-fashion', 70);
select app.seed_category('Underwear', 'underwear', 'mens-fashion', 80);
select app.seed_category('Sleepwear', 'mens-sleepwear', 'mens-fashion', 90);
select app.seed_category('Sportswear', 'mens-sportswear', 'mens-fashion', 100);
select app.seed_category('Traditional Wear', 'mens-traditional-wear', 'mens-fashion', 110);
select app.seed_category('Shoes', 'mens-fashion-shoes', 'mens-fashion', 120);
select app.seed_category('Sandals & Slippers', 'mens-fashion-sandals-slippers', 'mens-fashion', 130);
select app.seed_category('Bags', 'mens-fashion-bags', 'mens-fashion', 140);
select app.seed_category('Belts', 'mens-fashion-belts', 'mens-fashion', 150);
select app.seed_category('Wallets', 'mens-fashion-wallets', 'mens-fashion', 160);
select app.seed_category('Watches', 'mens-fashion-watches', 'mens-fashion', 170);
select app.seed_category('Sunglasses', 'mens-fashion-sunglasses', 'mens-fashion', 180);
select app.seed_category('Hats & Caps', 'mens-fashion-hats-caps', 'mens-fashion', 190);
select app.seed_category('Men''s Accessories', 'mens-accessories', 'mens-fashion', 200);

select app.seed_category('Women''s Fashion', 'womens-fashion', 'fashion', 20);
select app.seed_category('Dresses', 'dresses', 'womens-fashion', 10);
select app.seed_category('Tops & Blouses', 'tops-blouses', 'womens-fashion', 20);
select app.seed_category('T-Shirts', 't-shirts', 'womens-fashion', 30);
select app.seed_category('Skirts', 'skirts', 'womens-fashion', 40);
select app.seed_category('Trousers', 'trousers', 'womens-fashion', 50);
select app.seed_category('Jeans', 'womens-fashion-jeans', 'womens-fashion', 60);
select app.seed_category('Shorts', 'womens-fashion-shorts', 'womens-fashion', 70);
select app.seed_category('Jumpsuits', 'jumpsuits', 'womens-fashion', 80);
select app.seed_category('Suits & Blazers', 'womens-suits-blazers', 'womens-fashion', 90);
select app.seed_category('Jackets & Coats', 'womens-jackets-coats', 'womens-fashion', 100);
select app.seed_category('Underwear & Lingerie', 'underwear-lingerie', 'womens-fashion', 110);
select app.seed_category('Sleepwear', 'womens-sleepwear', 'womens-fashion', 120);
select app.seed_category('Sportswear', 'womens-sportswear', 'womens-fashion', 130);
select app.seed_category('Traditional Wear', 'womens-traditional-wear', 'womens-fashion', 140);
select app.seed_category('Shoes', 'womens-fashion-shoes', 'womens-fashion', 150);
select app.seed_category('Sandals & Slippers', 'womens-fashion-sandals-slippers', 'womens-fashion', 160);
select app.seed_category('Handbags', 'handbags', 'womens-fashion', 170);
select app.seed_category('Backpacks', 'backpacks', 'womens-fashion', 180);
select app.seed_category('Wallets & Purses', 'wallets-purses', 'womens-fashion', 190);
select app.seed_category('Belts', 'womens-fashion-belts', 'womens-fashion', 200);
select app.seed_category('Watches', 'womens-fashion-watches', 'womens-fashion', 210);
select app.seed_category('Sunglasses', 'womens-fashion-sunglasses', 'womens-fashion', 220);
select app.seed_category('Hats & Caps', 'womens-fashion-hats-caps', 'womens-fashion', 230);
select app.seed_category('Women''s Accessories', 'womens-accessories', 'womens-fashion', 240);

select app.seed_category('Kids'' Fashion', 'kids-fashion', 'fashion', 30);
select app.seed_category('Boys'' Clothing', 'boys-clothing', 'kids-fashion', 10);
select app.seed_category('Girls'' Clothing', 'girls-clothing', 'kids-fashion', 20);
select app.seed_category('Baby Clothing', 'baby-clothing', 'kids-fashion', 30);
select app.seed_category('School Wear', 'school-wear', 'kids-fashion', 40);
select app.seed_category('Children''s Shoes', 'childrens-shoes', 'kids-fashion', 50);
select app.seed_category('Sandals & Slippers', 'kids-fashion-sandals-slippers', 'kids-fashion', 60);
select app.seed_category('Baby Shoes', 'baby-shoes', 'kids-fashion', 70);
select app.seed_category('Children''s Bags', 'childrens-bags', 'kids-fashion', 80);
select app.seed_category('Children''s Accessories', 'childrens-accessories', 'kids-fashion', 90);

select app.seed_category('Footwear', 'footwear', 'fashion', 40);
select app.seed_category('Men''s Shoes', 'mens-shoes', 'footwear', 10);
select app.seed_category('Women''s Shoes', 'womens-shoes', 'footwear', 20);
select app.seed_category('Children''s Shoes', 'footwear-childrens-shoes', 'footwear', 30);
select app.seed_category('Sneakers', 'sneakers', 'footwear', 40);
select app.seed_category('Formal Shoes', 'formal-shoes', 'footwear', 50);
select app.seed_category('Boots', 'boots', 'footwear', 60);
select app.seed_category('Sandals', 'sandals', 'footwear', 70);
select app.seed_category('Slippers', 'slippers', 'footwear', 80);
select app.seed_category('Sports Shoes', 'sports-shoes', 'footwear', 90);

select app.seed_category('Fashion Accessories', 'fashion-accessories', 'fashion', 50);
select app.seed_category('Watches', 'fashion-accessories-watches', 'fashion-accessories', 10);
select app.seed_category('Sunglasses', 'fashion-accessories-sunglasses', 'fashion-accessories', 20);
select app.seed_category('Jewelry', 'jewelry', 'fashion-accessories', 30);
select app.seed_category('Bags', 'fashion-accessories-bags', 'fashion-accessories', 40);
select app.seed_category('Wallets', 'fashion-accessories-wallets', 'fashion-accessories', 50);
select app.seed_category('Belts', 'fashion-accessories-belts', 'fashion-accessories', 60);
select app.seed_category('Caps & Hats', 'caps-hats', 'fashion-accessories', 70);
select app.seed_category('Scarves', 'scarves', 'fashion-accessories', 80);
select app.seed_category('Hair Accessories', 'fashion-accessories-hair-accessories', 'fashion-accessories', 90);
select app.seed_category('Travel Accessories', 'travel-accessories', 'fashion-accessories', 100);

-- =====================================================================
-- 2. ELECTRONICS
-- =====================================================================

select app.seed_category('Electronics', 'electronics', null, 20);

select app.seed_category('Mobile Phones', 'mobile-phones', 'electronics', 10);
select app.seed_category('Smartphones', 'smartphones', 'mobile-phones', 10);
select app.seed_category('Feature Phones', 'feature-phones', 'mobile-phones', 20);
select app.seed_category('Refurbished Phones', 'refurbished-phones', 'mobile-phones', 30);
select app.seed_category('Phone Cases', 'phone-cases', 'mobile-phones', 40);
select app.seed_category('Screen Protectors', 'screen-protectors', 'mobile-phones', 50);

select app.seed_category('Tablets', 'tablets', 'electronics', 20);
select app.seed_category('Android Tablets', 'android-tablets', 'tablets', 10);
select app.seed_category('iPads', 'ipads', 'tablets', 20);
select app.seed_category('Tablet Cases', 'tablet-cases', 'tablets', 30);
select app.seed_category('Tablet Accessories', 'tablet-accessories', 'tablets', 40);

select app.seed_category('Computers', 'computers', 'electronics', 30);
select app.seed_category('Laptops', 'laptops', 'computers', 10);
select app.seed_category('Desktop Computers', 'desktop-computers', 'computers', 20);
select app.seed_category('Monitors', 'monitors', 'computers', 30);
select app.seed_category('Keyboards', 'keyboards', 'computers', 40);
select app.seed_category('Mice', 'mice', 'computers', 50);
select app.seed_category('Webcams', 'webcams', 'computers', 60);
select app.seed_category('Laptop Bags', 'laptop-bags', 'computers', 70);
select app.seed_category('Laptop Stands', 'laptop-stands', 'computers', 80);
select app.seed_category('Computer Accessories', 'computer-accessories', 'computers', 90);

select app.seed_category('Mobile Accessories', 'mobile-accessories', 'electronics', 40);
select app.seed_category('Chargers', 'chargers', 'mobile-accessories', 10);
select app.seed_category('Fast Chargers', 'fast-chargers', 'mobile-accessories', 20);
select app.seed_category('USB Cables', 'usb-cables', 'mobile-accessories', 30);
select app.seed_category('Power Banks', 'power-banks', 'mobile-accessories', 40);
select app.seed_category('Wireless Chargers', 'wireless-chargers', 'mobile-accessories', 50);
select app.seed_category('Phone Holders', 'phone-holders', 'mobile-accessories', 60);
select app.seed_category('Car Chargers', 'car-chargers', 'mobile-accessories', 70);
select app.seed_category('Bluetooth Adapters', 'bluetooth-adapters', 'mobile-accessories', 80);

select app.seed_category('Audio', 'audio', 'electronics', 50);
select app.seed_category('Headphones', 'headphones', 'audio', 10);
select app.seed_category('Earbuds', 'earbuds', 'audio', 20);
select app.seed_category('Bluetooth Speakers', 'bluetooth-speakers', 'audio', 30);
select app.seed_category('Soundbars', 'soundbars', 'audio', 40);
select app.seed_category('Home Audio', 'home-audio', 'audio', 50);
select app.seed_category('Microphones', 'microphones', 'audio', 60);
select app.seed_category('Audio Cables', 'audio-cables', 'audio', 70);

select app.seed_category('TVs & Entertainment', 'tvs-entertainment', 'electronics', 60);
select app.seed_category('Smart TVs', 'smart-tvs', 'tvs-entertainment', 10);
select app.seed_category('LED TVs', 'led-tvs', 'tvs-entertainment', 20);
select app.seed_category('TV Accessories', 'tv-accessories', 'tvs-entertainment', 30);
select app.seed_category('Streaming Devices', 'streaming-devices', 'tvs-entertainment', 40);
select app.seed_category('TV Boxes', 'tv-boxes', 'tvs-entertainment', 50);
select app.seed_category('Projectors', 'projectors', 'tvs-entertainment', 60);
select app.seed_category('Remote Controls', 'remote-controls', 'tvs-entertainment', 70);

select app.seed_category('Cameras & Photography', 'cameras-photography', 'electronics', 70);
select app.seed_category('Digital Cameras', 'digital-cameras', 'cameras-photography', 10);
select app.seed_category('Security Cameras', 'security-cameras', 'cameras-photography', 20);
select app.seed_category('CCTV Systems', 'cctv-systems', 'cameras-photography', 30);
select app.seed_category('Camera Lenses', 'camera-lenses', 'cameras-photography', 40);
select app.seed_category('Tripods', 'tripods', 'cameras-photography', 50);
select app.seed_category('Camera Accessories', 'camera-accessories', 'cameras-photography', 60);
select app.seed_category('Memory Cards', 'memory-cards', 'cameras-photography', 70);

select app.seed_category('Gaming', 'gaming', 'electronics', 80);
select app.seed_category('Gaming Consoles', 'gaming-consoles', 'gaming', 10);
select app.seed_category('PlayStation', 'playstation', 'gaming', 20);
select app.seed_category('Xbox', 'xbox', 'gaming', 30);
select app.seed_category('Nintendo', 'nintendo', 'gaming', 40);
select app.seed_category('Gaming Controllers', 'gaming-controllers', 'gaming', 50);
select app.seed_category('Gaming Headsets', 'gaming-headsets', 'gaming', 60);
select app.seed_category('Gaming Accessories', 'gaming-accessories', 'gaming', 70);
select app.seed_category('Gaming Chairs', 'gaming-chairs', 'gaming', 80);

select app.seed_category('Smart Devices', 'smart-devices', 'electronics', 90);
select app.seed_category('Smartwatches', 'smartwatches', 'smart-devices', 10);
select app.seed_category('Fitness Trackers', 'fitness-trackers', 'smart-devices', 20);
select app.seed_category('Smart Home Devices', 'smart-home-devices', 'smart-devices', 30);
select app.seed_category('Smart Plugs', 'smart-plugs', 'smart-devices', 40);
select app.seed_category('Smart Lights', 'smart-lights', 'smart-devices', 50);
select app.seed_category('Smart Speakers', 'smart-speakers', 'smart-devices', 60);

select app.seed_category('Power & Electrical', 'power-electrical', 'electronics', 100);
select app.seed_category('Extension Boards', 'extension-boards', 'power-electrical', 10);
select app.seed_category('Surge Protectors', 'surge-protectors', 'power-electrical', 20);
select app.seed_category('Inverters', 'inverters', 'power-electrical', 30);
select app.seed_category('UPS', 'ups', 'power-electrical', 40);
select app.seed_category('Rechargeable Batteries', 'rechargeable-batteries', 'power-electrical', 50);
select app.seed_category('Adapters', 'adapters', 'power-electrical', 60);
select app.seed_category('Electrical Accessories', 'electrical-accessories', 'power-electrical', 70);

select app.seed_category('Networking', 'networking', 'electronics', 110);
select app.seed_category('Wi-Fi Routers', 'wi-fi-routers', 'networking', 10);
select app.seed_category('Modems', 'modems', 'networking', 20);
select app.seed_category('Network Switches', 'network-switches', 'networking', 30);
select app.seed_category('Wi-Fi Extenders', 'wi-fi-extenders', 'networking', 40);
select app.seed_category('Network Cables', 'network-cables', 'networking', 50);
select app.seed_category('Network Accessories', 'network-accessories', 'networking', 60);

-- =====================================================================
-- 3. COSMETICS & BEAUTY
-- =====================================================================

select app.seed_category('Cosmetics & Beauty', 'cosmetics-beauty', null, 30);

select app.seed_category('Skincare', 'skincare', 'cosmetics-beauty', 10);
select app.seed_category('Face Wash', 'face-wash', 'skincare', 10);
select app.seed_category('Cleansers', 'cleansers', 'skincare', 20);
select app.seed_category('Toners', 'toners', 'skincare', 30);
select app.seed_category('Moisturizers', 'moisturizers', 'skincare', 40);
select app.seed_category('Face Creams', 'face-creams', 'skincare', 50);
select app.seed_category('Serums', 'serums', 'skincare', 60);
select app.seed_category('Face Masks', 'face-masks', 'skincare', 70);
select app.seed_category('Sunscreen', 'sunscreen', 'skincare', 80);
select app.seed_category('Acne Care', 'acne-care', 'skincare', 90);
select app.seed_category('Body Care', 'body-care', 'skincare', 100);

select app.seed_category('Hair Care', 'hair-care', 'cosmetics-beauty', 20);
select app.seed_category('Shampoos', 'shampoos', 'hair-care', 10);
select app.seed_category('Conditioners', 'conditioners', 'hair-care', 20);
select app.seed_category('Hair Oils', 'hair-oils', 'hair-care', 30);
select app.seed_category('Hair Creams', 'hair-creams', 'hair-care', 40);
select app.seed_category('Hair Treatments', 'hair-treatments', 'hair-care', 50);
select app.seed_category('Hair Colour', 'hair-colour', 'hair-care', 60);
select app.seed_category('Hair Extensions', 'hair-extensions', 'hair-care', 70);
select app.seed_category('Wigs', 'wigs', 'hair-care', 80);
select app.seed_category('Braids', 'braids', 'hair-care', 90);
select app.seed_category('Hair Accessories', 'hair-care-hair-accessories', 'hair-care', 100);

select app.seed_category('Makeup', 'makeup', 'cosmetics-beauty', 30);
select app.seed_category('Foundation', 'foundation', 'makeup', 10);
select app.seed_category('Concealer', 'concealer', 'makeup', 20);
select app.seed_category('Powder', 'powder', 'makeup', 30);
select app.seed_category('Blush', 'blush', 'makeup', 40);
select app.seed_category('Bronzer', 'bronzer', 'makeup', 50);
select app.seed_category('Highlighter', 'highlighter', 'makeup', 60);
select app.seed_category('Lipstick', 'lipstick', 'makeup', 70);
select app.seed_category('Lip Gloss', 'lip-gloss', 'makeup', 80);
select app.seed_category('Lip Liner', 'lip-liner', 'makeup', 90);
select app.seed_category('Eyeliner', 'eyeliner', 'makeup', 100);
select app.seed_category('Mascara', 'mascara', 'makeup', 110);
select app.seed_category('Eyeshadow', 'eyeshadow', 'makeup', 120);
select app.seed_category('Makeup Brushes', 'makeup-brushes', 'makeup', 130);
select app.seed_category('Makeup Tools', 'makeup-tools', 'makeup', 140);

select app.seed_category('Fragrance', 'fragrance', 'cosmetics-beauty', 40);
select app.seed_category('Perfumes', 'perfumes', 'fragrance', 10);
select app.seed_category('Body Sprays', 'body-sprays', 'fragrance', 20);
select app.seed_category('Body Mists', 'body-mists', 'fragrance', 30);
select app.seed_category('Deodorants', 'fragrance-deodorants', 'fragrance', 40);
select app.seed_category('Fragrance Oils', 'fragrance-oils', 'fragrance', 50);
select app.seed_category('Men''s Fragrance', 'mens-fragrance', 'fragrance', 60);
select app.seed_category('Women''s Fragrance', 'womens-fragrance', 'fragrance', 70);
select app.seed_category('Unisex Fragrance', 'unisex-fragrance', 'fragrance', 80);

select app.seed_category('Bath & Body', 'bath-body', 'cosmetics-beauty', 50);
select app.seed_category('Body Wash', 'body-wash', 'bath-body', 10);
select app.seed_category('Bath Soaps', 'bath-soaps', 'bath-body', 20);
select app.seed_category('Body Scrubs', 'body-scrubs', 'bath-body', 30);
select app.seed_category('Body Lotions', 'body-lotions', 'bath-body', 40);
select app.seed_category('Body Oils', 'body-oils', 'bath-body', 50);
select app.seed_category('Hand & Foot Care', 'hand-foot-care', 'bath-body', 60);
select app.seed_category('Bath Accessories', 'bath-accessories', 'bath-body', 70);

select app.seed_category('Men''s Grooming', 'mens-grooming', 'cosmetics-beauty', 60);
select app.seed_category('Shaving', 'shaving', 'mens-grooming', 10);
select app.seed_category('Beard Care', 'beard-care', 'mens-grooming', 20);
select app.seed_category('Beard Oils', 'beard-oils', 'mens-grooming', 30);
select app.seed_category('Aftershave', 'aftershave', 'mens-grooming', 40);
select app.seed_category('Men''s Skincare', 'mens-skincare', 'mens-grooming', 50);
select app.seed_category('Hair Styling', 'hair-styling', 'mens-grooming', 60);
select app.seed_category('Grooming Kits', 'grooming-kits', 'mens-grooming', 70);

select app.seed_category('Beauty Tools', 'beauty-tools', 'cosmetics-beauty', 70);
select app.seed_category('Hair Dryers', 'hair-dryers', 'beauty-tools', 10);
select app.seed_category('Hair Straighteners', 'hair-straighteners', 'beauty-tools', 20);
select app.seed_category('Curling Irons', 'curling-irons', 'beauty-tools', 30);
select app.seed_category('Hair Clippers', 'hair-clippers', 'beauty-tools', 40);
select app.seed_category('Trimmers', 'trimmers', 'beauty-tools', 50);
select app.seed_category('Electric Shavers', 'electric-shavers', 'beauty-tools', 60);
select app.seed_category('Facial Tools', 'facial-tools', 'beauty-tools', 70);
select app.seed_category('Manicure & Pedicure Tools', 'manicure-pedicure-tools', 'beauty-tools', 80);

select app.seed_category('Personal Care', 'personal-care', 'cosmetics-beauty', 80);
select app.seed_category('Oral Care', 'oral-care', 'personal-care', 10);
select app.seed_category('Feminine Care', 'feminine-care', 'personal-care', 20);
select app.seed_category('Deodorants', 'personal-care-deodorants', 'personal-care', 30);
select app.seed_category('Hand Care', 'hand-care', 'personal-care', 40);
select app.seed_category('Foot Care', 'foot-care', 'personal-care', 50);
select app.seed_category('Personal Hygiene', 'personal-hygiene', 'personal-care', 60);

-- =====================================================================
-- 4. HOME, LIVING & APPLIANCES
-- =====================================================================

select app.seed_category('Home, Living & Appliances', 'home-living-appliances', null, 40);

select app.seed_category('Kitchen & Dining', 'kitchen-dining', 'home-living-appliances', 10);
select app.seed_category('Cookware', 'cookware', 'kitchen-dining', 10);
select app.seed_category('Kitchen Utensils', 'kitchen-utensils', 'kitchen-dining', 20);
select app.seed_category('Kitchen Appliances', 'kitchen-appliances', 'kitchen-dining', 30);
select app.seed_category('Food Storage', 'food-storage', 'kitchen-dining', 40);
select app.seed_category('Dinnerware', 'dinnerware', 'kitchen-dining', 50);
select app.seed_category('Drinkware', 'drinkware', 'kitchen-dining', 60);
select app.seed_category('Cutlery', 'cutlery', 'kitchen-dining', 70);

select app.seed_category('Home Appliances', 'home-appliances', 'home-living-appliances', 20);
select app.seed_category('Refrigerators', 'refrigerators', 'home-appliances', 10);
select app.seed_category('Freezers', 'freezers', 'home-appliances', 20);
select app.seed_category('Washing Machines', 'washing-machines', 'home-appliances', 30);
select app.seed_category('Fans', 'fans', 'home-appliances', 40);
select app.seed_category('Air Conditioners', 'air-conditioners', 'home-appliances', 50);
select app.seed_category('Microwaves', 'microwaves', 'home-appliances', 60);
select app.seed_category('Blenders', 'blenders', 'home-appliances', 70);
select app.seed_category('Rice Cookers', 'rice-cookers', 'home-appliances', 80);
select app.seed_category('Electric Kettles', 'electric-kettles', 'home-appliances', 90);
select app.seed_category('Irons', 'irons', 'home-appliances', 100);

select app.seed_category('Home & Furniture', 'home-furniture', 'home-living-appliances', 30);
select app.seed_category('Beds', 'beds', 'home-furniture', 10);
select app.seed_category('Mattresses', 'mattresses', 'home-furniture', 20);
select app.seed_category('Chairs', 'chairs', 'home-furniture', 30);
select app.seed_category('Tables', 'tables', 'home-furniture', 40);
select app.seed_category('Sofas', 'sofas', 'home-furniture', 50);
select app.seed_category('Shelving', 'shelving', 'home-furniture', 60);
select app.seed_category('Storage', 'storage', 'home-furniture', 70);
select app.seed_category('Home Decor', 'home-decor', 'home-furniture', 80);

select app.seed_category('Cleaning & Household', 'cleaning-household', 'home-living-appliances', 40);
select app.seed_category('Cleaning Supplies', 'cleaning-supplies', 'cleaning-household', 10);
select app.seed_category('Laundry', 'laundry', 'cleaning-household', 20);
select app.seed_category('Brooms & Brushes', 'brooms-brushes', 'cleaning-household', 30);
select app.seed_category('Bins', 'bins', 'cleaning-household', 40);
select app.seed_category('Household Tools', 'household-tools', 'cleaning-household', 50);
select app.seed_category('Storage Containers', 'storage-containers', 'cleaning-household', 60);

-- Clean up the temporary helper.
drop function app.seed_category(text, text, text, integer);