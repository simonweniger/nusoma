import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const keys = () =>
  createEnv({
    server: {
      DATABASE_URL: z.string().url(),
    },
    client: {
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  })
