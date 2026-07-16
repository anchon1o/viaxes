import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Faltan as variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Revisa o ficheiro .env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Convención igual á de Caderno de Aula: usuario -> email interno
export const usernameToEmail = (username) =>
  `${username.trim().toLowerCase()}@viaxes.local`
