"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { signOutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/cn";
import { type AdminNavItem, type AdminNavSection } from "./navigation";

export type AdminNotification = {
  label: string;
  count: number;
  href: string;
};

type SessionProps = {
  userId: string;
  email: string;
  fullName: string | null;
  position: string;
  employeeCode: string;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ST";
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Sidebar({
  sections,
  pathname,
  onNavigate,
}: {
  sections: AdminNavSection[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <>
      <div className="flex h-12 items-center gap-2 border-b border-navy-dark bg-navy px-4">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-gold text-[11px] font-bold text-navy">
          Y
        </span>
        <span className="text-sm font-semibold tracking-tight text-ivory">
          Yemanuel Store
        </span>
        <span className="ml-auto rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
          Admin
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Admin">
        {sections.map((section) => (
          <div key={section.title} className="mb-3">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              {section.title}
            </p>
            <ul className="space-y-px">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy",
                        active
                          ? "bg-navy text-ivory"
                          : "text-ink-soft hover:bg-navy-soft hover:text-navy",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-4 py-2.5 text-[10px] text-ink-faint">
        Yemanuel Store · Accra, Ghana
      </div>
    </>
  );
}

function findBreadcrumb(
  sections: AdminNavSection[],
  pathname: string,
): { section?: AdminNavSection; item?: AdminNavItem } {
  let best: { section?: AdminNavSection; item?: AdminNavItem } = {};
  for (const section of sections) {
    for (const item of section.items) {
      if (pathname.startsWith(item.href)) {
        if (item.href.length > (best.item?.href.length ?? 0)) {
          best = { section, item };
        }
      }
    }
  }
  return best;
}

export function AdminShell({
  sections,
  session,
  notifications,
  children,
}: {
  sections: AdminNavSection[];
  session: SessionProps;
  notifications: AdminNotification[];
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const crumb = findBreadcrumb(sections, pathname);
  const title = crumb.item?.label ?? "Admin";
  const totalNotifications = notifications.reduce((sum, n) => sum + n.count, 0);

  return (
    <div className="min-h-screen bg-ivory text-ink">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-white transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          sections={sections}
          pathname={pathname}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-line bg-white px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-line/50 hover:text-ink lg:hidden"
              aria-label="Open navigation"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                />
              </svg>
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <Link
                href="/admin"
                className="shrink-0 text-ink-faint transition-colors hover:text-navy"
              >
                Admin
              </Link>
              {crumb.section && (
                <>
                  <span aria-hidden="true" className="text-ink-faint">/</span>
                  <span className="truncate text-ink-soft">{crumb.section.title}</span>
                </>
              )}
              {crumb.item && (
                <>
                  <span aria-hidden="true" className="text-ink-faint">/</span>
                  <span className="truncate font-semibold text-ink">{title}</span>
                </>
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-expanded={notificationsOpen}
                aria-haspopup="menu"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-line/50 hover:text-ink"
                aria-label="Notifications"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[18px] w-[18px]"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                {totalNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                    {totalNotifications > 9 ? "9+" : totalNotifications}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-10 z-50 w-72 rounded-lg border border-line bg-white p-1.5 shadow-soft"
                >
                  <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Needs attention
                  </p>
                  {notifications.length === 0 ? (
                    <p className="px-2.5 pb-2 text-xs text-ink-soft">
                      Nothing pending.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {notifications.map((notification) => (
                        <li key={notification.href}>
                          <Link
                            href={notification.href}
                            onClick={() => setNotificationsOpen(false)}
                            className="flex items-center justify-between gap-3 rounded px-2.5 py-2 text-xs text-ink transition-colors hover:bg-navy-soft/60"
                          >
                            <span>{notification.label}</span>
                            <span className="rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold text-ivory">
                              {notification.count}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-line/50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-ivory">
                  {initialsOf(session.fullName ?? session.email)}
                </span>
                <span className="hidden max-w-36 truncate text-left sm:block">
                  <span className="block text-xs font-semibold leading-4 text-ink">
                    {session.fullName ?? session.email}
                  </span>
                  <span className="block truncate text-[10px] leading-4 text-ink-faint">
                    {session.position}
                  </span>
                </span>
                <ChevronIcon className="hidden h-3.5 w-3.5 text-ink-faint sm:block" />
              </button>
              {accountOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-10 z-50 w-64 rounded-lg border border-line bg-white p-1.5 shadow-soft"
                >
                  <div className="border-b border-line px-2.5 pb-2 pt-1">
                    <p className="text-xs font-semibold text-ink">
                      {session.fullName ?? "Staff member"}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-soft">
                      {session.position} · {session.employeeCode}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-faint">
                      {session.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/"
                      onClick={() => setAccountOpen(false)}
                      className="block rounded px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-navy-soft/60 hover:text-navy"
                    >
                      View storefront
                    </Link>
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="block w-full rounded px-2.5 py-1.5 text-left text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}