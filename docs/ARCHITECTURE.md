# Yemanuel Store Architecture

## Application

Yemanuel Store is a single Next.js application containing a public e-commerce storefront, customer accounts, and an authenticated store management system.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- Supabase Authentication
- Vercel

## Main Areas

- Storefront
- Customer Accounts
- Products
- Categories
- Inventory
- Customers
- Orders
- Sales
- Payments
- Suppliers
- Purchases
- Expenses
- Reports
- Staff and Permissions
- Settings

## Routes

Public storefront: src/app/(storefront)/

Authentication: src/app/(auth)/

Customer account: src/app/account/

Management: src/app/admin/

## UI

The storefront should be modern, responsive, and conversion-focused.

The management interface should use compact ERP-style typography, dense readable tables, compact forms, clear navigation, and minimal unnecessary whitespace.

## Security

Management routes require authentication and authorization. Customer data must not be publicly accessible. Secrets must remain server-side. Database changes must use migrations.

## Development

Build the system incrementally. Keep the production build healthy. Inspect existing code before making changes. Run lint and build after meaningful implementation.

OpenCode must read AGENTS.md, PROJECT_SPEC.md, and this file before substantial implementation.
