import type { Metadata } from 'next/types'
import Settings from './settings-client'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your workspace settings',
}

export default function SettingsPage() {
  return <Settings />
}
