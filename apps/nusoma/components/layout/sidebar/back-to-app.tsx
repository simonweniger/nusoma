'use client'

import { Button } from '@nusoma/design-system/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function BackToApp() {
  const router = useRouter()
  return (
    <div className='flex w-full items-center justify-between gap-2'>
      <Button size='xs' variant='outline' onClick={() => router.back()}>
        <ChevronLeft className='size-4' />
        Back to app
      </Button>
    </div>
  )
}
