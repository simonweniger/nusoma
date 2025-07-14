'use client'

import * as React from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { DataTableFilter } from '@nusoma/design-system/components/ui/data-table'
import { InputSearch } from '@nusoma/design-system/components/ui/input-search'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nusoma/design-system/components/ui/select'
import {
  UnderlinedTabs,
  UnderlinedTabsList,
  UnderlinedTabsTrigger,
} from '@nusoma/design-system/components/ui/underlined-tabs'
import type { TagDto } from '@nusoma/types/dtos/tag-dto'
import { GridIcon, SearchIcon, Signal, SignalHigh, SignalLow, SignalMedium } from 'lucide-react'
import { useQueryState } from 'nuqs'
import { MediaQueries } from '@/lib/media-queries'
import { useMediaQuery } from '@/hooks/use-media-query'
import { PriorityOption } from '@/schemas/projects/get-projects-schema'
import { searchParams } from './projects-search-params'

export type ProjectsFiltersProps = {
  tags: TagDto[]
}

export function ProjectsFilters({ tags }: ProjectsFiltersProps): React.JSX.Element {
  const [showMobileSerch, setShowMobileSearch] = React.useState<boolean>(false)
  const smUp = useMediaQuery(MediaQueries.SmUp, { fallback: false })

  const [searchQuery, setSearchQuery] = useQueryState(
    'searchQuery',
    searchParams.searchQuery.withOptions({
      shallow: false,
    })
  )

  const [priority, setPriority] = useQueryState(
    'priority',
    searchParams.priority.withOptions({
      shallow: false,
    })
  )

  const [selectedTags, setSelectedTags] = useQueryState(
    'tags',
    searchParams.tags.withOptions({
      shallow: false,
    })
  )

  const [pageIndex, setPageIndex] = useQueryState(
    'pageIndex',
    searchParams.pageIndex.withOptions({
      shallow: false,
    })
  )

  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target?.value || ''
    if (value !== searchQuery) {
      setSearchQuery(value)
      if (pageIndex !== 0) {
        setPageIndex(0)
      }
    }
  }

  const handlePriorityChange = (value: string): void => {
    if (value !== priority) {
      setPriority(value as any)
      if (pageIndex !== 0) {
        setPageIndex(0)
      }
    }
  }

  const handleTagsChange = (tags: string[]): void => {
    setSelectedTags(tags)
    if (pageIndex !== 0) {
      setPageIndex(0)
    }
  }

  const handleShowMobileSearch = (): void => {
    setShowMobileSearch(true)
  }

  const handleHideMobileSearch = (): void => {
    setShowMobileSearch(false)
  }

  return (
    <>
      <div className='flex items-center gap-2'>
        <UnderlinedTabs
          value={priority}
          onValueChange={handlePriorityChange}
          className='-ml-2 hidden sm:flex'
        >
          <UnderlinedTabsList className='mr-2 h-12 max-h-12 min-h-12 gap-x-2 border-none'>
            {recordsOptions.map((option) => (
              <UnderlinedTabsTrigger
                key={option.value}
                value={option.value}
                className='mx-0 border-t-4 border-t-transparent'
              >
                <div className='flex flex-row items-center gap-2 rounded-md px-2 py-1 hover:bg-accent'>
                  {option.icon}
                  {option.label}
                </div>
              </UnderlinedTabsTrigger>
            ))}
          </UnderlinedTabsList>
        </UnderlinedTabs>
        <Select value={priority} onValueChange={(value) => setPriority(value as any)}>
          <SelectTrigger className='flex sm:hidden'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {recordsOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className='flex flex-row items-center gap-2 pr-2'>
                  {option.icon}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DataTableFilter
          title='Tags'
          options={tags?.map((tag) => ({ value: tag.text, label: tag.text }))}
          selected={selectedTags || []}
          onChange={handleTagsChange}
        />
      </div>
      <div>
        {smUp ? (
          <InputSearch
            placeholder='Search by name or email...'
            className='w-[240px]'
            value={searchQuery}
            onChange={handleSearchQueryChange}
          />
        ) : (
          <>
            <Button type='button' variant='outline' size='icon' onClick={handleShowMobileSearch}>
              <SearchIcon className='size-4 shrink-0' />
            </Button>
            {showMobileSerch && (
              <div className='absolute inset-0 z-30 bg-background pr-5 pl-3'>
                <InputSearch
                  autoFocus
                  alwaysShowClearButton
                  placeholder='Search by name or email...'
                  className='!ring-0 h-12 w-full border-none'
                  containerClassName='h-12'
                  value={searchQuery}
                  onChange={handleSearchQueryChange}
                  onClear={handleHideMobileSearch}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

const recordsOptions = [
  {
    label: 'All',
    value: PriorityOption.All,
    icon: <GridIcon className='size-4 shrink-0' />,
  },
  {
    label: 'Low',
    value: PriorityOption.Low,
    icon: <SignalLow className='size-4 shrink-0' />,
  },
  {
    label: 'Medium',
    value: PriorityOption.Medium,
    icon: <SignalMedium className='size-4 shrink-0' />,
  },
  {
    label: 'High',
    value: PriorityOption.High,
    icon: <SignalHigh className='size-4 shrink-0' />,
  },
  {
    label: 'Urgent',
    value: PriorityOption.Urgent,
    icon: <Signal className='size-4 shrink-0' />,
  },
]
