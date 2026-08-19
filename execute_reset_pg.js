const { Client } = require('pg');
const dns = require('dns');

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

// Try session pooler with project ref in database name
const client = new Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres',
  password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic3BvdHV4cHFrYnFlZmhqZmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc0Njk5OSwiZXhwIjoyMTAyMzIyOTk5fQ.b89stlSa7C2o54lkofmvgVqQ9rpwKjkE-gZ6NlVTFD0',
  database: 'postgres?options=project%3Dfbspotuxpqkbqefhjfcc',
  ssl: { rejectUnauthorized: false },
  family: 4
});

async function executeReset() {
  try {
    await client.connect();
    console.log('Connected to database via session pooler\n');
    
    await client.query('BEGIN');
    console.log('Transaction started\n');
    
    const statements = [
      // Sales/Orders cascade
      { name: 'order_items', sql: 'DELETE FROM public.order_items' },
      { name: 'orders', sql: 'DELETE FROM public.orders' },
      
      // Deliveries
      { name: 'deliveries', sql: 'DELETE FROM public.deliveries' },
      
      // Payments
      { name: 'payments', sql: 'DELETE FROM public.payments' },
      
      // Returns & Refunds
      { name: 'return_items', sql: 'DELETE FROM public.return_items' },
      { name: 'returns', sql: 'DELETE FROM public.returns' },
      { name: 'refunds', sql: 'DELETE FROM public.refunds' },
      
      // Quotations
      { name: 'quotation_items', sql: 'DELETE FROM public.quotation_items' },
      { name: 'quotations', sql: 'DELETE FROM public.quotations' },
      
      // Inventory - Stock Movements
      { name: 'stock_movements', sql: 'DELETE FROM public.stock_movements' },
      
      // Inventory Items - Reset quantities to 0
      { name: 'inventory_items (reset)', sql: "UPDATE public.inventory_items SET quantity_on_hand = 0, reserved_quantity = 0, average_cost = 0, updated_at = now()" },
      
      // Stock Transfers
      { name: 'stock_transfer_items', sql: 'DELETE FROM public.stock_transfer_items' },
      { name: 'stock_transfers', sql: 'DELETE FROM public.stock_transfers' },
      
      // Stock Adjustments
      { name: 'stock_adjustment_items', sql: 'DELETE FROM public.stock_adjustment_items' },
      { name: 'stock_adjustments', sql: 'DELETE FROM public.stock_adjustments' },
      
      // Purchasing - Goods Receipts
      { name: 'goods_receipt_items', sql: 'DELETE FROM public.goods_receipt_items' },
      { name: 'goods_receipts', sql: 'DELETE FROM public.goods_receipts' },
      
      // Purchasing - Purchase Orders
      { name: 'purchase_order_items', sql: 'DELETE FROM public.purchase_order_items' },
      { name: 'purchase_orders', sql: 'DELETE FROM public.purchase_orders' },
      
      // Purchasing - Supplier Invoices & Payments
      { name: 'purchase_payments', sql: 'DELETE FROM public.purchase_payments' },
      { name: 'supplier_invoices', sql: 'DELETE FROM public.supplier_invoices' },
      
      // Expenses
      { name: 'expenses', sql: 'DELETE FROM public.expenses' },
      
      // Financial Transactions (if table exists)
      { name: 'financial_account_transactions', sql: 'DELETE FROM public.financial_account_transactions' },
      
      // Audit & Contact
      { name: 'audit_logs', sql: 'DELETE FROM public.audit_logs' },
      { name: 'contact_messages', sql: 'DELETE FROM public.contact_messages' },
    ];
    
    for (const stmt of statements) {
      try {
        const result = await client.query(stmt.sql);
        console.log(`✅ ${stmt.name}: ${result.rowCount} rows affected`);
      } catch (e) {
        console.error(`❌ ${stmt.name}: ${e.message}`);
      }
    }
    
    // Reset sequences
    console.log('\nResetting sequences...');
    const sequences = [
      'app.seq_so', 'app.seq_po', 'app.seq_gr', 'app.seq_ret', 
      'app.seq_rf', 'app.seq_trf', 'app.seq_adj', 'app.seq_exp'
    ];
    
    for (const seq of sequences) {
      try {
        await client.query(`SELECT setval('${seq}', 1, false)`);
        console.log(`✅ Sequence ${seq}`);
      } catch (e) {
        console.error(`❌ Sequence ${seq}: ${e.message}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('\nTransaction committed\n');
    
    // Verification
    await verifyReset();
    
  } catch (e) {
    console.error('Fatal error:', e.message);
    try {
      await client.query('ROLLBACK');
    } catch (rollError) {
      console.error('Rollback failed:', rollError.message);
    }
  } finally {
    await client.end();
  }
}

async function verifyReset() {
  const checks = [
    { name: 'customers', sql: 'SELECT count(*) as count FROM public.customers' },
    { name: 'orders', sql: 'SELECT count(*) as count FROM public.orders' },
    { name: 'order_items', sql: 'SELECT count(*) as count FROM public.order_items' },
    { name: 'payments', sql: 'SELECT count(*) as count FROM public.payments' },
    { name: 'refunds', sql: 'SELECT count(*) as count FROM public.refunds' },
    { name: 'quotations', sql: 'SELECT count(*) as count FROM public.quotations' },
    { name: 'quotation_items', sql: 'SELECT count(*) as count FROM public.quotation_items' },
    { name: 'returns', sql: 'SELECT count(*) as count FROM public.returns' },
    { name: 'return_items', sql: 'SELECT count(*) as count FROM public.return_items' },
    { name: 'stock_movements', sql: 'SELECT count(*) as count FROM public.stock_movements' },
    { name: 'stock_transfers', sql: 'SELECT count(*) as count FROM public.stock_transfers' },
    { name: 'stock_transfer_items', sql: 'SELECT count(*) as count FROM public.stock_transfer_items' },
    { name: 'stock_adjustments', sql: 'SELECT count(*) as count FROM public.stock_adjustments' },
    { name: 'stock_adjustment_items', sql: 'SELECT count(*) as count FROM public.stock_adjustment_items' },
    { name: 'purchase_orders', sql: 'SELECT count(*) as count FROM public.purchase_orders' },
    { name: 'purchase_order_items', sql: 'SELECT count(*) as count FROM public.purchase_order_items' },
    { name: 'goods_receipts', sql: 'SELECT count(*) as count FROM public.goods_receipts' },
    { name: 'goods_receipt_items', sql: 'SELECT count(*) as count FROM public.goods_receipt_items' },
    { name: 'supplier_invoices', sql: 'SELECT count(*) as count FROM public.supplier_invoices' },
    { name: 'purchase_payments', sql: 'SELECT count(*) as count FROM public.purchase_payments' },
    { name: 'expenses', sql: 'SELECT count(*) as count FROM public.expenses' },
    { name: 'audit_logs', sql: 'SELECT count(*) as count FROM public.audit_logs' },
    { name: 'contact_messages', sql: 'SELECT count(*) as count FROM public.contact_messages' },
    { name: 'inventory_items (with stock)', sql: "SELECT count(*) as count FROM public.inventory_items WHERE quantity_on_hand > 0" },
  ];
  
  console.log('VERIFICATION RESULTS:');
  console.log('=====================');
  
  for (const check of checks) {
    try {
      const result = await client.query(check.sql);
      console.log(`${check.name}: ${result.rows[0].count}`);
    } catch (e) {
      console.error(`❌ ${check.name}: ${e.message}`);
    }
  }
  
  // Master data verification
  console.log('\nMASTER DATA PRESERVED:');
  console.log('======================');
  
  const masterChecks = [
    { name: 'customers', sql: 'SELECT count(*) as count FROM public.customers' },
    { name: 'suppliers', sql: 'SELECT count(*) as count FROM public.suppliers' },
    { name: 'products', sql: 'SELECT count(*) as count FROM public.products' },
    { name: 'product_variants', sql: 'SELECT count(*) as count FROM public.product_variants' },
    { name: 'categories', sql: 'SELECT count(*) as count FROM public.categories' },
    { name: 'brands', sql: 'SELECT count(*) as count FROM public.brands' },
    { name: 'locations', sql: 'SELECT count(*) as count FROM public.locations' },
    { name: 'staff', sql: 'SELECT count(*) as count FROM public.staff' },
    { name: 'roles', sql: 'SELECT count(*) as count FROM public.roles' },
    { name: 'permissions', sql: 'SELECT count(*) as count FROM public.permissions' },
    { name: 'regions', sql: 'SELECT count(*) as count FROM public.regions' },
    { name: 'cities', sql: 'SELECT count(*) as count FROM public.cities' },
  ];
  
  for (const check of masterChecks) {
    try {
      const result = await client.query(check.sql);
      console.log(`${check.name}: ${result.rows[0].count}`);
    } catch (e) {
      console.error(`❌ ${check.name}: ${e.message}`);
    }
  }
}

executeReset();
