import type { SVGProps } from "react";

export type IconName =
  | "dashboard"
  | "orders"
  | "quotations"
  | "returns"
  | "customers"
  | "products"
  | "variants"
  | "stock"
  | "warehouses"
  | "transfers"
  | "adjustments"
  | "suppliers"
  | "purchase-orders"
  | "goods-receipts"
  | "invoices"
  | "payments"
  | "expenses"
  | "wallet"
  | "bank"
  | "mobile"
  | "cash"
  | "receivables"
  | "payables"
  | "reports"
  | "employees"
  | "departments"
  | "payroll"
  | "attendance"
  | "leave"
  | "admin"
  | "roles"
  | "settings"
  | "audit"
  | "search"
  | "bell"
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "menu"
  | "close"
  | "plus"
  | "download"
  | "filter"
  | "more-horizontal"
  | "user"
  | "logout"
  |   "alert"
  | "check"
  | "info"
  | "cancel"
  | "sparkle"
  | "home"
  | "eye"
  | "eye-off";

const paths: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  orders: (
    <>
      <path d="M6 2.5 3.6 6.5v13A2.5 2.5 0 0 0 6.1 22h11.8a2.5 2.5 0 0 0 2.5-2.5v-13L18 2.5Z" />
      <path d="M3.6 6.5h16.8" />
      <path d="M15.5 10a3.5 3.5 0 0 1-7 0" />
    </>
  ),
  quotations: (
    <>
      <path d="M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V7Z" />
      <path d="M14 2.5V7h4.5" />
      <path d="M8.5 12h7M8.5 15.5h7M8.5 8.5h2.5" />
    </>
  ),
  returns: (
    <>
      <path d="M3.5 8.5 2 4.5l4 1.5" />
      <path d="M2.5 4.5a9.5 9.5 0 1 1-1 7.2" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4" />
      <path d="M18.3 14.5a6.5 6.5 0 0 1 3.2 5.5" />
    </>
  ),
  products: (
    <>
      <path d="m12 2.5 8 4.5v9l-8 4.5-8-4.5v-9Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  variants: (
    <>
      <path d="m12 2.5 8 4.5v9l-8 4.5-8-4.5v-9Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
      <path d="M8.5 5.2 16.5 9.5" />
    </>
  ),
  stock: (
    <>
      <path d="M2.5 7.5 12 3l9.5 4.5v9L12 21l-9.5-4.5Z" />
      <path d="M2.5 7.5 12 12l9.5-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  warehouses: (
    <>
      <path d="M3 21V9l9-5.5L21 9v12" />
      <path d="M3 21h18" />
      <path d="M9 21v-5h6v5" />
    </>
  ),
  transfers: (
    <>
      <path d="M4 12h12" />
      <path d="m13 8 4 4-4 4" />
      <path d="M20 5v14" />
    </>
  ),
  adjustments: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  suppliers: (
    <>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h10A1.5 1.5 0 0 1 16 6.5V12h3.2l2.3 3.2v3.3h-2.4" />
      <path d="M16 15H6.5" />
      <path d="M6.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M19 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </>
  ),
  "purchase-orders": (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="1.5" />
      <path d="M8.5 7.5h7M8.5 11.5h7M8.5 15.5h4" />
    </>
  ),
  "goods-receipts": (
    <>
      <path d="M4 4h16v11.5L17 18H7l-3-2.5Z" />
      <path d="M4 4 7 8h10l3-4" />
      <path d="M12 8v7" />
    </>
  ),
  invoices: (
    <>
      <path d="M6 2.5h9L19.5 7V21a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" />
      <path d="M14 2.5V7h5" />
      <path d="M8.5 12h7M8.5 15.5h7" />
    </>
  ),
  payments: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 9.5h19" />
      <path d="M6.5 15h4" />
    </>
  ),
  expenses: (
    <>
      <path d="M20.5 7.5 12 21H6.5L3 7.5" />
      <path d="m3 7.5 3 4 3.5-5 3.5 5 3.5-6.5" />
      <path d="M20.5 7.5h-2" />
    </>
  ),
wallet: (
    <>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h13a1.5 1.5 0 0 1 1.5 1.5V8" />
      <path d="M3.5 6.5V17A2 2 0 0 0 5.5 19h13a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2H6" />
      <path d="M16 13.75h.01" />
    </>
  ),
  bank: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 9.5V17M9.5 9.5V17M14.5 9.5V17M19 9.5V17" />
      <path d="M3 17.5h18" />
      <path d="M3 20.5h18" />
    </>
  ),
  mobile: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  cash: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5h.01M17.5 14.5h.01" />
    </>
  ),
  receivables: (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 11 4.5 4 4.5-4" />
      <path d="M4 20h16" />
    </>
  ),
  payables: (
    <>
      <path d="M12 15V4" />
      <path d="m7.5 8 4.5-4 4.5 4" />
      <path d="M4 20h16" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20.5V10M10 20.5V4M16 20.5v-8M21 20.5H3" />
    </>
  ),
  employees: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  departments: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M3 12.5h18" />
    </>
  ),
  payroll: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 6 3.5 3.5M18 6l2.5-2.5" />
    </>
  ),
  attendance: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  leave: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10.5h17" />
      <path d="M8 14.5h8" />
    </>
  ),
  admin: (
    <>
      <path d="M12 2.5 20 6v6c0 4.8-3.4 8.3-8 9.5-4.6-1.2-8-4.7-8-9.5V6Z" />
      <path d="M12 10.5a2 2 0 1 0 0 .1" />
      <path d="M10.2 13.5h3.6l-.8 3h-2Z" />
    </>
  ),
  roles: (
    <>
      <circle cx="8" cy="14.5" r="4.5" />
      <path d="m11.5 11 8-8M16.5 6l2.5 2.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.29 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.27.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.97Z" />
    </>
  ),
  audit: (
    <>
      <path d="M6 2.5h9L19.5 7V21a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" />
      <path d="M14 2.5V7h5" />
      <path d="M8.5 11h7M8.5 14.5h5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 5 1.5 6.5 1.5 6.5h-15S6 14.5 6 9.5Z" />
      <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  download: (
    <>
      <path d="M12 3.5V15" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4 20.5h16" />
    </>
  ),
  filter: (
    <>
      <path d="M3.5 5h17l-6.5 7.5v6l-4 2v-8Z" />
    </>
  ),
  "more-horizontal": (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H9" />
      <path d="m15 16 4-4-4-4" />
      <path d="M19 12H9" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 21.5 20h-19Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17.3" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  check: (
    <>
      <path d="m4.5 12.5 5 5 10-11" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.8" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  cancel: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5c.8 3.7 2.6 5.7 6.5 6.5-3.9.8-5.7 2.8-6.5 6.5-.8-3.7-2.6-5.7-6.5-6.5 3.9-.8 5.7-2.8 6.5-6.5Z" />
      <path d="M18.5 15c.4 1.7 1.2 2.6 2.7 3-1.5.4-2.3 1.3-2.7 3-.4-1.7-1.2-2.6-2.7-3 1.5-.4 2.3-1.3 2.7-3Z" />
    </>
  ),
  home: (
    <>
      <path d="m3.5 11 8.5-7.5L20.5 11" />
      <path d="M5.5 9.5V20h13V9.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M4 4.5 20 19.5" />
      <path d="M10.4 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.4 17.4 0 0 1-3 3.9" />
      <path d="M6.4 8.6A16.9 16.9 0 0 0 2.5 12s3.5 6 9.5 6a9.2 9.2 0 0 0 3.6-.7" />
      <path d="M9.9 9.9a2.8 2.8 0 0 0 4 4" />
    </>
  ),
};

export type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 16, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}