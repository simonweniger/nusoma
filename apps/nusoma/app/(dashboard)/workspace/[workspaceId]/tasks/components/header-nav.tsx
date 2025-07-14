'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { Input } from '@nusoma/design-system/components/ui/input'
import { SidebarTrigger } from '@nusoma/design-system/components/ui/sidebar'
import { SearchIcon } from 'lucide-react'
import { useSearchStore } from '@/stores/search-store'
import { AddTaskButton } from './add-task-button'
import Notifications from './notifications'

interface HeaderNavProps {
  workspaceId: string
}

export default function HeaderNav({ workspaceId }: HeaderNavProps) {
  const { isSearchOpen, toggleSearch, closeSearch, setSearchQuery, searchQuery } = useSearchStore()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const previousValueRef = useRef<string>('')

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node) &&
        isSearchOpen &&
        searchQuery.trim() === ''
      ) {
        closeSearch()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSearchOpen, closeSearch, searchQuery])

  return (
    <div className='flex h-10 w-full items-center justify-between border-b px-6 py-1.5'>
      <div className='flex items-center gap-2'>
        <SidebarTrigger className='' />
        <AddTaskButton workspaceId={workspaceId} />
      </div>

      <div className='flex items-center gap-2'>
        {isSearchOpen ? (
          <div
            ref={searchContainerRef}
            className='relative flex w-64 items-center justify-center transition-all duration-200 ease-in-out'
          >
            <SearchIcon className='-translate-y-1/2 absolute top-1/2 left-2 h-4 w-4 text-muted-foreground' />
            <Input
              type='search'
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => {
                previousValueRef.current = searchQuery
                const newValue = e.target.value
                setSearchQuery(newValue)

                if (previousValueRef.current && newValue === '') {
                  const inputEvent = e.nativeEvent as InputEvent
                  if (
                    inputEvent.inputType !== 'deleteContentBackward' &&
                    inputEvent.inputType !== 'deleteByCut'
                  ) {
                    closeSearch()
                  }
                }
              }}
              placeholder='Search tasks...'
              className='h-7 pl-8 text-sm'
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  if (searchQuery.trim() === '') {
                    closeSearch()
                  } else {
                    setSearchQuery('')
                  }
                }
              }}
            />
          </div>
        ) : (
          <>
            <Button
              variant='ghost'
              size='icon'
              onClick={toggleSearch}
              className='h-8 w-8'
              aria-label='Search'
            >
              <SearchIcon className='h-4 w-4' />
            </Button>
            <Notifications />
          </>
        )}
      </div>
    </div>
  )
}
