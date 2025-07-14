'use client'

import { useEffect, useId, useState } from 'react'
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
import { Box, CheckIcon, FolderIcon } from 'lucide-react'

interface Project {
  id: string
  name: string
  icon?: any
}

interface ProjectSelectorProps {
  projectId: string | undefined
  onChange: (projectId: string | undefined) => void
  availableProjects?: Project[]
  projectCounts?: Record<string, number>
}

export function ProjectSelector({
  projectId,
  onChange,
  availableProjects = [],
  projectCounts = {},
}: ProjectSelectorProps) {
  const id = useId()
  const [open, setOpen] = useState<boolean>(false)
  const [value, setValue] = useState<string | undefined>(projectId)

  useEffect(() => {
    setValue(projectId)
  }, [projectId])

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId === 'no-project') {
      setValue(undefined)
      onChange(undefined)
    } else {
      setValue(newProjectId)
      onChange(newProjectId)
    }
    setOpen(false)
  }

  const selectedProject = availableProjects.find((p) => p.id === value)

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
            {selectedProject?.icon ? (
              <selectedProject.icon className='size-4' />
            ) : (
              <Box className='size-4' />
            )}
            <span>{selectedProject ? selectedProject.name : 'No project'}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0'
          align='start'
        >
          <Command>
            <CommandInput placeholder='Set project...' />
            <CommandList>
              <CommandEmpty>No projects found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value='no-project'
                  onSelect={() => handleProjectChange('no-project')}
                  className='flex items-center justify-between'
                >
                  <div className='flex items-center gap-2'>
                    <FolderIcon className='size-4' />
                    No Project
                  </div>
                  {value === undefined && <CheckIcon size={16} className='ml-auto' />}
                </CommandItem>
                {availableProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.id}
                    onSelect={() => handleProjectChange(project.id)}
                    className='flex items-center justify-between'
                  >
                    <div className='flex items-center gap-2'>
                      {project.icon ? (
                        <project.icon className='size-4' />
                      ) : (
                        <Box className='size-4' />
                      )}
                      {project.name}
                    </div>
                    {value === project.id && <CheckIcon size={16} className='ml-auto' />}
                    {projectCounts[project.id] !== undefined && (
                      <span className='text-muted-foreground text-xs'>
                        {projectCounts[project.id]}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
