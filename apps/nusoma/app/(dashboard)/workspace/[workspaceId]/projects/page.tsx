import * as React from 'react'
import {
  Page,
  PageActions,
  PageBody,
  PageHeader,
  PagePrimaryBar,
  PageSecondaryBar,
  PageTitle,
} from '@nusoma/design-system/components/ui/page'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createTitle } from '@/lib/formatters'
import { getProjectTags } from '@/data/projects/get-project-tags'
import { getProjects } from '@/data/projects/get-projects'
import { TransitionProvider } from '@/hooks/use-transition-context'
import { PriorityOption } from '@/schemas/projects/get-projects-schema'
import { AddProjectButton } from './components/add-project-button'
import { ProjectsDataTable } from './components/projects-data-table'
import { ProjectsEmptyState } from './components/projects-empty-state'
import { ProjectsFilters } from './components/projects-filters'
import { searchParamsCache } from './components/projects-search-params'

interface NextPageProps {
  params: Promise<{ workspaceId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const metadata: Metadata = {
  title: createTitle('Projects'),
}

export default async function ProjectsPage({
  params,
  searchParams,
}: NextPageProps): Promise<React.JSX.Element> {
  const { workspaceId } = await params
  const parsedSearchParams = searchParamsCache.parse(await searchParams)

  if (!workspaceId) {
    notFound()
  }

  // Transform priority from search params - convert "all" to undefined
  const transformedParams = {
    ...parsedSearchParams,
    priority:
      parsedSearchParams.priority === PriorityOption.All ? undefined : parsedSearchParams.priority,
    workspaceId,
  }

  const [{ projects, filteredCount, totalCount }, tags] = await Promise.all([
    getProjects(transformedParams),
    getProjectTags({ workspaceId }),
  ])

  const hasAnyProjects = totalCount > 0

  return (
    <TransitionProvider>
      <Page>
        <PageHeader>
          <PagePrimaryBar>
            <PageTitle
              title='Projects'
              //description={`Total ${totalCount} ${totalCount === 1 ? 'project' : 'projects'} in your organization`}
            />
            <PageTitle>Projects</PageTitle>
            {hasAnyProjects && (
              <PageActions>
                <AddProjectButton />
              </PageActions>
            )}
          </PagePrimaryBar>
          <PageSecondaryBar>
            <React.Suspense>
              <ProjectsFilters tags={tags} />
            </React.Suspense>
          </PageSecondaryBar>
        </PageHeader>
        <PageBody disableScroll={hasAnyProjects}>
          {hasAnyProjects ? (
            <React.Suspense>
              <ProjectsDataTable data={projects} totalCount={filteredCount} />
            </React.Suspense>
          ) : (
            <ProjectsEmptyState />
          )}
        </PageBody>
      </Page>
    </TransitionProvider>
  )
}
