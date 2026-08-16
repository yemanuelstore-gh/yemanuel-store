import { MarketplaceHero } from "@/components/storefront/marketplace-hero";
import { SaleRail } from "@/components/storefront/sale-rail";
import { CategoryGrid } from "@/components/storefront/category-grid";
import { BrandStrip } from "@/components/storefront/brand-strip";
import { FeaturedProducts } from "@/components/storefront/featured-products";
import { NewArrivals } from "@/components/storefront/new-arrivals";
import { ProductRail } from "@/components/storefront/product-rail";
import { BestSellerRail } from "@/components/storefront/best-seller-rail";
import { ValueProps } from "@/components/storefront/value-props";
import { GhanaDelivery } from "@/components/storefront/ghana-delivery";
import { FinalCta } from "@/components/storefront/final-cta";
import { NewsletterSignup } from "@/components/storefront/newsletter";
import {
  getActiveProductCount,
  getBrands,
  getCategories,
  getDeliveryMethods,
  getFeaturedProducts,
  getNewArrivals,
  getProductsByCategoryIds,
  getRegions,
  getSaleProducts,
  getShopProducts,
  getBestSellers,
  descendantCategoryIds,
  type CategorySummary,
} from "@/lib/catalogue";
import { buildDepartments } from "@/lib/storefront-departments";

function departmentCategoryIds(
  categories: CategorySummary[],
  category: { id: string } | null | undefined,
): string[] {
  if (!category) return [];
  return [category.id, ...descendantCategoryIds(categories, category.id)];
}

export default async function HomePage() {
  const [
    categories,
    featured,
    sale,
    brands,
    bestSellers,
    regions,
    deliveryMethods,
    activeCount,
    shopProducts,
  ] = await Promise.allSettled([
    getCategories(),
    getFeaturedProducts(8),
    getSaleProducts(12),
    getBrands(),
    getBestSellers(8),
    getRegions(),
    getDeliveryMethods(),
    getActiveProductCount(),
    getShopProducts({ limit: 200 }),
  ]);

  const categoryList =
    categories.status === "fulfilled" ? categories.value : [];
  const featuredList = featured.status === "fulfilled" ? featured.value : [];
  const saleList = sale.status === "fulfilled" ? sale.value : [];
  const brandList = brands.status === "fulfilled" ? brands.value : [];
  const bestSellerList =
    bestSellers.status === "fulfilled" ? bestSellers.value : [];
  const regionList = regions.status === "fulfilled" ? regions.value : [];
  const methodList =
    deliveryMethods.status === "fulfilled" ? deliveryMethods.value : [];
  const productCount =
    activeCount.status === "fulfilled"
      ? activeCount.value
      : shopProducts.status === "fulfilled"
        ? shopProducts.value.length
        : 0;
  const shopList = shopProducts.status === "fulfilled" ? shopProducts.value : [];

  const departments = buildDepartments(categoryList);
  const fashionDepartment = departments.find((item) => item.id === "fashion");
  const electronicsDepartment = departments.find(
    (item) => item.id === "electronics",
  );
  const cosmeticsDepartment = departments.find(
    (item) => item.id === "cosmetics-beauty",
  );
  const homeDepartment = departments.find(
    (item) => item.id === "home-living-appliances",
  );

  const [fashion, electronics, cosmetics, home] = await Promise.allSettled([
    getProductsByCategoryIds(
      departmentCategoryIds(categoryList, fashionDepartment?.category),
      12,
    ),
    getProductsByCategoryIds(
      departmentCategoryIds(categoryList, electronicsDepartment?.category),
      12,
    ),
    getProductsByCategoryIds(
      departmentCategoryIds(categoryList, cosmeticsDepartment?.category),
      12,
    ),
    getProductsByCategoryIds(
      departmentCategoryIds(categoryList, homeDepartment?.category),
      12,
    ),
  ]);
  const fashionProducts = fashion.status === "fulfilled" ? fashion.value : [];
  const electronicsProducts =
    electronics.status === "fulfilled" ? electronics.value : [];
  const cosmeticsProducts =
    cosmetics.status === "fulfilled" ? cosmetics.value : [];
  const homeProducts = home.status === "fulfilled" ? home.value : [];

  const displayFeatured = saleList.length >= 4 ? saleList : featuredList;
  const featuredIds = displayFeatured.map((product) => product.id);
  const newArrivals = await getNewArrivals(10, featuredIds).catch(() => []);

  const fashionHref = fashionDepartment?.category
    ? `/categories/${fashionDepartment.category.slug}`
    : "/shop";
  const electronicsHref = electronicsDepartment?.category
    ? `/categories/${electronicsDepartment.category.slug}`
    : "/shop";
  const cosmeticsHref = cosmeticsDepartment?.category
    ? `/categories/${cosmeticsDepartment.category.slug}`
    : "/shop";
  const homeHref = homeDepartment?.category
    ? `/categories/${homeDepartment.category.slug}`
    : "/shop";

  const recommended =
    shopList.length >= 24 ? shopList.slice(0, 24) : displayFeatured;

  return (
    <>
      <MarketplaceHero
        heroProduct={displayFeatured[0] ?? null}
        sale={saleList}
        newArrivals={newArrivals}
        productCount={productCount}
        brandCount={brandList.length}
        categoryCount={categoryList.length}
      />

      <SaleRail
        products={saleList}
        eyebrow="Flash sale"
        title="Deals on the shelves right now"
      />

      <CategoryGrid categories={categoryList} />

      {bestSellerList.length > 0 ? (
        <BestSellerRail items={bestSellerList} />
      ) : (
        <ProductRail
          eyebrow="Popular"
          title="Popular products"
          description="A broad look across the store — explore what is currently on the shelves."
          href="/shop"
          products={featuredList}
          tone="ivory"
        />
      )}

      <NewArrivals products={newArrivals} />

      <ProductRail
        eyebrow="Electronics"
        title="Phones, computers & gadgets"
        description="Everyday tech for homes across Ghana — phones, laptops, audio and accessories."
        href={electronicsHref}
        products={electronicsProducts}
        tone="paper"
      />

      <ProductRail
        eyebrow="Fashion"
        title="Fashion for every occasion"
        description="Clothing, footwear and accessories for work, school and every Ghanaian occasion."
        href={fashionHref}
        products={fashionProducts}
        tone="ivory"
      />

      <ProductRail
        eyebrow="Cosmetics & Beauty"
        title="Beauty routines, made easy"
        description="Skincare, haircare, makeup and fragrance for everyday life — priced in GHS."
        href={cosmeticsHref}
        products={cosmeticsProducts}
        tone="paper"
      />

      <ProductRail
        eyebrow="Home & Appliances"
        title="A home that works for you"
        description="Kitchen, furniture, appliances and everything your household needs — delivered across Ghana."
        href={homeHref}
        products={homeProducts}
        tone="ivory"
      />

      <BrandStrip brands={brandList} />

      <FeaturedProducts
        products={recommended}
        eyebrow="Recommended"
        title="Recommended for you"
        description="The newest stock across every department — pick up something new."
        priorityCount={3}
      />

      <ValueProps />
      <GhanaDelivery methods={methodList} regions={regionList} />
      <FinalCta />
      <NewsletterSignup />
    </>
  );
}
