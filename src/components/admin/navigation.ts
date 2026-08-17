import { PERMISSIONS } from "@/lib/admin/permissions";

export type AdminNavItem = {
  label: string;
  href?: string;
  permission?: string;
  /** Module is planned but has no page yet. Rendered as a muted, non-navigable entry. */
  planned?: boolean;
};

export type AdminNavSection = {
  id: string;
  title: string;
  /** Icon key resolved by the client shell (see nav-icons). */
  icon: string;
  items: AdminNavItem[];
};

export const adminNavigation: AdminNavSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: "dashboard",
    items: [{ label: "Dashboard", href: "/admin" }],
  },
  {
    id: "sales",
    title: "Sales",
    icon: "sales",
    items: [
      {
        label: "POS",
        href: "/admin/pos",
        permission: PERMISSIONS.sales.create,
      },
      {
        label: "Orders",
        href: "/admin/orders",
        permission: PERMISSIONS.sales.read,
      },
      {
        label: "Customers",
        href: "/admin/customers",
        permission: PERMISSIONS.customers.read,
      },
      {
        label: "Returns",
        href: "/admin/returns",
        permission: PERMISSIONS.sales.read,
      },
      {
        label: "Quotations",
        permission: PERMISSIONS.sales.read,
        planned: true,
      },
    ],
  },
  {
    id: "products",
    title: "Products",
    icon: "products",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        permission: PERMISSIONS.products.read,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        permission: PERMISSIONS.products.read,
      },
      {
        label: "Brands",
        href: "/admin/brands",
        permission: PERMISSIONS.products.read,
      },
      {
        label: "Product Variants",
        permission: PERMISSIONS.products.read,
        planned: true,
      },
      {
        label: "Barcodes",
        permission: PERMISSIONS.products.read,
        planned: true,
      },
      {
        label: "Price Lists",
        permission: PERMISSIONS.products.read,
        planned: true,
      },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    icon: "inventory",
    items: [
      {
        label: "Stock Overview",
        href: "/admin/inventory",
        permission: PERMISSIONS.inventory.read,
      },
      {
        label: "Stock Ledger",
        href: "/admin/inventory/movements",
        permission: PERMISSIONS.inventory.read,
      },
      {
        label: "Stock Transfers",
        href: "/admin/inventory/transfers",
        permission: PERMISSIONS.inventory.read,
      },
      {
        label: "Stock Adjustments",
        href: "/admin/inventory/adjustments",
        permission: PERMISSIONS.inventory.read,
      },
      {
        label: "Warehouses / Locations",
        permission: PERMISSIONS.inventory.read,
        planned: true,
      },
      {
        label: "Low Stock",
        permission: PERMISSIONS.inventory.read,
        planned: true,
      },
      {
        label: "Stock Valuation",
        permission: PERMISSIONS.inventory.read,
        planned: true,
      },
    ],
  },
  {
    id: "purchasing",
    title: "Purchasing",
    icon: "purchasing",
    items: [
      {
        label: "Suppliers",
        href: "/admin/suppliers",
        permission: PERMISSIONS.suppliers.read,
      },
      {
        label: "Purchase Orders",
        href: "/admin/purchases/orders",
        permission: PERMISSIONS.purchases.read,
      },
      {
        label: "Goods Receipts",
        href: "/admin/purchases/receipts",
        permission: PERMISSIONS.purchases.read,
      },
      {
        label: "Supplier Invoices",
        href: "/admin/purchases/invoices",
        permission: PERMISSIONS.purchases.read,
      },
      {
        label: "Purchase Payments",
        href: "/admin/purchases/payments",
        permission: PERMISSIONS.purchases.read,
      },
    ],
  },
  {
    id: "hr",
    title: "HR",
    icon: "hr",
    items: [
      { label: "Employees", permission: PERMISSIONS.hr.read, planned: true },
      { label: "Departments", permission: PERMISSIONS.hr.read, planned: true },
      { label: "Attendance", permission: PERMISSIONS.hr.read, planned: true },
      { label: "Leave", permission: PERMISSIONS.hr.read, planned: true },
      { label: "Payroll", permission: PERMISSIONS.hr.read, planned: true },
      {
        label: "Salary Components",
        permission: PERMISSIONS.hr.read,
        planned: true,
      },
      {
        label: "Salary Structures",
        permission: PERMISSIONS.hr.read,
        planned: true,
      },
      {
        label: "Payroll Periods",
        permission: PERMISSIONS.hr.read,
        planned: true,
      },
      {
        label: "Income Tax Slabs",
        permission: PERMISSIONS.hr.read,
        planned: true,
      },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    icon: "finance",
    items: [
      {
        label: "Payments",
        href: "/admin/payments",
        permission: PERMISSIONS.sales.read,
      },
      {
        label: "Expenses",
        href: "/admin/expenses",
        permission: PERMISSIONS.expenses.read,
      },
      {
        label: "Expense Categories",
        href: "/admin/expenses/categories",
        permission: PERMISSIONS.expenses.read,
      },
      {
        label: "Receivables",
        permission: PERMISSIONS.sales.read,
        planned: true,
      },
      {
        label: "Payables",
        permission: PERMISSIONS.purchases.read,
        planned: true,
      },
      {
        label: "Financial Reports",
        permission: PERMISSIONS.reports.view,
        planned: true,
      },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    icon: "reports",
    items: [
      {
        label: "Reports",
        href: "/admin/reports",
        permission: PERMISSIONS.reports.view,
      },
      {
        label: "Sales Reports",
        permission: PERMISSIONS.reports.view,
        planned: true,
      },
      {
        label: "Product Reports",
        permission: PERMISSIONS.reports.view,
        planned: true,
      },
      {
        label: "Inventory Reports",
        permission: PERMISSIONS.reports.view,
        planned: true,
      },
      {
        label: "Customer Reports",
        permission: PERMISSIONS.reports.view,
        planned: true,
      },
      {
        label: "Purchasing Reports",
        permission: PERMISSIONS.reports.view,
        planned: true,
      },
      {
        label: "Expense Reports",
        permission: PERMISSIONS.reports.view,
        planned: true,
      },
      {
        label: "HR Reports",
        permission: PERMISSIONS.reports.view,
        planned: true,
      },
    ],
  },
  {
    id: "administration",
    title: "Administration",
    icon: "administration",
    items: [
      {
        label: "Staff",
        href: "/admin/staff",
        permission: PERMISSIONS.staff.manage,
      },
      {
        label: "Roles & Permissions",
        href: "/admin/roles",
        permission: PERMISSIONS.staff.manage,
      },
      {
        label: "Audit Log",
        permission: PERMISSIONS.audit.view,
        planned: true,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        permission: PERMISSIONS.settings.manage,
      },
    ],
  },
];

export function navigationForPermissions(
  permissions: Set<string>,
): AdminNavSection[] {
  return adminNavigation
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permission || permissions.has(item.permission),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * Find the nav item (and its module) that best matches a pathname.
 * The longest matching prefix wins; ties keep the first module so shared
 * hrefs (e.g. Payments under Sales and Finance) highlight consistently.
 */
export function findNavItem(
  pathname: string,
): { section: AdminNavSection; item: AdminNavItem } | null {
  let best: { section: AdminNavSection; item: AdminNavItem } | null = null;
  for (const section of adminNavigation) {
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