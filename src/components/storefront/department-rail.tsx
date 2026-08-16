import Link from "next/link";
import { DepartmentIcon } from "@/components/storefront/department-icons";
import { ProductImage } from "@/components/storefront/product-image";
import { SectionHeader } from "@/components/storefront/section-header";
import type { StoreDepartment } from "@/lib/storefront-departments";

export function DepartmentRail({
  departments,
}: {
  departments: StoreDepartment[];
}) {
  return (
    <section className="border-t border-line bg-ivory">
      <div className="mx-auto max-w-6xl px-4 py-9 lg:py-12">
        <SectionHeader
          eyebrow="Departments"
          title="Shop by department"
          description="Everything Yemanuel Store carries, organised the way Ghana shops."
          actionHref="/shop"
          actionLabel="Shop all departments"
        />

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {departments.map((department) => {
            const href = department.category
              ? `/categories/${department.category.slug}`
              : "/shop";
            const imageUrl = department.category?.imageUrl ?? department.coverImage;
            return (
              <Link
                key={department.id}
                href={href}
                className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-lg border border-line bg-navy-dark shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                {imageUrl ? (
                  <ProductImage
                    src={imageUrl}
                    alt={department.name}
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-br from-navy via-navy-dark to-navy-dark"
                  >
                    <span
                      className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gold/15 blur-2xl"
                    />
                  </div>
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/40 to-navy/5 transition-opacity duration-300"
                />
                <span
                  aria-hidden="true"
                  className="absolute left-3 top-3 rounded-sm border border-ivory/20 bg-navy/40 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-ivory/70 backdrop-blur-sm"
                >
                  {department.category
                    ? `${department.category.productCount} ${
                        department.category.productCount === 1
                          ? "product"
                          : "products"
                      }`
                    : "Department"}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-ivory/25 bg-navy/50 text-gold backdrop-blur-sm transition-colors duration-300 group-hover:bg-gold group-hover:text-navy-dark"
                >
                  <DepartmentIcon id={department.id} className="h-4 w-4" />
                </span>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-2.5 -left-2.5 h-10 w-10 rounded-tl-lg border-l border-t border-gold/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />

                <div className="relative p-3.5">
                  <h3 className="font-display text-lg font-medium tracking-tight text-ivory transition-colors group-hover:text-gold">
                    {department.name}
                  </h3>
                  <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-ivory/70">
                    {department.tagline}
                  </p>
                  {department.subcategories.length > 0 && (
                    <ul className="mt-2.5 flex flex-wrap gap-1">
                      {department.subcategories.slice(0, 4).map((subcategory) => (
                        <li
                          key={subcategory.name}
                          className="rounded-full border border-ivory/20 bg-ivory/10 px-1.5 py-0.5 text-[9px] font-medium text-ivory/85 backdrop-blur-sm transition-colors group-hover:border-gold/40 group-hover:text-gold"
                        >
                          {subcategory.name}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Shop {department.name} →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}