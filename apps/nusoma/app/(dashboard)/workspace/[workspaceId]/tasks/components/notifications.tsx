'use client'

import { useState } from 'react'
import { SlackIcon } from '@nusoma/design-system/components/icons'
import { Button } from '@nusoma/design-system/components/ui/button'
import { Checkbox } from '@nusoma/design-system/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@nusoma/design-system/components/ui/popover'
import { Bell } from 'lucide-react'

export default function Notifications() {
  const [notifications, setNotifications] = useState({
    teamTaskAdded: false,
    taskCompleted: false,
    taskAddedToTriage: false,
  })

  const handleCheckboxChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='relative h-8 w-8' aria-label='Notifications'>
          <Bell className='h-4 w-4' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-0' align='end'>
        <div className='px-4 pt-3 pb-3'>
          <h3 className='mb-3 font-medium text-sm'>Inbox notifications</h3>

          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <label
                htmlFor='team-task-added'
                className='flex-1 cursor-pointer text-muted-foreground text-xs'
              >
                An task is added to the team
              </label>
              <Checkbox
                id='team-task-added'
                checked={notifications.teamTaskAdded}
                onCheckedChange={() => handleCheckboxChange('teamTaskAdded')}
              />
            </div>

            <div className='flex items-center justify-between'>
              <label
                htmlFor='task-completed'
                className='flex-1 cursor-pointer text-muted-foreground text-xs'
              >
                An task is marked completed or canceled
              </label>
              <Checkbox
                id='task-completed'
                checked={notifications.taskCompleted}
                onCheckedChange={() => handleCheckboxChange('taskCompleted')}
              />
            </div>

            <div className='flex items-center justify-between'>
              <label
                htmlFor='task-triage'
                className='flex-1 cursor-pointer text-muted-foreground text-xs'
              >
                An task is added to the triage queue
              </label>
              <Checkbox
                id='task-triage'
                checked={notifications.taskAddedToTriage}
                onCheckedChange={() => handleCheckboxChange('taskAddedToTriage')}
              />
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between border-t px-4 py-2'>
          <div className='flex items-center gap-2'>
            <SlackIcon className='size-4' />
            <span className='font-medium text-xs'>Slack notifications</span>
          </div>
          <Button size='xs' variant='outline'>
            Configure
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
