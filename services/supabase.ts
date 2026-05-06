
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = "https://irqaaetqdhsksdqultzg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycWFhZXRxZGhza3NkcXVsdHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mjk2NzcsImV4cCI6MjA5MzMwNTY3N30.p5jz_M2plKIqCTib70QdSCJVr8MW3L2qW88SUsc3fg0";


export const supabase = createClient(supabaseUrl, supabaseAnonKey)

