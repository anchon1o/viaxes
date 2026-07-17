import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = 'https://shobtecipkqdojgnhelj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNob2J0ZWNpcGtxZG9qZ25oZWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMzU5NjksImV4cCI6MjA5OTgxMTk2OX0.zL4m95zP8p0a3jWxgG9SAavUL51MmLHUNgXlC237HP8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const usernameToEmail = u => `${u.trim().toLowerCase()}@viaxes.local`
