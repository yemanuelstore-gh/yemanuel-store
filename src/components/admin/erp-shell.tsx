"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ErpSidebar } from "@/components/admin/erp-sidebar";
import { ErpHeader } from "@/components/admin/erp-header";

export function ErpShell({
  children,
  breadcrumb,
  user,
  defaultCollapsed = false,
}: {
  children: ReactNode;
  breadcrumb?: ReactNode;
  user?: { name: string; role: string };
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-erp-canvas text-erp-text">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-erp-navy-deep/60 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:relative lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <ErpSidebar
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <ErpHeader
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen((value) => !value)}
          breadcrumb={breadcrumb}
          user={user}
        />
        <main className="admin-scroll flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}