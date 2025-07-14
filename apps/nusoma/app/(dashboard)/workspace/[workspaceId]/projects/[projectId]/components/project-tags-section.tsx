'use client'

import type * as React from 'react'
import {
  FormControl,
  FormField,
  FormItem,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { TagInput } from '@nusoma/design-system/components/ui/tag-input'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import type { SubmitHandler } from 'react-hook-form'
import { updateProjectTags } from '@/actions/projects/update-project-tags'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type UpdateProjectTagsSchema,
  updateProjectTagsSchema,
} from '@/schemas/projects/update-project-tags-schema'

export type ProjectTagsSectionProps = React.HtmlHTMLAttributes<HTMLDivElement> & {
  project: ProjectDto
}

export function ProjectTagsSection({
  project,
  ...other
}: ProjectTagsSectionProps): React.JSX.Element {
  const methods = useZodForm({
    schema: updateProjectTagsSchema,
    mode: 'all',
    defaultValues: {
      id: project.id,
      tags: project.tags,
    },
  })
  const onSubmit: SubmitHandler<UpdateProjectTagsSchema> = async (values) => {
    const result = await updateProjectTags(values)
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Tags updated')
    } else {
      toast.error("Couldn't update tags")
    }
  }
  return (
    <FormProvider {...methods}>
      <section {...other}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className='flex h-14 flex-row items-center p-6'>
            <h3 className='font-semibold text-sm tracking-tight'>Tags</h3>
          </div>
          <div className='p-6 pt-0'>
            <FormField
              name='tags'
              control={methods.control}
              render={({ field }) => (
                <FormItem className='flex flex-col gap-4'>
                  <FormControl>
                    <TagInput
                      {...field}
                      allowDuplicates={false}
                      inputFieldPosition='top'
                      placeholder='Type your tag and press enter'
                      tags={field.value}
                      onTagsChange={(values) => {
                        field.onChange(values)
                        onSubmit(methods.getValues())
                      }}
                      size='sm'
                      variant='default'
                      shape='rounded'
                      borderStyle='default'
                      textCase={null}
                      textStyle='normal'
                      animation='fadeIn'
                      direction='row'
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </form>
      </section>
    </FormProvider>
  )
}
