'use client'

import type * as React from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { MoreHorizontalIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useAddFavorite, useRemoveFavorite } from '@/hooks/use-favorites-api'
import { DeleteProjectModal } from '../../components/delete-project-modal'

export type ProjectActionsDropdownProps = {
  project: ProjectDto
  addedToFavorites: boolean
}

export function ProjectActionsDropdown({
  project,
  addedToFavorites,
}: ProjectActionsDropdownProps): React.JSX.Element {
  const _router = useRouter()
  const copyToClipboard = useCopyToClipboard()
  const addFavoriteMutation = useAddFavorite()
  const removeFavoriteMutation = useRemoveFavorite()
  const handleShowDeleteProjectModal = async (): Promise<void> => {
    const _deleted: boolean = await NiceModal.show(DeleteProjectModal, {
      project,
    })
    //TODO: Implement redirect on delete
    // if (deleted) {
    //   router.push(
    //     replaceOrgSlug(
    //       routes.dashboard.organizations.slug.Projects,
    //       activeOrganization.slug
    //     )
    //   );
    // }
  }
  const handleCopyProjectId = async (): Promise<void> => {
    await copyToClipboard(project.id)
    toast.success('Copied!')
  }
  const handleCopyPageUrl = async (): Promise<void> => {
    await copyToClipboard(window.location.href)
    toast.success('Copied!')
  }
  const handleAddFavorite = async (): Promise<void> => {
    try {
      await addFavoriteMutation.mutateAsync({ projectId: project.id })
    } catch (error) {
      toast.error("Couldn't add favorite")
    }
  }
  const handleRemoveFavorite = async (): Promise<void> => {
    try {
      await removeFavoriteMutation.mutateAsync({ projectId: project.id })
    } catch (error) {
      toast.error("Couldn't remove favorite")
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type='button' variant='ghost' className='size-9' title='Open menu'>
          <MoreHorizontalIcon className='size-4 shrink-0' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem className='cursor-pointer' onClick={handleCopyProjectId}>
          Copy project ID
        </DropdownMenuItem>
        <DropdownMenuItem className='cursor-pointer' onClick={handleCopyPageUrl}>
          Copy page URL
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {addedToFavorites ? (
          <DropdownMenuItem className='cursor-pointer' onClick={handleRemoveFavorite}>
            Remove favorite
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className='cursor-pointer' onClick={handleAddFavorite}>
            Add favorite
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='!text-destructive cursor-pointer'
          onClick={handleShowDeleteProjectModal}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
