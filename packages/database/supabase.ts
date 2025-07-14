import { createClient } from '@supabase/supabase-js'
import { keys } from './keys'

export const supabase = createClient(
  keys().NEXT_PUBLIC_SUPABASE_URL!,
  keys().NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
