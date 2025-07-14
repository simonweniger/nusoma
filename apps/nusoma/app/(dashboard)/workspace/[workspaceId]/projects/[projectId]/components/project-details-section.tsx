'use client'

import * as React from 'react'
import { Priority, ProjectStage } from '@nusoma/database/schema'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@nusoma/design-system/components/ui/form'
import { Input } from '@nusoma/design-system/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nusoma/design-system/components/ui/select'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { Textarea } from '@nusoma/design-system/components/ui/textarea'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { IdCardIcon, SquareDashedKanbanIcon, TextIcon } from 'lucide-react'
import { FormProvider, type SubmitHandler } from 'react-hook-form'
import { priorityLabel, projectStageLabel } from '@/lib/labels'
import { updateProjectProperties } from '@/actions/projects/update-project-properties'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type UpdateProjectPropertiesSchema,
  updateProjectPropertiesSchema,
} from '@/schemas/projects/update-project-properties-schema'

export type ProjectDetailsSectionProps = React.HtmlHTMLAttributes<HTMLDivElement> & {
  project: ProjectDto
}

export function ProjectDetailsSection({
  project,
  ...others
}: ProjectDetailsSectionProps): React.JSX.Element {
  return (
    <section {...others}>
      <Properties {...project} />
    </section>
  )
}

function Properties(project: ProjectDto): React.JSX.Element {
  const [editMode, setEditMode] = React.useState<boolean>(false)
  const methods = useZodForm({
    schema: updateProjectPropertiesSchema,
    mode: 'onSubmit',
    defaultValues: {
      id: project.id,
      stage: project.stage,
      priority: project.priority,
      name: project.name,
      description: project.description ?? '',
    },
  })
  const canSubmit = !methods.formState.isSubmitting
  const handleEnableEditMode = async (): Promise<void> => {
    setEditMode(true)
  }
  const handleCancel = async (): Promise<void> => {
    methods.reset(methods.formState.defaultValues)
    setEditMode(false)
  }
  const onSubmit: SubmitHandler<UpdateProjectPropertiesSchema> = async (values) => {
    if (!canSubmit) {
      return
    }
    const result = await updateProjectProperties(values)
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Properties updated')
      setEditMode(false)
    } else {
      toast.error("Couldn't update properties")
    }
  }
  return (
    <FormProvider {...methods}>
      <form className='space-y-2 p-6' onSubmit={methods.handleSubmit(onSubmit)}>
        <div className='flex items-center justify-between'>
          <h3 className='font-semibold text-sm tracking-tight'>Properties</h3>
          {editMode ? (
            <div>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='min-w-fit text-success hover:text-success'
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='min-w-fit text-success hover:text-success'
                disabled={!canSubmit}
                onClick={methods.handleSubmit(onSubmit)}
              >
                Save
              </Button>
            </div>
          ) : (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='min-w-fit text-success hover:text-success'
              disabled={methods.formState.isSubmitting}
              onClick={handleEnableEditMode}
            >
              Edit
            </Button>
          )}
        </div>
        <dl className='space-y-1 text-sm'>
          <Property
            icon={<SquareDashedKanbanIcon className='size-3 shrink-0' />}
            term='Priority'
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name='priority'
                  render={({ field }) => (
                    <FormItem className='flex w-full flex-col'>
                      <FormControl>
                        <Select
                          required
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={methods.formState.isSubmitting}
                        >
                          <SelectTrigger className='h-7 w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(Priority).map((value) => (
                              <SelectItem key={value} value={value}>
                                {priorityLabel[value as Priority]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                priorityLabel[project.priority]
              )
            }
            placeholder='No type available'
          />
          <Property
            icon={<IdCardIcon className='size-3 shrink-0' />}
            term='Name'
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem className='flex w-full flex-col'>
                      <FormControl>
                        <Input
                          type='text'
                          maxLength={70}
                          required
                          className='h-7'
                          disabled={methods.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                project.name
              )
            }
            placeholder='No name available'
          />
          <Property
            icon={<TextIcon className='size-3 shrink-0' />}
            term='description'
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem className='flex w-full flex-col'>
                      <FormControl>
                        <Textarea
                          maxLength={4000}
                          required
                          className='h-7'
                          disabled={methods.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                project.description
              )
            }
            placeholder='No description available'
          />
          <Property
            icon={<SquareDashedKanbanIcon className='size-3 shrink-0' />}
            term='Stage'
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name='stage'
                  render={({ field }) => (
                    <FormItem className='flex w-full flex-col'>
                      <FormControl>
                        <Select
                          required
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={methods.formState.isSubmitting}
                        >
                          <SelectTrigger className='h-7 w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(ProjectStage).map((value) => (
                              <SelectItem key={value} value={value}>
                                {projectStageLabel[value as ProjectStage]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                priorityLabel[project.priority]
              )
            }
            placeholder='No type available'
          />
        </dl>
      </form>
    </FormProvider>
  )
}

type PropertyProps = {
  icon: React.ReactNode
  term: string
  details?: React.ReactNode
  placeholder: string
}

function Property({ icon, term, details, placeholder }: PropertyProps): React.JSX.Element {
  return (
    <div className='flex h-7 flex-row items-center whitespace-nowrap'>
      <dt className='flex h-7 min-w-24 flex-row items-center gap-2 text-muted-foreground'>
        {icon}
        {term}
      </dt>
      <dd className='flex h-7 w-full max-w-[196px] flex-row items-center overflow-hidden text-ellipsis'>
        {details ? details : <p className='text-muted-foreground opacity-65'>{placeholder}</p>}
      </dd>
    </div>
  )
}
