const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbspotuxpqkbqefhjfcc.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic3BvdHV4cHFrYnFlZmhqZmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc0Njk5OSwiZXhwIjoyMTAyMzIyOTk5fQ.b89stlSa7C2o54lkofmvgVqQ9rpwKjkE-gZ6NlVTFD0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkQuotations() {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .limit(5);
  console.log('quotations:', error ? error.message : data);
  
  const { data: data2, error: error2 } = await supabase
    .from('quotation_items')
    .select('*')
    .limit(5);
  console.log('quotation_items:', error2 ? error2.message : data2);
}

checkQuotations();
