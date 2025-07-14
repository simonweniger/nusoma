import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { keys } from './keys'

const connectionString = keys().DATABASE_URL

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, {
  prepare: false,
  idle_timeout: 30, // Keep connections alive for 30 seconds when idle
  connect_timeout: 30, // Timeout after 30 seconds when connecting
})

// Export the database client (never null)
export const db = drizzle(client)

export * from 'drizzle-orm'
