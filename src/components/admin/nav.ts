import type { IconName } from "@/components/ui/icons";

export type ErpNavItem = {
  label: string;
  href: string;
  icon: IconName;
};

export type ErpNavGroup = {
  label: string;
  items: ErpNavItem[];
};

export const erpNavGroups: ErpNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: "dashboard" }],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: "orders" },
      { label: "Quotations", href: "/admin/quotations", icon: "quotations" },
      { label: "Returns", href: "/admin/returns", icon: "returns" },
      { label: "Customers", href: "/admin/customers", icon: "customers" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Products", href: "/admin/products", icon: "products" },
      { label: "Variants", href: "/admin/variants", icon: "variants" },
      { label: "Stock", href: "/admin/stock", icon: "stock" },
      { label: "Warehouses", href: "/admin/warehouses", icon: "warehouses" },
      { label: "Transfers", href: "/admin/inventory/transfers", icon: "transfers" },
      { label: "Adjustments", href: "/admin/inventory/adjustments", icon: "adjustments" },
    ],
  },
  {
    label: "Purchasing",
    items: [
      { label: "Suppliers", href: "/admin/suppliers", icon: "suppliers" },
      { label: "Purchase Orders", href: "/admin/purchases", icon: "purchase-orders" },
      { label: "Goods Receipts", href: "/admin/purchases/receipts", icon: "goods-receipts" },
      { label: "Supplier Invoices", href: "/admin/purchases/invoices", icon: "invoices" },
      { label: "Payments", href: "/admin/purchases/payments", icon: "payments" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Payments", href: "/admin/payments", icon: "payments" },
      { label: "Expenses", href: "/admin/expenses", icon: "expenses" },
      { label: "Receivables", href: "/admin/receivables", icon: "receivables" },
      { label: "Payables", href: "/admin/payables", icon: "payables" },
      { label: "Reports", href: "/admin/finance/reports", icon: "reports" },
    ],
  },
  {
    label: "Human Resources",
    items: [
      { label: "Employees", href: "/admin/hr/employees", icon: "employees" },
      { label: "Departments", href: "/admin/hr/departments", icon: "departments" },
      { label: "Payroll", href: "/admin/hr/payroll", icon: "payroll" },
      { label: "Attendance", href: "/admin/hr/attendance", icon: "attendance" },
      { label: "Leave", href: "/admin/hr/leave", icon: "leave" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Sales", href: "/admin/reports/sales", icon: "reports" },
      { label: "Inventory", href: "/admin/reports/inventory", icon: "stock" },
      { label: "Purchasing", href: "/admin/reports/purchasing", icon: "suppliers" },
      { label: "Finance", href: "/admin/reports/finance", icon: "payments" },
      { label: "Customers", href: "/admin/reports/customers", icon: "customers" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/admin/users", icon: "admin" },
      { label: "Roles & Permissions", href: "/admin/roles", icon: "roles" },
      { label: "Settings", href: "/admin/settings", icon: "settings" },
      { label: "Audit Log", href: "/admin/audit", icon: "audit" },
    ],
  },
];