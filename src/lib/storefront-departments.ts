import type { CategorySummary } from "@/lib/catalogue";

export type DepartmentCategoryMatch = {
  id: string;
  slug: string;
  name: string;
  productCount: number;
  imageUrl: string | null;
};

export type StoreSubcategory = {
  name: string;
  slug: string | null;
};

export type StoreDepartment = {
  id: string;
  name: string;
  tagline: string;
  keywords: string[];
  category: DepartmentCategoryMatch | null;
  subcategories: StoreSubcategory[];
  /**
   * Curated same-origin cover (`/images/...`) used when the matched
   * category has no imageUrl in the catalogue yet.
   */
  coverImage: string;
};

type DepartmentDefinition = {
  id: string;
  name: string;
  tagline: string;
  keywords: string[];
  fallbackSubcategories: string[];
  coverImage: string;
};

/**
 * Yemanuel Store's official commercial departments, matching the seeded
 * category tree (see supabase/migrations/20260815000011). Each department
 * id equals the main category's slug.
 *
 * When the category tree is not yet seeded in the connected database the
 * department still renders, linking to the shop with its static
 * subcategory names — nothing is fabricated, the links simply point at
 * the full catalogue until the seed lands.
 */
const DEPARTMENT_DEFINITIONS: DepartmentDefinition[] = [
  {
    id: "fashion",
    name: "Fashion",
    tagline: "Clothing, footwear & accessories for every occasion",
    keywords: ["fashion", "clothing", "apparel", "wear"],
    coverImage: "/images/department-fashion.jpg",
    fallbackSubcategories: [
      "Men's Fashion",
      "Women's Fashion",
      "Kids' Fashion",
      "Footwear",
      "Fashion Accessories",
    ],
  },
  {
    id: "electronics",
    name: "Electronics",
    tagline: "Phones, computers, TVs & everyday tech",
    keywords: ["electron"],
    coverImage: "/images/department-electronics.jpg",
    fallbackSubcategories: [
      "Mobile Phones",
      "Tablets",
      "Computers",
      "Mobile Accessories",
      "Audio",
      "TVs & Entertainment",
      "Cameras & Photography",
      "Gaming",
      "Smart Devices",
      "Power & Electrical",
      "Networking",
    ],
  },
  {
    id: "cosmetics-beauty",
    name: "Cosmetics & Beauty",
    tagline: "Skincare, haircare, makeup & fragrance",
    keywords: ["cosmetic", "beauty", "personal care", "skincare"],
    coverImage: "/images/department-cosmetics.jpg",
    fallbackSubcategories: [
      "Skincare",
      "Hair Care",
      "Makeup",
      "Fragrance",
      "Bath & Body",
      "Men's Grooming",
      "Beauty Tools",
      "Personal Care",
    ],
  },
  {
    id: "home-living-appliances",
    name: "Home, Living & Appliances",
    tagline: "Kitchen, furniture, appliances & household",
    keywords: ["home", "living", "furniture", "kitchen", "appliance"],
    coverImage: "/images/department-home.jpg",
    fallbackSubcategories: [
      "Kitchen & Dining",
      "Home Appliances",
      "Home & Furniture",
      "Cleaning & Household",
    ],
  },
];

function matchDepartmentCategory(
  department: DepartmentDefinition,
  categories: CategorySummary[],
): DepartmentCategoryMatch | null {
  const direct = categories.find((category) => category.slug === department.id);
  if (direct) {
    return {
      id: direct.id,
      slug: direct.slug,
      name: direct.name,
      productCount: direct.productCount,
      imageUrl: direct.imageUrl,
    };
  }
  const lower = department.name.toLowerCase();
  const byName = categories.find((category) => category.name.toLowerCase() === lower);
  if (byName) {
    return {
      id: byName.id,
      slug: byName.slug,
      name: byName.name,
      productCount: byName.productCount,
      imageUrl: byName.imageUrl,
    };
  }
  for (const keyword of department.keywords) {
    const match = categories.find((category) =>
      category.name.toLowerCase().includes(keyword),
    );
    if (match) {
      return {
        id: match.id,
        slug: match.slug,
        name: match.name,
        productCount: match.productCount,
        imageUrl: match.imageUrl,
      };
    }
  }
  return null;
}

function resolveSubcategories(
  department: DepartmentDefinition,
  category: DepartmentCategoryMatch | null,
  categories: CategorySummary[],
): StoreSubcategory[] {
  if (category) {
    const children = categories.filter((item) => item.parentId === category.id);
    if (children.length > 0) {
      return children.map((child) => ({ name: child.name, slug: child.slug }));
    }
  }
  return department.fallbackSubcategories.map((name) => ({ name, slug: null }));
}

/**
 * Build the storefront's four official departments, linking each one to
 * its real main category and deriving subcategory links from the seeded
 * category tree when available.
 */
export function buildDepartments(categories: CategorySummary[]): StoreDepartment[] {
  return DEPARTMENT_DEFINITIONS.map((department) => {
    const category = matchDepartmentCategory(department, categories);
    return {
      ...department,
      category,
      subcategories: resolveSubcategories(department, category, categories),
    };
  });
}

/**
 * Resolve a curated local cover for a category landing page. Prefers the
 * real Supabase category image, then falls back to the department cover
 * whose matched category slug equals the given slug, then to the generic
 * retail editorial cover. Returns null only when no local asset applies.
 */
export function resolveCategoryCover(
  categorySlug: string,
  categories: CategorySummary[],
): string | null {
  const departments = buildDepartments(categories);
  const department = departments.find(
    (item) => item.category?.slug === categorySlug,
  );
  if (department) return department.coverImage;
  return "/images/retail-editorial.jpg";
}