'use client'

import type { ReactNode } from 'react'
import {
  ChangeEmailCard,
  ChangePasswordCard,
  ProvidersCard,
  SessionsCard,
  //TwoFactorCard,
  UpdateAvatarCard,
  UpdateUsernameCard,
} from '@daveyplate/better-auth-ui'

// import { ArrowRight, BookOpen, FileText, GraduationCap } from 'lucide-react'
// import { SiSlack } from 'react-icons/si'
// import { Button } from '@nusoma/design-system/components/ui/button'

interface Guide {
  icon: ReactNode
  iconBg: string
  iconColor: string
  title: string
  description: string
}

// const guides: Guide[] = [
//   {
//     icon: <BookOpen size={20} />,
//     iconBg: 'bg-blue-50',
//     iconColor: 'text-blue-600',
//     title: 'Start guide',
//     description: 'Quick tips for beginners',
//   },
//   {
//     icon: <FileText size={20} />,
//     iconBg: 'bg-indigo-50',
//     iconColor: 'text-indigo-600',
//     title: 'Feature guide',
//     description: 'How Linear works',
//   },
//   {
//     icon: <GraduationCap size={20} />,
//     iconBg: 'bg-purple-50',
//     iconColor: 'text-purple-600',
//     title: 'Linear method',
//     description: 'Best practices for building',
//   },
//   {
//     icon: <SiSlack size={20} />,
//     iconBg: 'bg-blue-50',
//     iconColor: 'text-blue-600',
//     title: 'Join our Slack community',
//     description: 'Ask questions and meet others',
//   },
// ]

// const GuideCard = ({ guide }: { guide: Guide }) => {
//   return (
//     <div className="bg-card rounded-lg border p-5 flex items-start gap-3">
//       <div className="shrink-0">{guide.icon}</div>
//       <div className="w-full -mt-1">
//         <h3 className="font-medium text-sm text-card-foreground">{guide.title}</h3>
//         <p className="text-xs line-clamp-1 text-muted-foreground mt-1">{guide.description}</p>
//       </div>
//       <Button variant="ghost" size="icon" className="shrink-0">
//         <ArrowRight size={16} />
//       </Button>
//     </div>
//   )
// }

export default function AccountSettingsPage() {
  return (
    <div className='mx-auto mt-12 flex w-full max-w-3xl flex-col justify-center py-8'>
      <div className='mb-10 w-full '>
        <h1 className='mb-1 font-semibold text-2xl'>Account</h1>
        <p className='text-muted-foreground'>Manage your general account settings.</p>
      </div>

      <div className='flex w-full flex-col gap-6'>
        <UpdateAvatarCard
          classNames={{
            avatar: {
              base: 'size-12 border-2 border-border shadow-xs mr-6',
              fallback: 'bg-primary text-white text-md',
            },
            footer:
              'hidden bg-muted flex flex-row items-center justify-between rounded-b-xl py-3 px-4',
          }}
        />
        <UpdateUsernameCard
          classNames={{
            base: 'shadow-elevation-low',
            footer:
              'hidden bg-muted flex flex-row items-center justify-between rounded-b-xl py-2 px-4',
          }}
        />
        <ChangeEmailCard
          classNames={{
            base: 'w-full',
            footer: 'bg-muted flex flex-row items-center justify-between py-2 px-4',
          }}
        />
        <ChangePasswordCard
          classNames={{
            footer: 'bg-muted flex flex-row items-center justify-between py-2 px-4',
          }}
        />
        <ProvidersCard />
        <SessionsCard />
        {/* <TwoFactorCard
          classNames={{
            footer: 'bg-muted flex flex-row items-center justify-between py-2 px-4',
          }}
        /> */}
      </div>

      {/* <div className="mb-10 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Go further</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {guides.map((guide, index) => (
            <GuideCard key={index} guide={guide} />
          ))}
        </div>
      </div> */}
    </div>
  )
}
