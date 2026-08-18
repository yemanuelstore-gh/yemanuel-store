import { PERMISSIONS } from "@/lib/admin/permissions";

export type AdminNavItem = {
  label: string;
  href?: string;
  permission?: string;
  /** Icon key resolved by the client shell (see nav-icons in app-shell). */
  icon?: string;
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
    id: "overview",
    title: "Overview",
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
        label: "Returns",
        href: "/admin/returns",
        permission: PERMISSIONS.sales.read,
      },
      {
        label: "Quotations",
        href: "/admin/quotations",
        permission: PERMISSIONS.sales.read,
      },
    ],
  },
  {
    id: "customers",
    title: "Customers",
    icon: "customers",
    items: [
      {
        label: "Customers",
        href: "/admin/customers",
        permission: PERMISSIONS.customers.read,
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
    id: "inventory",
    title: "Inventory",
    icon: "inventory",
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
        href: "/admin/products/variants",
        permission: PERMISSIONS.products.read,
      },
      {
        label: "Barcodes",
        href: "/admin/products/barcodes",
        permission: PERMISSIONS.products.read,
      },
      {
        label: "Price Lists",
        href: "/admin/products/prices",
        permission: PERMISSIONS.products.read,
      },
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
        href: "/admin/inventory/locations",
        permission: PERMISSIONS.inventory.read,
      },
      {
        label: "Low Stock",
        href: "/admin/inventory/low-stock",
        permission: PERMISSIONS.inventory.read,
      },
      {
        label: "Stock Valuation",
        href: "/admin/inventory/valuation",
        permission: PERMISSIONS.inventory.read,
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
        icon: "payments",
      },
      {
        label: "Expenses",
        href: "/admin/expenses",
        permission: PERMISSIONS.expenses.read,
        icon: "expenses",
      },
      {
        label: "Expense Categories",
        href: "/admin/expenses/categories",
        permission: PERMISSIONS.expenses.read,
        icon: "expense-categories",
      },
      {
        label: "Bank Accounts",
        href: "/admin/bank-accounts",
        permission: PERMISSIONS.expenses.read,
        icon: "bank-accounts",
      },
      {
        label: "Mobile Money Accounts",
        href: "/admin/mobile-money",
        permission: PERMISSIONS.expenses.read,
        icon: "mobile-money",
      },
      {
        label: "Receivables",
        href: "/admin/receivables",
        permission: PERMISSIONS.sales.read,
      },
      {
        label: "Payables",
        href: "/admin/payables",
        permission: PERMISSIONS.purchases.read,
      },
      {
        label: "Financial Reports",
        href: "/admin/reports/financial",
        permission: PERMISSIONS.reports.view,
      },
    ],
  },
  {
    id: "hr",
    title: "Human Resources",
    icon: "hr",
    items: [
      {
        label: "Employees",
        href: "/admin/hr/employees",
        permission: PERMISSIONS.hr.read,
        icon: "employees",
      },
      {
        label: "Departments",
        href: "/admin/hr/departments",
        permission: PERMISSIONS.hr.read,
        icon: "departments",
      },
      {
        label: "Salary Components",
        href: "/admin/hr/salary-components",
        permission: PERMISSIONS.hr.read,
        icon: "salary-components",
      },
      {
        label: "Salary Structures",
        href: "/admin/hr/salary-structures",
        permission: PERMISSIONS.hr.read,
        icon: "salary-structures",
      },
      {
        label: "Payroll Periods",
        href: "/admin/hr/payroll-periods",
        permission: PERMISSIONS.hr.read,
        icon: "payroll-periods",
      },
      {
        label: "Income Tax Slabs",
        href: "/admin/hr/tax-slabs",
        permission: PERMISSIONS.hr.read,
        icon: "tax-slabs",
      },
      { label: "Attendance", permission: PERMISSIONS.hr.read, planned: true },
      { label: "Leave", permission: PERMISSIONS.hr.read, planned: true },
      { label: "Payroll", permission: PERMISSIONS.hr.read, planned: true },
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
        href: "/admin/reports/sales",
        permission: PERMISSIONS.reports.view,
      },
      {
        label: "Product Reports",
        href: "/admin/reports/products",
        permission: PERMISSIONS.reports.view,
      },
      {
        label: "Inventory Reports",
        href: "/admin/reports/inventory",
        permission: PERMISSIONS.reports.view,
      },
      {
        label: "Customer Reports",
        href: "/admin/reports/customers",
        permission: PERMISSIONS.reports.view,
      },
      {
        label: "Purchasing Reports",
        href: "/admin/reports/purchasing",
        permission: PERMISSIONS.reports.view,
      },
      {
        label: "Expense Reports",
        href: "/admin/reports/expenses",
        permission: PERMISSIONS.reports.view,
      },
      {
        label: "HR Reports",
        href: "/admin/reports/hr",
        permission: PERMISSIONS.reports.view,
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
