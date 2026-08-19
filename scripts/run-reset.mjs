import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://fbspotuxpqkbqefhjfcc.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic3BvdHV4cHFrYnFlZmhqZmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc0Njk5OSwiZXhwIjoyMTAyMzIyOTk5fQ.b89stlSa7C2o54lkofmvgVqQ9rpwKjkE-gZ6NlVTFD0';

const supabase = createClient(supabaseUrl, serviceKey);

const sql = readFileSync('./reset_erp.sql', 'utf-8');

async function runReset() {
  console.log('Running ERP reset...');
  
  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    console.log(`Executing: ${stmt.substring(0, 80)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
    if (error) {
      console.error('Error:', error);
    }
  }
  
  console.log('Reset complete');
}

runReset().catch(console.error);