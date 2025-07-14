import { NextResponse } from 'next/server'
import { getProfile } from '@/data/account/get-profile'

export async function GET() {
  try {
    const profile = await getProfile()
    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
