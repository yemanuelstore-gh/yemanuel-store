-- HR module: department master data seed.
--
-- Inserts the standard Yemanuel Store departments into public.departments.
-- Idempotent: existing departments are preserved untouched (no update),
-- and only missing department names are inserted. The unique constraint on
-- departments.name guarantees no duplicates.
--
-- Departments have a unique name, optional description and is_active flag
-- (defaults to true). No employees or other HR/payroll records are touched.

set search_path = public, extensions;

insert into public.departments (name, description)
values
  ('Management', 'Executive leadership, strategic direction and governance'),
  ('Finance & Accounts', 'Financial accounting, reporting, budgeting and cash management'),
  ('Human Resources & Administration', 'Recruitment, staff welfare, records and general office administration'),
  ('Sales', 'Storefront and wholesale sales, revenue generation and customer acquisition'),
  ('Customer Service', 'Customer support, enquiries and after-sales service'),
  ('Warehouse & Inventory', 'Stock control, warehousing and inventory reconciliation'),
  ('Procurement & Purchasing', 'Sourcing, supplier management and purchase orders'),
  ('Logistics & Delivery', 'Order fulfilment, dispatch and last-mile delivery'),
  ('Information Technology', 'Systems, software and IT infrastructure support'),
  ('Operations', 'Daily store operations, process coordination and performance'),
  ('Security', 'Premises, personnel and asset security'),
  ('Facilities & Cleaning', 'Facility upkeep, maintenance and cleaning')
on conflict (name) do nothing;
