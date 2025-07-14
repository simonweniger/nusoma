import type { Config } from 'drizzle-kit'
import { keys } from './keys'

export default {
  schema: './schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: keys().DATABASE_URL,
  },
} satisfies Config
