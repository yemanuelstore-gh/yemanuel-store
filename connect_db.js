const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbspotuxpqkbqefhjfcc.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic3BvdHV4cHFrYnFlZmhqZmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc0Njk5OSwiZXhwIjoyMTAyMzIyOTk5fQ.b89stlSa7C2o54lkofmvgVqQ9rpwKjkE-gZ6NlVTFD0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function getRowCounts() {
  const tables = [
    'profiles', 'permissions', 'roles', 'role_permissions', 'staff', 'staff_roles',
    'regions', 'cities', 'customers', 'customer_addresses', 'locations',
    'categories', 'brands', 'products', 'product_variants', 'product_images', 'prices', 'settings',
    'inventory_items', 'stock_movements', 'stock_transfers', 'stock_transfer_items',
    'stock_adjustments', 'stock_adjustment_items',
    'suppliers', 'supplier_contacts', 'supplier_addresses', 'supplier_products',
    'purchase_orders', 'purchase_order_items',
    'goods_receipts', 'goods_receipt_items',
    'supplier_invoices', 'purchase_payments',
    'orders', 'order_items', 'delivery_methods', 'deliveries',
    'payments',
    'returns', 'return_items', 'refunds',
    'expense_categories', 'expenses',
    'audit_logs', 'contact_messages',
    'financial_accounts', 'financial_account_transactions'
  ];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`${table}: ERROR - ${error.message}`);
    } else {
      console.log(`${table}: ${count}`);
    }
  }
}

getRowCounts();
