# Yemanuel Store

## Project Overview

Yemanuel Store is a modern Ghanaian e-commerce website and integrated store management system.

The system has two primary experiences:

1. Customer-facing e-commerce storefront
2. Internal store management application

The goal is to operate the complete retail business from one application.

## Technology Foundation

- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS
- Supabase/PostgreSQL
- Supabase Authentication
- Vercel deployment

## Primary Currency

Ghanaian Cedi (GHS / GH₵).

## Customer Storefront

The storefront will eventually include:

- Home
- Shop
- Product categories
- Product search
- Product filtering
- Product details
- Product variants
- Shopping cart
- Checkout
- Customer registration/login
- Customer account
- Order history
- Order tracking
- Addresses
- Contact/support

## Store Management

The management application will eventually include:

### Dashboard
- Sales overview
- Orders
- Revenue
- Customers
- Inventory
- Low-stock products
- Recent activity

### Products
- Product catalogue
- Product creation
- Product editing
- Product images
- Product variants
- Pricing
- Cost price
- Selling price
- Stock settings
- Product status

### Categories
- Product categories
- Subcategories
- Category images
- Category status

### Inventory
- Stock levels
- Stock adjustments
- Stock movements
- Stock transfers
- Low-stock alerts
- Inventory valuation

### Customers
- Customer records
- Contact information
- Addresses
- Order history
- Customer status

### Orders
- Order management
- Order items
- Order status
- Payment status
- Fulfilment status
- Customer information
- Order history

### Sales
- Sales records
- Revenue
- Discounts
- Taxes where applicable
- Returns/refunds

### Payments
- Payment records
- Payment methods
- Payment status
- Transaction references

### Suppliers
- Supplier records
- Supplier contacts
- Supplier products

### Purchases
- Purchase orders
- Purchase items
- Receiving
- Purchase costs

### Expenses
- Business expenses
- Expense categories
- Expense records
- Reporting

### Reports
- Sales reports
- Revenue reports
- Product reports
- Inventory reports
- Customer reports
- Purchase reports
- Expense reports
- Profitability reports

### Staff and Permissions
- Staff users
- Roles
- Permissions
- Access control

### Settings
- Store profile
- Business information
- Currency
- Payment configuration
- Delivery configuration
- Notification settings
- System settings

## Ghana Requirements

The application should support:

- GHS currency
- Ghanaian phone numbers
- Ghanaian addresses
- Ghanaian cities and regions
- Local delivery operations
- Multiple payment methods
- Mobile money integrations in a later phase
- Cash payments where appropriate

## UI Principles

The storefront should be modern, clean, responsive and conversion-focused.

The management application should use a compact ERP-style interface.

Management UI should prioritize:

- Information density
- Clear tables
- Compact forms
- Consistent spacing
- Clear navigation
- Fast workflows
- Responsive layouts
- Desktop-first management workflows with mobile support

Do not introduce unnecessarily oversized typography or excessive whitespace in management pages.

## Development Principles

- TypeScript strictness should be preserved.
- Avoid unnecessary dependencies.
- Keep components reusable.
- Keep business logic out of presentation components where practical.
- Validate user input.
- Never expose secrets to the client.
- Use server-side operations for privileged database operations.
- Protect management routes with authentication and authorization.
- Database migrations must be version-controlled.
- Do not modify unrelated functionality when implementing a feature.
- Run lint/build checks after significant changes.

## Development Workflow

ChatGPT is used for:

- Architecture
- Planning
- Technical decisions
- Code review
- Debugging
- Feature specifications

OpenCode is used for:

- Repository inspection
- File creation
- Implementation
- Refactoring
- Running commands
- Testing
- Build verification

All implementation should follow this specification.
