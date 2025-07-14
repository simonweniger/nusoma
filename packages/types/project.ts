import type { LucideIcon } from 'lucide-react'
import type { Agent } from '@/mock-data/agents'
import type { Priority } from './priority'
import type { Status } from './task'

export interface Health {
  id: 'no-update' | 'off-track' | 'on-track' | 'at-risk'
  name: string
  color: string
  description: string
}

export const health: Health[] = [
  {
    id: 'no-update',
    name: 'No Update',
    color: '#FF0000',
    description: 'The project has not been updated in the last 30 days.',
  },
  {
    id: 'off-track',
    name: 'Off Track',
    color: '#FF0000',
    description: 'The project is not on track and may be delayed.',
  },
  {
    id: 'on-track',
    name: 'On Track',
    color: '#00FF00',
    description: 'The project is on track and on schedule.',
  },
  {
    id: 'at-risk',
    name: 'At Risk',
    color: '#FF0000',
    description: 'The project is at risk and may be delayed.',
  },
]

export interface Project {
  id: string
  name: string
  status: Status
  icon: LucideIcon
  percentComplete: number
  startDate: string
  lead: Agent
  priority: Priority
  health: Health
}
