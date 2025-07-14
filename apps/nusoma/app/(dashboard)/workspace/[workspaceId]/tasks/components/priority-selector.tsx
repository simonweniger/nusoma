'use client'

import { useId, useState } from 'react'
import { Priority, type TaskStatus } from '@nusoma/database/schema'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@nusoma/design-system/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@nusoma/design-system/components/ui/popover'
import { CheckIcon } from 'lucide-react'
import { useUpdateTaskProperties } from '@/hooks/use-tasks-api'

// Define priority configuration with database enum
const priorityConfig = {
  [Priority.LOW]: {
    id: 'low',
    name: 'Low',
    icon: () => (
      <svg
        width='16'
        height='16'
        viewBox='0 0 16 16'
        fill='currentColor'
        className='text-muted-foreground'
      >
        <rect x='1.5' y='8' width='3' height='6' rx='1' />
        <rect x='6.5' y='5' width='3' height='9' rx='1' fillOpacity='0.4' />
        <rect x='11.5' y='2' width='3' height='12' rx='1' fillOpacity='0.4' />
      </svg>
    ),
  },
  [Priority.MEDIUM]: {
    id: 'medium',
    name: 'Medium',
    icon: () => (
      <svg
        width='16'
        height='16'
        viewBox='0 0 16 16'
        fill='currentColor'
        className='text-muted-foreground'
      >
        <rect x='1.5' y='8' width='3' height='6' rx='1' />
        <rect x='6.5' y='5' width='3' height='9' rx='1' />
        <rect x='11.5' y='2' width='3' height='12' rx='1' fillOpacity='0.4' />
      </svg>
    ),
  },
  [Priority.HIGH]: {
    id: 'high',
    name: 'High',
    icon: () => (
      <svg
        width='16'
        height='16'
        viewBox='0 0 16 16'
        fill='currentColor'
        className='text-muted-foreground'
      >
        <rect x='1.5' y='8' width='3' height='6' rx='1' />
        <rect x='6.5' y='5' width='3' height='9' rx='1' />
        <rect x='11.5' y='2' width='3' height='12' rx='1' />
      </svg>
    ),
  },
  [Priority.URGENT]: {
    id: 'urgent',
    name: 'Urgent',
    icon: () => (
      <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor' className='text-red-500'>
        <path d='M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z' />
      </svg>
    ),
  },
}

const priorityOrder = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW]

interface PrioritySelectorProps {
  priority: Priority
  taskId: string
  projectId: string | undefined
  status: TaskStatus
  onPriorityChange?: (priority: Priority) => void
}

export function PrioritySelector({
  priority,
  taskId,
  projectId,
  status,
  onPriorityChange,
}: PrioritySelectorProps) {
  const id = useId()
  const [open, setOpen] = useState<boolean>(false)
  const [value, setValue] = useState<Priority>(priority)
  const updateTaskPropertiesMutation = useUpdateTaskProperties()

  // useEffect(() => {
  //   setValue(priority)
  // }, [priority])

  const handlePriorityChange = async (newPriority: Priority) => {
    setValue(newPriority)
    setOpen(false)

    if (onPriorityChange) {
      onPriorityChange(newPriority)
    } else if (taskId && status) {
      updateTaskPropertiesMutation.mutate(
        { taskId, properties: { priority: newPriority, status: status } },
        {
          onSuccess: () => {
            // Success toast is handled by the hook
          },
          onError: () => {
            setValue(priority) // Revert on error
          },
        }
      )
    }
  }

  const currentPriorityConfig = priorityConfig[value]

  return (
    <div className='*:not-first:mt-2'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            className='flex size-7 items-center justify-center'
            size='icon'
            variant='ghost'
            role='combobox'
            aria-expanded={open}
          >
            <currentPriorityConfig.icon />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0'
          align='start'
        >
          <Command>
            <CommandInput placeholder='Set priority...' />
            <CommandList>
              <CommandEmpty>No priority found.</CommandEmpty>
              <CommandGroup>
                {priorityOrder.map((priorityValue) => {
                  const config = priorityConfig[priorityValue]
                  return (
                    <CommandItem
                      key={priorityValue}
                      value={config.id}
                      onSelect={() => handlePriorityChange(priorityValue)}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-2'>
                        <config.icon />
                        {config.name}
                      </div>
                      {value === priorityValue && <CheckIcon size={16} className='ml-auto' />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
