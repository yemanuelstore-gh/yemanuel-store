const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbspotuxpqkbqefhjfcc.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic3BvdHV4cHFrYnFlZmhqZmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc0Njk5OSwiZXhwIjoyMTAyMzIyOTk5fQ.b89stlSa7C2o54lkofmvgVqQ9rpwKjkE-gZ6NlVTFD0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTables() {
  // Check financial_accounts
  const { data, error } = await supabase
    .from('financial_accounts')
    .select('id')
    .limit(1);
  console.log('financial_accounts:', error ? error.message : 'exists, count:', data?.length);
  
  const { data: data2, error: error2 } = await supabase
    .from('financial_account_transactions')
    .select('id')
    .limit(1);
  console.log('financial_account_transactions:', error2 ? error2.message : 'exists, count:', data2?.length);
  
  // Also check quotations
  const { data: data3, error: error3 } = await supabase
    .from('quotations')
    .select('id')
    .limit(1);
  console.log('quotations:', error3 ? error3.message : 'exists, count:', data3?.length);
}

checkTables();
