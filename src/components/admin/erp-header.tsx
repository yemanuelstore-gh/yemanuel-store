"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icons";
import {
  Dropdown,
  DropdownItem,
  DropdownLink,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";

export function ErpHeader({
  collapsed,
  onToggleSidebar,
  mobileOpen,
  onToggleMobile,
  breadcrumb,
  user,
  canAccessAdmin = false,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  breadcrumb?: ReactNode;
  user?: { name: string; role: string };
  canAccessAdmin?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-erp-border bg-white/95 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onToggleMobile}
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        className="rounded-md p-1.5 text-erp-text-secondary transition-colors hover:bg-erp-canvas hover:text-erp-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy lg:hidden"
      >
        <Icon name={mobileOpen ? "close" : "menu"} size={18} />
      </button>

      <Tooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} side="bottom">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden rounded-md p-1.5 text-erp-text-secondary transition-colors hover:bg-erp-canvas hover:text-erp-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy lg:inline-flex"
        >
          <Icon name={collapsed ? "chevron-right" : "chevron-left"} size={16} />
        </button>
      </Tooltip>

      <div className="min-w-0 flex-1">{breadcrumb}</div>

      <label className="relative hidden md:block">
        <Icon
          name="search"
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-erp-text-muted"
        />
        <input
          type="search"
          placeholder="Search orders, products, customers…"
          className="h-8 w-64 rounded-md border border-erp-border bg-erp-canvas/50 pl-8 pr-3 text-xs text-erp-text placeholder:text-erp-text-muted focus:border-erp-navy focus:bg-white focus:outline-2 focus:outline-offset-0 focus:outline-erp-navy/25"
        />
      </label>

      <Tooltip label="Notifications" side="bottom">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-md p-1.5 text-erp-text-secondary transition-colors hover:bg-erp-canvas hover:text-erp-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
        >
          <Icon name="bell" size={17} />
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 size-1.5 rounded-full bg-erp-gold"
          />
        </button>
      </Tooltip>

      <div className="h-6 w-px bg-erp-border" aria-hidden="true" />

      {canAccessAdmin && (
        <Dropdown
          trigger={({ open, toggle }) => (
            <Tooltip label="Admin" side="bottom">
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label="Admin"
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy",
                  open
                    ? "border-erp-gold/40 bg-erp-canvas text-erp-navy"
                    : "border-erp-border bg-erp-canvas/50 text-erp-text-secondary hover:border-erp-gold/40 hover:bg-erp-canvas hover:text-erp-navy",
                )}
              >
                <Icon name="admin" size={14} className="text-erp-gold" />
                <span className="hidden sm:inline">Admin</span>
                <Icon
                  name="chevron-down"
                  size={12}
                  className={open ? "rotate-180 text-erp-text-muted" : "text-erp-text-muted"}
                />
              </button>
            </Tooltip>
          )}
        >
          <DropdownLink href="/admin/users">
            <Icon name="admin" size={14} className="text-erp-text-muted" />
            Users
          </DropdownLink>
          <DropdownLink href="/admin/roles">
            <Icon name="roles" size={14} className="text-erp-text-muted" />
            Roles &amp; Permissions
          </DropdownLink>
          <DropdownLink href="/admin/settings">
            <Icon name="settings" size={14} className="text-erp-text-muted" />
            Settings
          </DropdownLink>
          <DropdownSeparator />
          <DropdownLink href="/admin/audit">
            <Icon name="audit" size={14} className="text-erp-text-muted" />
            Audit Log
          </DropdownLink>
        </Dropdown>
      )}

      <div className="h-6 w-px bg-erp-border" aria-hidden="true" />

      <Dropdown
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-erp-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-erp-navy text-[11px] font-semibold text-white">
              {(user?.name ?? "Owner").slice(0, 1)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-xs font-medium text-erp-text">
                {user?.name ?? "Owner"}
              </span>
              <span className="block text-[10px] text-erp-text-muted">
                {user?.role ?? "Administrator"}
              </span>
            </span>
            <Icon
              name="chevron-down"
              size={13}
              className={open ? "rotate-180 text-erp-text-muted" : "text-erp-text-muted"}
            />
          </button>
        )}
      >
        <DropdownItem>My profile</DropdownItem>
        <DropdownItem>Workspace settings</DropdownItem>
        <DropdownSeparator />
        <DropdownItem className="text-erp-cancelled">Sign out</DropdownItem>
      </Dropdown>
    </header>
  );
}