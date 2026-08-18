"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { signOutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { type AdminNavItem, type AdminNavSection } from "./navigation";

export type AdminNotification = {
  label: string;
  count: number;
  href: string;
};

export type AdminBadges = Record<string, number>;

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

function Icon({
  path,
  className,
}: {
  path: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {path}
    </svg>
  );
}

const MODULE_ICONS: Record<string, ReactNode> = {
  dashboard: (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </>
  ),
  sales: (
    <>
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  customers: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  products: (
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </>
  ),
  inventory: (
    <>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </>
  ),
  purchasing: (
    <>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </>
  ),
  hr: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  finance: (
    <>
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  reports: (
    <>
      <path d="M3 3v18h18" />
      <path d="M8 17v-3" />
      <path d="M13 17V5" />
      <path d="M18 17V9" />
    </>
  ),
  administration: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </>
  ),
};

const NAV_ITEM_ICONS: Record<string, ReactNode> = {
  payments: (
    <>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </>
  ),
  expenses: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </>
  ),
  "expense-categories": (
    <>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" />
    </>
  ),
  "bank-accounts": (
    <>
      <line x1="3" x2="21" y1="22" y2="22" />
      <line x1="6" x2="6" y1="18" y2="11" />
      <line x1="10" x2="10" y1="18" y2="11" />
      <line x1="14" x2="14" y1="18" y2="11" />
      <line x1="18" x2="18" y1="18" y2="11" />
      <polygon points="12 2 20 7 4 7" />
    </>
  ),
  "mobile-money": (
    <>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </>
  ),
  employees: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  departments: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h1" />
      <path d="M14 9h1" />
      <path d="M9 12h1" />
      <path d="M14 12h1" />
      <path d="M9 15h1" />
      <path d="M14 15h1" />
      <path d="M9 18h1" />
      <path d="M14 18h1" />
    </>
  ),
  "salary-components": (
    <>
      <path d="M12 22V6a4 4 0 0 0-4-4H4v20h8Z" />
      <path d="M12 6a4 4 0 0 1 4-4h4v20h-8" />
      <path d="M16 10h.01" />
    </>
  ),
  "salary-structures": (
    <>
      <path d="M12 2v20" />
      <path d="M12 8a4 4 0 0 0-4-4H3v16h5a4 4 0 0 1 4 4" />
      <path d="M12 8a4 4 0 0 1 4-4h5v16h-5a4 4 0 0 1-4-4" />
    </>
  ),
  "payroll-periods": (
    <>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M8 15h.01" />
      <path d="M12 15h.01" />
      <path d="M16 15h.01" />
    </>
  ),
  "tax-slabs": (
    <>
      <path d="M2 20h20" />
      <path d="M4 20 10 5a2 2 0 0 1 3.9 0l6 15" />
      <path d="M6.4 14h11.2" />
      <path d="M8 8h8" />
    </>
  ),
};

function ChevronIcon({ className }: { className?: string }) {
  return (
    <Icon
      path={<path d="m6 9 6 6 6-6" />}
      className={className}
    />
  );
}

function BreadcrumbSeparator({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-3 w-3 shrink-0", className)}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function CollapseIcon({ className }: { className?: string }) {
  return (
    <Icon
      path={
        <>
          <path d="M11 17l-5-5 5-5" />
          <path d="M18 17l-5-5 5-5" />
        </>
      }
      className={className}
    />
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <Icon
      path={
        <>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </>
      }
      className={className}
    />
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <Icon
      path={
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </>
      }
      className={className}
    />
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Active-item matching
// ---------------------------------------------------------------------------

function findActive(
  sections: AdminNavSection[],
  pathname: string,
): { section: AdminNavSection; item: AdminNavItem } | null {
  let best: { section: AdminNavSection; item: AdminNavItem } | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      if (!item.href) continue;
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        if (!best || item.href.length > (best.item.href?.length ?? 0)) {
          best = { section, item };
        }
      }
    }
  }
  return best;
}

function sectionBadgeCount(section: AdminNavSection, badges: AdminBadges): number {
  return section.items.reduce(
    (sum, item) => sum + (item.href ? (badges[item.href] ?? 0) : 0),
    0,
  );
}

const COLLAPSED_STORAGE_KEY = "ys-admin-sidebar-collapsed";
const COLLAPSED_CHANGE_EVENT = "ys-admin-sidebar-collapsed-change";

function subscribeToCollapsed(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === COLLAPSED_STORAGE_KEY) onStoreChange();
  };
  const onLocalChange = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(COLLAPSED_CHANGE_EVENT, onLocalChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(COLLAPSED_CHANGE_EVENT, onLocalChange);
  };
}

function getCollapsedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({
  sections,
  pathname,
  collapsed,
  badges,
  onCollapsedChange,
  onNavigate,
}: {
  sections: AdminNavSection[];
  pathname: string;
  collapsed: boolean;
  badges: AdminBadges;
  onCollapsedChange: (collapsed: boolean) => void;
  onNavigate: () => void;
}) {
  const active = findActive(sections, pathname);
  const [openModules, setOpenModules] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (active) initial.add(active.section.id);
    return initial;
  });

  const toggleModule = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleModuleClick = (section: AdminNavSection) => {
    if (collapsed) {
      onCollapsedChange(false);
      setOpenModules((prev) => {
        const next = new Set(prev);
        next.add(section.id);
        return next;
      });
      return;
    }
    toggleModule(section.id);
  };

  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-white/10 bg-midnight-deep px-3.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-gold-bright via-gold to-gold-dark text-[13px] font-bold text-midnight shadow-sm">
          Y
        </span>
        {!collapsed && (
          <>
            <span className="truncate text-[13px] font-semibold tracking-tight text-white">
              Yemanuel Store
            </span>
            <span className="ml-auto rounded border border-gold/25 bg-gold/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-gold-bright">
              Admin
            </span>
          </>
        )}
      </div>

      <nav
        className="admin-scroll-dark flex-1 overflow-y-auto px-2 py-2"
        aria-label="Admin modules"
      >
        {collapsed ? (
          <ul className="space-y-1">
            {sections.map((section) => {
              const isActive = active?.section.id === section.id;
              const count = sectionBadgeCount(section, badges);
              return (
                <li key={section.id} className="relative">
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gold"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleModuleClick(section)}
                    title={section.title}
                    aria-label={section.title}
                    className={cn(
                      "relative flex h-9 w-full items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-bright",
                      isActive
                        ? "bg-white/[0.07] text-gold-bright"
                        : "text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon path={MODULE_ICONS[section.icon]} className="h-[18px] w-[18px]" />
                    {count > 0 && (
                      <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gold px-0.5 text-[8px] font-bold text-midnight">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          sections.map((section) => {
            const isOpen = openModules.has(section.id) || active?.section.id === section.id;
            const isActiveModule = active?.section.id === section.id;
            const count = sectionBadgeCount(section, badges);
            return (
              <div key={section.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => handleModuleClick(section)}
                  aria-expanded={isOpen}
                  className={cn(
                    "relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-bright",
                    isActiveModule
                      ? "bg-white/[0.07] text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {isActiveModule && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gold"
                    />
                  )}
                  <Icon
                    path={MODULE_ICONS[section.icon]}
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActiveModule ? "text-gold-bright" : "text-slate-400",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold tracking-tight">
                    {section.title}
                  </span>
                  {count > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-midnight">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                  <ChevronIcon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-150",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <ul className="mt-0.5 space-y-px">
                    {section.items.map((item) => {
                      const isActive =
                        !!item.href && (pathname === item.href || pathname.startsWith(item.href + "/"));
                      const itemCount = item.href ? (badges[item.href] ?? 0) : 0;
                      if (!item.href) {
                        return (
                          <li key={item.label}>
                            <span
                              title="Planned module — coming soon"
                              className="flex h-7 cursor-default items-center gap-2 rounded-md pl-8 pr-2 text-[13px] text-slate-500"
                            >
                              <span className="truncate">{item.label}</span>
                              <Badge
                                variant="neutral"
                                className="ml-auto border border-white/10 bg-white/5 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-slate-400"
                              >
                                Soon
                              </Badge>
                            </span>
                          </li>
                        );
                      }
                      return (
                        <li key={item.href} className="relative">
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute left-2 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-gold"
                            />
                          )}
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "flex h-7 items-center gap-2 rounded-md py-1 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-bright",
                              isActive
                                ? "bg-gold/10 text-gold-bright pl-8"
                                : "pl-8 pr-2 text-slate-400 hover:bg-white/5 hover:text-slate-100",
                            )}
                          >
                            {item.icon && (
                              <Icon
                                path={NAV_ITEM_ICONS[item.icon]}
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0",
                                  isActive ? "text-gold-bright" : "text-slate-500",
                                )}
                              />
                            )}
                            <span className="truncate">{item.label}</span>
                            {itemCount > 0 && (
                              <span
                                className={cn(
                                  "ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                                  isActive
                                    ? "bg-gold text-midnight"
                                    : "bg-white/10 text-slate-300",
                                )}
                              >
                                {itemCount > 9 ? "9+" : itemCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </nav>

      <div className="border-t border-white/10 bg-midnight-deep/60">
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md text-[11px] font-medium text-slate-500 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-bright",
            collapsed ? "mx-auto mt-2 h-8 justify-center" : "mx-2 my-2 h-7 px-1",
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <CollapseIcon className={cn("h-4 w-4", collapsed && "rotate-180")} />
          {!collapsed && <span>Collapse</span>}
        </button>
        {!collapsed && (
          <p className="border-t border-white/10 px-4 py-2.5 text-[10px] tracking-wide text-slate-500">
            Yemanuel Store · Accra, Ghana
          </p>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

function findBreadcrumb(
  sections: AdminNavSection[],
  pathname: string,
): { section?: AdminNavSection; item?: AdminNavItem } {
  let best: { section?: AdminNavSection; item?: AdminNavItem } = {};
  for (const section of sections) {
    for (const item of section.items) {
      if (!item.href) continue;
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        if (item.href.length > (best.item?.href?.length ?? 0)) {
          best = { section, item };
        }
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function AdminShell({
  sections,
  session,
  notifications,
  badges = {},
  children,
}: {
  sections: AdminNavSection[];
  session: SessionProps;
  notifications: AdminNotification[];
  badges?: AdminBadges;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    subscribeToCollapsed,
    getCollapsedSnapshot,
    () => false,
  );
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

  const handleCollapsedChange = (next: boolean) => {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      window.dispatchEvent(new Event(COLLAPSED_CHANGE_EVENT));
    } catch {
      // Ignore persistence failures.
    }
  };

  const crumb = findBreadcrumb(sections, pathname);
  const isDashboard = crumb.item?.href === "/admin";
  const title = crumb.item?.label ?? "Admin";
  const totalNotifications = notifications.reduce((sum, n) => sum + n.count, 0);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-midnight/60 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-midnight transition-[width] duration-200 lg:translate-x-0",
          collapsed ? "w-[52px]" : "w-60",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          sections={sections}
          pathname={pathname}
          collapsed={collapsed}
          badges={badges}
          onCollapsedChange={handleCollapsedChange}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[52px]" : "lg:pl-60",
        )}
      >
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-line bg-white px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-navy-soft/60 hover:text-ink lg:hidden"
              aria-label="Open navigation"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <Link
                href="/admin"
                className="shrink-0 text-[12px] font-medium text-ink-faint transition-colors hover:text-navy"
              >
                Admin
              </Link>
              {!isDashboard && crumb.section && (
                <>
                  <BreadcrumbSeparator className="text-ink-faint/70" />
                  <span className="truncate text-[12px] text-ink-soft">{crumb.section.title}</span>
                </>
              )}
              {crumb.item && (
                <>
                  <BreadcrumbSeparator className="text-ink-faint/70" />
                  <span className="truncate text-[12px] font-semibold text-ink">{title}</span>
                </>
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/admin/search"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-navy-soft/60 hover:text-ink"
              aria-label="Search admin records"
              title="Search"
            >
              <SearchIcon className="h-[17px] w-[17px]" />
            </Link>

            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-expanded={notificationsOpen}
                aria-haspopup="menu"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-navy-soft/60 hover:text-ink"
                aria-label="Notifications"
              >
                <BellIcon className="h-[17px] w-[17px]" />
                {totalNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white ring-2 ring-white">
                    {totalNotifications > 9 ? "9+" : totalNotifications}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-10 z-50 w-72 rounded-lg border border-line bg-white p-1.5 shadow-lifted"
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
                            className="flex items-center justify-between gap-3 rounded px-2.5 py-2 text-xs text-ink transition-colors hover:bg-navy-soft/50"
                          >
                            <span>{notification.label}</span>
                            <span className="rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">
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
                className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-navy-soft/60"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-navy to-midnight text-[11px] font-bold text-gold-bright ring-1 ring-inset ring-white/40">
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
                  className="absolute right-0 top-10 z-50 w-64 rounded-lg border border-line bg-white p-1.5 shadow-lifted"
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
                      className="block rounded px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-navy-soft/50 hover:text-navy"
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

        <main className="flex-1 p-4 lg:p-5">{children}</main>
      </div>
    </div>
  );
}
