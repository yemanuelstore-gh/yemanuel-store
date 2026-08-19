import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fbspotuxpqkbqefhjfcc.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic3BvdHV4cHFrYnFlZmhqZmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc0Njk5OSwiZXhwIjoyMTAyMzIyOTk5fQ.b89stlSa7C2o54lkofmvgVqQ9rpwKjkE-gZ6NlVTFD0';

const supabase = createClient(supabaseUrl, serviceKey);

async function resetAuthUser() {
  console.log('Getting user...');
  
  // Get user by email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('List users error:', listError);
    return;
  }
  
  const user = users.users.find(u => u.email === 'barimasikapa@gmail.com');
  
  if (user) {
    console.log('Found user:', user.id);
    
    // Delete user
    console.log('Deleting user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Delete error:', deleteError);
      return;
    }
    console.log('User deleted');
  } else {
    console.log('User not found');
  }
  
  // Create new user
  console.log('Creating new user...');
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: 'barimasikapa@gmail.com',
    password: 'Ohemaadavina2015',
    email_confirm: true,
    user_metadata: {
      full_name: 'Barima Sikapa',
      name: 'Barima Sikapa'
    }
  });
  
  if (createError) {
    console.error('Create error:', createError);
    return;
  }
  
  console.log('User created:', newUser.user?.id, newUser.user?.email);
  
  // Test login
  console.log('Testing login...');
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic3BvdHV4cHFrYnFlZmhqZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDY5OTksImV4cCI6MjEwMjMyMjk5OX0.xszrkVtDfuJBAL6_M8xN1c8FI2gVjkrZll7jz0vTYQo';
  const testClient = createClient(supabaseUrl, anonKey);
  
  const { data, error } = await testClient.auth.signInWithPassword({
    email: 'barimasikapa@gmail.com',
    password: 'Ohemaadavina2015',
  });
  
  if (error) {
    console.error('Login test error:', error);
  } else {
    console.log('Login test success:', data.user?.id, data.user?.email);
  }
}

resetAuthUser();