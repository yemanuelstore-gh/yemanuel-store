import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fbspotuxpqkbqefhjfcc.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic3BvdHV4cHFrYnFlZmhqZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDY5OTksImV4cCI6MjEwMjMyMjk5OX0.xszrkVtDfuJBAL6_M8xN1c8FI2gVjkrZll7jz0vTYQo';

const supabase = createClient(supabaseUrl, anonKey);

async function testLogin() {
  console.log('Testing login with owner@yemanuelstore.com / Yemanuel@Owner2026');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'owner@yemanuelstore.com',
    password: 'Yemanuel@Owner2026',
  });
  
  if (error) {
    console.error('Login error:', error);
  } else {
    console.log('Login success:', data.user?.id, data.user?.email);
  }
}

testLogin();