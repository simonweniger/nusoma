'use client'

import type * as React from 'react'
import { Button, type ButtonProps } from '@nusoma/design-system/components/ui/button'
import { cn } from '@nusoma/design-system/lib/utils'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { StarIcon } from 'lucide-react'
import { useAddFavorite, useRemoveFavorite } from '@/hooks/use-favorites-api'

export type ProjectFavoriteToggleProps = ButtonProps & {
  project: ProjectDto
  addedToFavorites: boolean
}

export function ProjectFavoriteToggle({
  project,
  addedToFavorites,
  className,
  ...other
}: ProjectFavoriteToggleProps): React.JSX.Element {
  const addFavoriteMutation = useAddFavorite()
  const removeFavoriteMutation = useRemoveFavorite()

  const description = addedToFavorites ? 'Remove favorite' : 'Add favorite'
  const handleToggleFavorite = (): void => {
    if (addedToFavorites) {
      removeFavoriteMutation.mutate({ projectId: project.id })
    } else {
      addFavoriteMutation.mutate({ projectId: project.id })
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
