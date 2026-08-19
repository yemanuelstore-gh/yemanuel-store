const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbspotuxpqkbqefhjfcc.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic3BvdHV4cHFrYnFlZmhqZmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc0Njk5OSwiZXhwIjoyMTAyMzIyOTk5fQ.b89stlSa7C2o54lkofmvgVqQ9rpwKjkE-gZ6NlVTFD0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAllTables() {
  // Query information_schema
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE')
    .order('table_name');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Tables in public schema:');
  data.forEach(t => console.log(`  ${t.table_name}`));
}

checkAllTables();
