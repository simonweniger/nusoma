'use client'

import type * as React from 'react'
import { ProjectStage } from '@nusoma/database/schema'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nusoma/design-system/components/ui/select'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { cn } from '@nusoma/design-system/lib/utils'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import type { SubmitHandler } from 'react-hook-form'
import { projectStageLabel } from '@/lib/labels'
import { updateProjectStage } from '@/actions/projects/update-project-stage'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type UpdateProjectStageSchema,
  updateProjectStageSchema,
} from '@/schemas/projects/update-project-stage-schema'
import { projectStageColor } from '../../components/project-stage-color'

export type ProjectStageSectionProps = React.HtmlHTMLAttributes<HTMLDivElement> & {
  project: ProjectDto
}

export function ProjectStageSection({
  project,
  ...others
}: ProjectStageSectionProps): React.JSX.Element {
  const methods = useZodForm({
    schema: updateProjectStageSchema,
    mode: 'all',
    defaultValues: {
      id: project.id,
      stage: project.stage,
    },
  })
  const onSubmit: SubmitHandler<UpdateProjectStageSchema> = async (values) => {
    const result = await updateProjectStage(values)
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Stage updated')
    } else {
      toast.error("Couldn't update stage")
    }
  }
  return (
    <FormProvider {...methods}>
      <section {...others}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className='flex h-14 flex-row items-center p-6'>
            <h3 className='font-semibold text-sm tracking-tight'>Stage</h3>
          </div>
          <div className='p-6 pt-0'>
            <FormField
              name='stage'
              control={methods.control}
              render={({ field }) => (
                <FormItem className='flex w-full flex-col'>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value !== field.value) {
                          field.onChange(value)
                          onSubmit(methods.getValues())
                        }
                      }}
                      required
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ProjectStage).map((value: ProjectStage) => (
                          <SelectItem key={value} value={value}>
                            <div className='flex flex-row items-center gap-2'>
                              <div
                                className={cn(
                                  'size-2.5 rounded-full border-2 bg-background',
                                  projectStageColor[value]
                                )}
                              />
                              {projectStageLabel[value]}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </section>
    </FormProvider>
  )
}
