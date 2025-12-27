import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://wgaqzlndzosfymtgozbj.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYXF6bG5kem9zZnltdGdvemJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NTc2NzAsImV4cCI6MjA4MjMzMzY3MH0.pZsM50drABzI9kx-Zl6Fq6qpVICAwb1zZyxfEelnvBc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);