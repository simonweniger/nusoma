import 'server-only'
import { headers } from 'next/headers'
import { auth } from './auth'

// Server-side auth helpers
export async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  })
}
