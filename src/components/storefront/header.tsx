"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { DepartmentIcon } from "@/components/storefront/department-icons";
import { signOutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icons";
import type { CategorySummary } from "@/lib/catalogue";
import { wishlistCount, WISHLIST_CHANGE_EVENT } from "@/lib/wishlist";
import type { StoreDepartment } from "@/lib/storefront-departments";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/contact", label: "Contact" },
];

const mobileNavLinks = [
  ...navLinks,
  { href: "/track", label: "Track order" },
];

const announcementItems = [
  "10,000+ products · 300+ brands — Ghana's marketplace",
  "Quality-checked products · Delivered across all 16 regions",
  "Genuine brands · Prices in GHS · Easy returns",
  "Shop fashion, electronics, beauty & home in one place",
];

const linkClasses =
  "font-medium text-ink-soft transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy";

const mobileLinkClasses =
  "flex items-center gap-3 rounded-md px-2 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-navy-soft/60 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={cn(
          linkClasses,
          "text-xs font-semibold text-ink-faint hover:text-danger",
        )}
      >
        Sign out
      </button>
    </form>
  );
}

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-6 w-6"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-6 w-6"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function WishlistLink() {
  const count = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(WISHLIST_CHANGE_EVENT, onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        window.removeEventListener(WISHLIST_CHANGE_EVENT, onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    () => wishlistCount(),
    () => 0,
  );

  return (
    <Link
      href="/wishlist"
      aria-label={`Wishlist${count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-navy-soft/70 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      <HeartIcon />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-gold px-1 py-0.5 text-[9px] font-semibold leading-none text-navy-dark">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function SearchBar({
  id,
  className,
  categories,
}: {
  id: string;
  className?: string;
  categories: CategorySummary[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = query.trim().toLowerCase();
  const suggestions =
    trimmed.length > 0
      ? categories
          .filter((category) => category.name.toLowerCase().includes(trimmed))
          .sort((a, b) => Number(a.parentId !== null) - Number(b.parentId !== null))
          .slice(0, 6)
      : [];

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <form
      action="/shop"
      method="get"
      role="search"
      className={cn("relative", className)}
    >
      <label htmlFor={id} className="sr-only">
        Search the catalogue
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <Input
        id={id}
        name="q"
        type="search"
        placeholder="Search fashion, electronics & more…"
        className="h-10 bg-paper pl-9 shadow-soft"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={scheduleClose}
        autoComplete="off"
      />

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-line bg-paper shadow-lifted">
          <p className="px-3.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Categories
          </p>
          <ul className="p-1.5">
            {suggestions.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${category.slug}`}
                  onMouseDown={(event) => event.preventDefault()}
                  className="block truncate rounded-md px-2.5 py-2 text-sm text-ink-soft transition-colors hover:bg-navy-soft/60 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

function DepartmentsMenu({
  departments,
  onNavigate,
}: {
  departments: StoreDepartment[];
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div className="flex h-full items-center">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center gap-1.5 font-medium transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy",
          open ? "text-navy" : "text-ink-soft",
        )}
      >
        Departments
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-180",
          )}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close departments menu"
            onClick={close}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute left-1/2 top-full z-50 mt-2 w-[min(52rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-line bg-paper p-5 shadow-lifted">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                Shop by department
              </p>
              <Link
                href="/shop"
                onClick={close}
                className="text-xs font-medium text-gold-dark transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                Shop everything →
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {departments.map((department) => {
                const href = department.category
                  ? `/categories/${department.category.slug}`
                  : "/shop";
                return (
                  <div key={department.id} className="min-w-0">
                    <Link
                      href={href}
                      onClick={close}
                      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-navy-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-dark transition-colors group-hover:bg-gold group-hover:text-navy-dark">
                        <DepartmentIcon id={department.id} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-ink">
                          {department.name}
                        </span>
                        {department.category && (
                          <span className="block text-[10px] text-ink-faint">
                            {department.category.productCount}{" "}
                            {department.category.productCount === 1
                              ? "product"
                              : "products"}
                          </span>
                        )}
                      </span>
                    </Link>
                    {department.subcategories.length > 0 && (
                      <ul className="mt-2 space-y-0.5 border-l border-line pl-3">
                        {department.subcategories.map((subcategory) => (
                          <li key={subcategory.name}>
                            <Link
                              href={
                                subcategory.slug
                                  ? `/categories/${subcategory.slug}`
                                  : "/shop"
                              }
                              onClick={close}
                              className="block truncate rounded-sm px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-navy-soft/60 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                            >
                              {subcategory.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function StoreHeader({
  cartCount = 0,
  account = null,
  departments = [],
  categories = [],
}: {
  cartCount?: number;
  account?: { userId: string; email: string; fullName: string | null } | null;
  departments?: StoreDepartment[];
  categories?: CategorySummary[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const pathname = usePathname();
  const signedIn = account !== null;
  const accountName = account?.fullName ?? null;

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIndex((index) => (index + 1) % announcementItems.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const cartBadge = cartCount > 0 && (
    <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-gold px-1 py-0.5 text-[9px] font-semibold leading-none text-navy-dark">
      {cartCount > 99 ? "99+" : cartCount}
    </span>
  );

  return (
    <header className="sticky top-0 z-40">
      <div className="relative overflow-hidden border-b border-navy-dark/60 bg-gradient-to-r from-navy-dark via-navy to-navy-dark">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-ivory/10 to-transparent animate-[image-shine_6s_ease-in-out_infinite] motion-reduce:animate-none"
        />
        <div className="relative mx-auto flex h-7 max-w-6xl items-center justify-center overflow-hidden px-4">
          <span
            key={announcementIndex}
            className="flex items-center gap-2.5 animate-[announcement-fade_0.5s_ease-out] motion-reduce:animate-none"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-2.5 w-2.5 shrink-0 text-gold"
              fill="currentColor"
            >
              <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ivory/85">
              {announcementItems[announcementIndex]}
            </span>
          </span>
        </div>
      </div>

      <div className="border-b border-line bg-ivory/95 shadow-soft backdrop-blur">
        <div className="relative mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 lg:gap-6">
          <Link
            href="/"
            className="shrink-0 font-display text-xl font-semibold tracking-tight text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Yemanuel <span className="text-gold">Store</span>
            <span className="sr-only">Yemanuel Store — home</span>
          </Link>

          <nav
            aria-label="Main"
            className="hidden items-center gap-6 lg:flex"
          >
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative text-[13px] font-medium transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy",
                    active ? "text-navy" : "text-ink-soft",
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-gold transition-opacity",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                </Link>
              );
            })}
            <div className="self-stretch">
              <DepartmentsMenu departments={departments} />
            </div>
          </nav>

          <SearchBar
            id="storefront-search"
            categories={categories}
            className="hidden md:block md:flex-1 lg:max-w-md"
          />

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <span className="hidden sm:block">
              <WishlistLink />
            </span>

            {signedIn ? (
              <>
                <Link
                  href="/account"
                  className={cn(linkClasses, "hidden md:block")}
                >
                  Account
                  {accountName && (
                    <span className="hidden max-w-28 truncate text-xs text-ink-faint lg:inline">
                      {" "}
                      {accountName}
                    </span>
                  )}
                </Link>
                <Link
                  href="/account/orders"
                  className={cn(linkClasses, "hidden md:block")}
                >
                  Orders
                </Link>
                <div className="hidden md:block">
                  <SignOutButton />
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden h-9 items-center rounded-md border border-line-strong bg-paper px-3.5 text-xs font-medium text-ink shadow-soft transition-colors hover:border-navy/40 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy md:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="hidden h-9 items-center rounded-md bg-gold px-3.5 text-xs font-semibold text-navy-dark shadow-soft transition-colors hover:bg-gold-dark hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold md:inline-flex"
                >
                  Create account
                </Link>
              </>
            )}

            <Link
              href="/cart"
              aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-navy-soft/70 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <CartIcon />
              {cartBadge}
            </Link>

            <Link
              href="/track"
              className={cn(
                linkClasses,
                "hidden h-9 items-center text-xs font-semibold md:inline-flex",
              )}
            >
              Track order
            </Link>

            <Link
              href="/admin/login"
              className="hidden h-9 items-center gap-1.5 rounded-md bg-navy px-3.5 text-xs font-semibold text-gold shadow-soft transition-colors hover:bg-navy-dark hover:text-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold md:inline-flex"
            >
              <Icon name="admin" size={12} />
              Admin Portal
            </Link>

            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="storefront-mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-navy-soft/70 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy md:hidden"
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-line bg-ivory/95 px-4 py-2 md:hidden">
        <SearchBar id="storefront-mobile-search-bar" categories={categories} />
      </div>

      <div
        id="storefront-mobile-menu"
        className={cn(
          "border-b border-line bg-ivory/98 backdrop-blur md:hidden",
          !menuOpen && "hidden",
        )}
      >
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-5">
          <nav
            aria-label="Mobile departments"
            className="space-y-3 border-t border-line pt-4"
          >
            {departments.map((department) => {
              const href = department.category
                ? `/categories/${department.category.slug}`
                : "/shop";
              return (
                <div key={department.id}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-navy-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-dark">
                      <DepartmentIcon id={department.id} className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold text-ink">
                      {department.name}
                    </span>
                  </Link>
                  {department.subcategories.length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 px-3.5">
                      {department.subcategories.slice(0, 5).map((subcategory) => (
                        <li key={subcategory.name}>
                          <Link
                            href={
                              subcategory.slug
                                ? `/categories/${subcategory.slug}`
                                : "/shop"
                            }
                            onClick={() => setMenuOpen(false)}
                            className="inline-block py-1 text-[11px] font-medium text-ink-soft transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                          >
                            {subcategory.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
          <nav aria-label="Mobile" className="flex flex-col">
            {mobileNavLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={mobileLinkClasses}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/admin/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-md px-2 py-2.5 text-sm font-medium text-gold bg-navy-soft/50 transition-colors hover:bg-navy-soft hover:text-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <Icon name="admin" size={16} />
              Admin Portal
            </Link>
          </nav>
          <div className="border-t border-line pt-4">
            {signedIn ? (
              <nav aria-label="Account" className="flex flex-col">
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClasses}
                >
                  Account
                </Link>
                <Link
                  href="/account/orders"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClasses}
                >
                  Orders
                </Link>
                <form action={signOutAction} className="px-2 pt-1">
                  <button
                    type="submit"
                    className="text-sm font-medium text-ink-faint transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                  >
                    Sign out
                  </button>
                </form>
              </nav>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-line-strong bg-paper px-4 text-sm font-medium text-ink shadow-soft transition-colors hover:border-navy/40 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-gold px-4 text-sm font-semibold text-navy-dark shadow-soft transition-colors hover:bg-gold-dark hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}