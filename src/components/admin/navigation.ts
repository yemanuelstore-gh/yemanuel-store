import { PERMISSIONS } from "@/lib/admin/permissions";

export type AdminNavItem = {
  label: string;
  href: string;
  permission?: string;
};

export type AdminNavSection = {
  title: string;
  items: AdminNavItem[];
};

export const adminNavigation: AdminNavSection[] = [
  {
    title: "Dashboard",
    items: [{ label: "Dashboard", href: "/admin" }],
  },
  {
    title: "Catalogue",
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
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        label: "Inventory",
        href: "/admin/inventory",
        permission: PERMISSIONS.inventory.read,
      },
      {
        label: "Stock Movements",
        href: "/admin/inventory/movements",
        permission: PERMISSIONS.inventory.read,
      },
      {
        label: "Transfers",
        href: "/admin/inventory/transfers",
        permission: PERMISSIONS.inventory.read,
      },
      {
        label: "Adjustments",
        href: "/admin/inventory/adjustments",
        permission: PERMISSIONS.inventory.read,
      },
    ],
  },
  {
    title: "Sales",
    items: [
      {
        label: "Orders",
        href: "/admin/orders",
        permission: PERMISSIONS.sales.read,
      },
      {
        label: "Payments",
        href: "/admin/payments",
        permission: PERMISSIONS.sales.read,
      },
      {
        label: "Returns",
        href: "/admin/returns",
        permission: PERMISSIONS.sales.read,
      },
      {
        label: "Refunds",
        href: "/admin/refunds",
        permission: PERMISSIONS.sales.read,
      },
    ],
  },
  {
    title: "Customers",
    items: [
      {
        label: "Customers",
        href: "/admin/customers",
        permission: PERMISSIONS.customers.read,
      },
    ],
  },
  {
    title: "Purchasing",
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
    title: "Finance",
    items: [
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
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", href: "/admin/reports", permission: PERMISSIONS.reports.view },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings", href: "/admin/settings", permission: PERMISSIONS.settings.manage },
      { label: "Search", href: "/admin/search" },
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

export function findNavItem(pathname: string): { section: AdminNavSection; item: AdminNavItem } | null {
  for (const section of adminNavigation) {
    for (const item of section.items) {
      if (pathname === item.href) return { section, item };
    }
  }
  return null;
}