'use client'

import type * as React from 'react'
import { Button, type ButtonProps } from '@nusoma/design-system/components/ui/button'
import { cn } from '@nusoma/design-system/lib/utils'
import type { WorkerDto } from '@nusoma/types/dtos/worker-dto'
import { StarIcon } from 'lucide-react'
import { useAddFavorite, useRemoveFavorite } from '@/hooks/use-favorites-api'

export type WorkerFavoriteToggleProps = ButtonProps & {
  worker: WorkerDto
  addedToFavorites: boolean
}

export function WorkerFavoriteToggle({
  worker,
  addedToFavorites,
  className,
  ...other
}: WorkerFavoriteToggleProps): React.JSX.Element {
  const addFavoriteMutation = useAddFavorite()
  const removeFavoriteMutation = useRemoveFavorite()

  const description = addedToFavorites ? 'Remove favorite' : 'Add favorite'
  const handleToggleFavorite = (): void => {
    if (addedToFavorites) {
      removeFavoriteMutation.mutate({ workerId: worker.id })
    } else {
      addFavoriteMutation.mutate({ workerId: worker.id })
    }
  }
  return (
    <Button
      type='button'
      variant='ghost'
      title={description}
      onClick={handleToggleFavorite}
      className={cn('size-9', className)}
      {...other}
    >
      <StarIcon className={cn('size-4 shrink-0', addedToFavorites && 'fill-primary')} />
      <span className='sr-only'>{description}</span>
    </Button>
  )
}
