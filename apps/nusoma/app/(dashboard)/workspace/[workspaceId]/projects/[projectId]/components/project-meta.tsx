'use client'

import type * as React from 'react'
import { ResponsiveScrollArea } from '@nusoma/design-system/components/ui/scroll-area'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { MediaQueries } from '@/lib/media-queries'
import { ProjectDetailsSection } from './project-details-section'
import { ProjectStageSection } from './project-stage-section'
import { ProjectTagsSection } from './project-tags-section'

export type ProjectMetaProps = {
  project: ProjectDto
}

export function ProjectMeta({ project }: ProjectMetaProps): React.JSX.Element {
  return (
    <ResponsiveScrollArea
      breakpoint={MediaQueries.MdUp}
      mediaQueryOptions={{ ssr: true }}
      className='h-full'
    >
      <div className='size-full divide-y border-b md:w-[360px] md:min-w-[360px]'>
        <ProjectDetailsSection project={project} />
        <ProjectStageSection project={project} />
        <ProjectTagsSection project={project} />
      </div>
    </ResponsiveScrollArea>
  )
}
