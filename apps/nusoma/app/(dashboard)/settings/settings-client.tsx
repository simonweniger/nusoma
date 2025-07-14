'use client'

import type { ReactNode } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Layers,
  LifeBuoy,
  Package,
} from 'lucide-react'
import { SiSlack, SiTablecheck } from 'react-icons/si'
import { Credentials } from './components/credentials'

interface Feature {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  activated?: boolean
  teamsActivated?: number
}

interface Integration {
  icon: ReactNode
  title: string
  description: string
  enabled?: boolean
  actionLabel: string
}

interface Guide {
  icon: ReactNode
  iconBg: string
  iconColor: string
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: <LifeBuoy className='' size={20} />,
    title: 'Customer requests',
    description: "Track and manage customer requests alongside your team's work",
    actionLabel: 'Try Customer requests',
  },
  {
    icon: <SiTablecheck className='' size={20} />,
    title: 'Initiatives',
    description: 'Plan strategic product work and monitor progress at scale',
    actionLabel: 'Learn more',
    activated: true,
  },
  {
    icon: <Package className='' size={20} />,
    title: 'Cycles',
    description: "Track your team's workload and velocity with Cycles",
    actionLabel: 'Learn more',
    teamsActivated: 6,
  },
  {
    icon: <BarChart3 className='' size={20} />,
    title: 'Views',
    description: 'Create filtered views that you can save and share with others',
    actionLabel: 'Open views',
  },
  {
    icon: <Layers className='' size={20} />,
    title: 'Triage',
    description:
      'Prioritize issues created from multiple your team and customer support integrations',
    actionLabel: 'Learn more',
    teamsActivated: 4,
  },
]

const guides: Guide[] = [
  {
    icon: <BookOpen size={20} />,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Start guide',
    description: 'Quick tips for beginners',
  },
  {
    icon: <FileText size={20} />,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    title: 'Feature guide',
    description: 'How Linear works',
  },
  {
    icon: <GraduationCap size={20} />,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    title: 'Linear method',
    description: 'Best practices for building',
  },
  {
    icon: <SiSlack size={20} />,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Join our Slack community',
    description: 'Ask questions and meet others',
  },
]

const FeatureCard = ({ feature }: { feature: Feature }) => {
  return (
    <div className='flex h-full flex-col rounded-lg border bg-card p-5'>
      <div className='mb-3 flex items-start gap-4'>
        {feature.icon}
        <div className='flex-1'>
          <h3 className='font-medium text-card-foreground'>{feature.title}</h3>
          <p className='mt-1 text-muted-foreground text-sm'>{feature.description}</p>
        </div>
      </div>
      <div className='mt-auto flex items-center gap-3'>
        {feature.activated && (
          <div className='flex items-center gap-1 text-muted-foreground text-xs'>
            <div className='h-2 w-2 rounded-full bg-green-500' />
            <span>Activated</span>
          </div>
        )}
        {feature.teamsActivated && (
          <div className='flex items-center gap-1 text-muted-foreground text-xs'>
            <CheckCircle2 size={14} />
            <span>{feature.teamsActivated} teams activated</span>
          </div>
        )}
      </div>
    </div>
  )
}

const GuideCard = ({ guide }: { guide: Guide }) => {
  return (
    <div className='flex items-start gap-3 rounded-lg border bg-card p-5'>
      <div className='shrink-0'>{guide.icon}</div>
      <div className='-mt-1 w-full'>
        <h3 className='font-medium text-card-foreground text-sm'>{guide.title}</h3>
        <p className='mt-1 line-clamp-1 text-muted-foreground text-xs'>{guide.description}</p>
      </div>
      <Button variant='ghost' size='icon' className='shrink-0'>
        <ArrowRight size={16} />
      </Button>
    </div>
  )
}

export default function Settings() {
  return (
    <div className='mx-auto w-full max-w-7xl px-8 py-8'>
      <div className='mb-10'>
        <h1 className='mb-1 font-semibold text-2xl'>Workspace</h1>
        <p className='text-muted-foreground'>
          Manage your workspace settings. Your workspace is in the{' '}
          <span className='font-medium'>United States</span> region
        </p>
      </div>

      <div className='mb-10'>
        <Credentials />
      </div>

      <div className='mb-10'>
        <div className='mb-6 flex items-center justify-between'>
          <h2 className='font-semibold text-xl'>Explore features</h2>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>

      <div className='mb-10'>
        <div className='mb-6 flex items-center justify-between'>
          <h2 className='font-semibold text-xl'>Go further</h2>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {guides.map((guide, index) => (
            <GuideCard key={index} guide={guide} />
          ))}
        </div>
      </div>
    </div>
  )
}
