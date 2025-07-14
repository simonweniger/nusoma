import * as React from 'react'
import {
  Page,
  PageBody,
  PageHeader,
  PagePrimaryBar,
  PageTitle,
} from '@nusoma/design-system/components/ui/page'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createTitle } from '@/lib/formatters'
import { getProject } from '@/data/projects/get-project'
import { ProjectActions } from './components/project-actions'
import { ProjectMeta } from './components/project-meta'
import { ProjectTabs } from './components/project-tabs'

interface NextPageProps {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const dedupedGetProject = React.cache(getProject)

export async function generateMetadata({ params }: NextPageProps): Promise<Metadata> {
  const { projectId } = await params

  if (projectId) {
    const project = await dedupedGetProject({
      id: projectId,
    })
    if (project) {
      return {
        title: createTitle(project.name),
      }
    }
  }

  return {
    title: createTitle('Project'),
  }
}

export default async function ProjectPage({ params }: NextPageProps): Promise<React.JSX.Element> {
  const { projectId } = await params
  if (!projectId) {
    return notFound()
  }

  const project = await dedupedGetProject({
    id: projectId,
  })

  return (
    <Page>
      <PageHeader>
        <PagePrimaryBar>
          <PageTitle>{project.name}</PageTitle>
          <ProjectActions project={project} />
        </PagePrimaryBar>
      </PageHeader>
      <PageBody
        disableScroll
        className='flex h-full flex-col overflow-auto md:flex-row md:divide-x md:overflow-hidden'
      >
        <ProjectTabs project={project} />
        <ProjectMeta project={project} />
      </PageBody>
    </Page>
  )
}
