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
import {
  SiFigma,
  SiGithub,
  SiGitlab,
  SiGooglesheets,
  SiSentry,
  SiSlack,
  SiTablecheck,
  SiZapier,
  SiZendesk,
} from 'react-icons/si'

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

const integrations: Integration[] = [
  {
    icon: <SiGithub size={24} />,
    title: 'GitHub',
    description: 'Link pull requests, commits and automate workers',
    enabled: true,
    actionLabel: 'Enabled',
  },
  {
    icon: <SiGitlab size={24} />,
    title: 'GitLab',
    description: 'Link merge requests and automate workers',
    actionLabel: 'Open',
  },
  {
    icon: <SiSlack size={24} />,
    title: 'Slack',
    description: 'Send notifications to channels and create issues from messages',
    enabled: true,
    actionLabel: 'Enabled',
  },
  {
    icon: <SiFigma size={24} />,
    title: 'Figma',
    description: 'Embed file previews in issues',
    enabled: true,
    actionLabel: 'Enabled',
  },
  {
    icon: <SiSentry size={24} />,
    title: 'Sentry',
    description: 'Link exceptions to issues',
    actionLabel: 'Open',
  },
  {
    icon: <SiZapier size={20} />,
    title: 'Zapier',
    description: 'Build custom automations and integrations with other apps',
    actionLabel: 'Open',
  },
  {
    icon: <SiZendesk size={20} />,
    title: 'Zendesk',
    description: 'Link and automate Zendesk tickets with Linear',
    actionLabel: 'Open',
  },
  {
    icon: <SiGooglesheets size={20} />,
    title: 'Google Sheets',
    description: 'Export issues and build custom analytics',
    actionLabel: 'Open',
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

const IntegrationCard = ({ integration }: { integration: Integration }) => {
  return (
    <div className='mb-3 flex items-start gap-4'>
      <div className='text-card-foreground'>{integration.icon}</div>
      <div className='flex h-full flex-col space-y-2'>
        <div className='flex-1'>
          <h3 className='font-medium text-card-foreground'>{integration.title}</h3>
          <p className='mt-1 text-muted-foreground text-sm'>{integration.description}</p>
        </div>
        <Button variant='outline' size='sm' className='w-fit text-sm'>
          {integration.actionLabel}
        </Button>
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

export default function AccountSettingsPage() {
  return (
    <div className='mx-auto w-full max-w-7xl px-8 py-8'>
      <div className='mb-10'>
        <h1 className='mb-1 font-semibold text-2xl'>Account</h1>
        <p className='text-muted-foreground'>Manage your general account settings.</p>
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
          <h2 className='font-semibold text-xl'>Integrations</h2>
          <Button variant='outline' size='sm' className='text-sm'>
            Browse all
          </Button>
        </div>
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {integrations.map((integration, index) => (
            <IntegrationCard key={index} integration={integration} />
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
