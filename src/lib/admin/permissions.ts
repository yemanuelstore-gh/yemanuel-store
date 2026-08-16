export const PERMISSIONS = {
  products: {
    read: "products.read",
    create: "products.create",
    update: "products.update",
  },
  inventory: {
    read: "inventory.read",
    create: "inventory.create",
    update: "inventory.update",
    adjust: "inventory.adjust",
  },
  customers: {
    read: "customers.read",
    create: "customers.create",
    update: "customers.update",
  },
  suppliers: {
    read: "suppliers.read",
    create: "suppliers.create",
    update: "suppliers.update",
  },
  purchases: {
    read: "purchases.read",
    create: "purchases.create",
    update: "purchases.update",
  },
  sales: {
    read: "sales.read",
    create: "sales.create",
    update: "sales.update",
    refund: "sales.refund",
  },
  expenses: {
    read: "expenses.read",
    create: "expenses.create",
    update: "expenses.update",
  },
  settings: { manage: "settings.manage" },
  staff: { manage: "staff.manage" },
  reports: { view: "reports.view" },
  audit: { view: "audit.view" },
} as const;