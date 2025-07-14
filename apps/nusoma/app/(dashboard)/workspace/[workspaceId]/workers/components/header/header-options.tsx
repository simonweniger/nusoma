'use client'

import { Button } from '@nusoma/design-system/components/ui/button'
import { ListFilter, SlidersHorizontal } from 'lucide-react'

export default function HeaderOptions() {
  return (
    <div className='flex h-10 w-full items-center justify-between border-b px-6 py-1.5'>
      <Button size='xs' variant='ghost'>
        <ListFilter className='mr-1 size-4' />
        Filter
      </Button>
      <Button className='relative' size='xs' variant='secondary'>
        <SlidersHorizontal className='mr-1 size-4' />
        Display
      </Button>
    </div>
  )
}
