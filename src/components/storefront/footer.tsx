import Link from "next/link";
import { DepartmentIcon } from "@/components/storefront/department-icons";
import { getCategories } from "@/lib/catalogue";
import { buildDepartments } from "@/lib/storefront-departments";
import { STORE_CONTACT } from "@/lib/storefront-contact";

const shopLinks = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop", label: "New arrivals" },
  { href: "/shop", label: "On sale" },
  { href: "/shop", label: "All categories" },
];

const customerLinks = [
  { href: "/account", label: "Your account" },
  { href: "/account/orders", label: "Order history" },
  { href: "/track", label: "Track an order" },
  { href: "/cart", label: "Shopping cart" },
];

const supportLinks = [
  { href: "/contact", label: "Contact & support" },
  { href: "/delivery", label: "Delivery information" },
  { href: "/payments", label: "Payment options" },
  { href: "/returns", label: "Returns & refunds" },
  { href: "/track", label: "Track an order" },
];

const linkClasses =
  "text-ivory/65 transition-colors hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold";

export async function StoreFooter() {
  const categoriesResult = await getCategories().catch(() => []);

  const departments = buildDepartments(categoriesResult);

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gold/20 bg-navy-dark">
      <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.9fr_1fr_0.9fr_0.9fr]">
          <div>
            <p className="font-display text-xl font-semibold tracking-tight text-ivory">
              Yemanuel<span className="text-gold">.</span>
              <span className="sr-only">Yemanuel Store</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-ivory/65">
              Modern Ghanaian retail — fashion, electronics, beauty and home,
              priced in GHS and delivered across Ghana.
            </p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-ivory/50">
              {STORE_CONTACT.address}
            </p>
            <div className="mt-4 space-y-1.5 text-sm">
              <a
                href={STORE_CONTACT.phoneHref}
                className="block w-fit text-ivory/65 transition-colors hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                {STORE_CONTACT.phone}
              </a>
              <a
                href={STORE_CONTACT.emailHref}
                className="block w-fit text-ivory/65 transition-colors hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                {STORE_CONTACT.email}
              </a>
              <a
                href={STORE_CONTACT.whatsappHref}
                className="block w-fit text-ivory/65 transition-colors hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                WhatsApp us
              </a>
            </div>
          </div>

          <nav aria-label="Shop" className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Shop
            </p>
            <ul className="mt-4 space-y-3">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClasses}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Departments" className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Departments
            </p>
            <ul className="mt-4 space-y-4">
              {departments.map((department) => {
                const href = department.category
                  ? `/categories/${department.category.slug}`
                  : "/shop";
                return (
                  <li key={department.id}>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-2 font-semibold text-ivory/90 transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
                    >
                      <span aria-hidden="true" className="text-gold/70">
                        <DepartmentIcon id={department.id} className="h-3.5 w-3.5" />
                      </span>
                      {department.name}
                    </Link>
                    {department.subcategories.length > 0 && (
                      <ul className="mt-2 space-y-2 border-l border-ivory/10 pl-4">
                        {department.subcategories.slice(0, 4).map((subcategory) => (
                          <li key={subcategory.name}>
                            <Link
                              href={
                                subcategory.slug
                                  ? `/categories/${subcategory.slug}`
                                  : "/shop"
                              }
                              className={linkClasses}
                            >
                              {subcategory.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <nav aria-label="Customer" className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Customer
            </p>
            <ul className="mt-4 space-y-3">
              {customerLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClasses}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Support" className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Support
            </p>
            <ul className="mt-4 space-y-3">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClasses}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ivory/10 pt-6 text-xs text-ivory/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Yemanuel Store. All rights reserved.
          </p>
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1 font-semibold uppercase tracking-[0.18em] text-gold">
            Ghana · GHS
          </p>
        </div>
      </div>
    </footer>
  );
}