"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";
import { erpNavGroups } from "@/components/admin/nav";

export function ErpSidebar({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <aside
      className={cn(
        "admin-scroll-dark relative flex h-full flex-col overflow-y-auto bg-erp-navy transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-60",
      )}
      aria-label="ERP navigation"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_180px_at_50%_-20%,rgb(244_180_0/0.09),transparent_65%)]" />

      <div
        className={cn(
          "relative flex h-14 shrink-0 items-center border-b border-erp-navy-line",
          collapsed ? "justify-center px-0" : "gap-2.5 px-4",
        )}
      >
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md bg-erp-gold font-display text-sm font-bold text-erp-navy-deep",
          )}
          aria-hidden="true"
        >
          Y
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-[13px] font-semibold tracking-wide text-white">
              YEMANUEL
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-erp-gold">
              ERP
            </p>
          </div>
        )}
      </div>

      <nav className="relative flex-1 px-2 py-3">
        {erpNavGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "relative shrink-0 border-t border-erp-navy-line py-3",
          collapsed ? "flex justify-center" : "flex items-center gap-2.5 px-4",
        )}
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
          O
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-medium text-white">
              Owner
            </p>
            <p className="truncate text-[10px] text-white/45">Administrator</p>
          </div>
        )}
        {!collapsed && (
          <Link
            href="/admin/logout"
            aria-label="Sign out"
            className="ml-auto rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-erp-gold"
          >
            <Icon name="logout" size={15} />
          </Link>
        )}
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: { label: string; href: string; icon: IconName };
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-erp-gold",
        collapsed ? "justify-center px-0 py-2" : "px-2.5 py-[7px]",
        active
          ? "bg-white/[0.08] font-medium text-white"
          : "text-white/60 hover:bg-white/[0.05] hover:text-white/90",
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-erp-gold"
        />
      )}
      <Icon
        name={item.icon}
        size={16}
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-erp-gold" : "text-white/45",
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <li>
        <Tooltip label={item.label} side="right">
          {link}
        </Tooltip>
      </li>
    );
  }

  return <li>{link}</li>;
}