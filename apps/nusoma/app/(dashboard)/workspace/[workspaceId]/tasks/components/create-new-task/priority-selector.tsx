'use client'

import { useEffect, useId, useState } from 'react'
import type { Priority } from '@nusoma/database/schema'
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
import { getAllPriorities, priorityConfig } from '@/lib/task-priority'

interface PrioritySelectorProps {
  priority: Priority
  onChange: (priority: Priority) => void
  priorityCounts?: Record<string, number>
}

export function PrioritySelector({
  priority,
  onChange,
  priorityCounts = {},
}: PrioritySelectorProps) {
  const id = useId()
  const [open, setOpen] = useState<boolean>(false)
  const [value, setValue] = useState<Priority>(priority)

  useEffect(() => {
    setValue(priority)
  }, [priority])

  const handlePriorityChange = (newPriority: Priority) => {
    setValue(newPriority)
    setOpen(false)
    onChange(newPriority)
  }

  const allPriorities = getAllPriorities()
  const currentConfig = priorityConfig[value]
  const PriorityIcon = currentConfig.icon

  return (
    <div className='*:not-first:mt-2'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            className='flex items-center justify-center'
            size='xs'
            variant='secondary'
            role='combobox'
            aria-expanded={open}
          >
            <PriorityIcon />
            <span>{currentConfig.name}</span>
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
                {allPriorities.map((priorityValue) => {
                  const config = priorityConfig[priorityValue]
                  const Icon = config.icon
                  return (
                    <CommandItem
                      key={priorityValue}
                      value={config.id}
                      onSelect={() => handlePriorityChange(priorityValue)}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-2'>
                        <Icon />
                        {config.name}
                      </div>
                      {value === priorityValue && <CheckIcon size={16} className='ml-auto' />}
                      {priorityCounts[priorityValue] !== undefined && (
                        <span className='text-muted-foreground text-xs'>
                          {priorityCounts[priorityValue]}
                        </span>
                      )}
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
