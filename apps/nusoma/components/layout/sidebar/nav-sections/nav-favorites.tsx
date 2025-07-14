'use client'

import * as React from 'react'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { TaskStatus } from '@nusoma/database/schema'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@nusoma/design-system/components/ui/collapsible'
import { EmptyText } from '@nusoma/design-system/components/ui/empty-text'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  type SidebarGroupProps,
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
  useSidebar,
} from '@nusoma/design-system/components/ui/sidebar'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { cn } from '@nusoma/design-system/lib/utils'
import type { FavoriteDto } from '@nusoma/types/dtos/favorite-dto'
import { BoxIcon, ChevronRightIcon, GripVerticalIcon, StarOffIcon } from 'lucide-react'
import Link from 'next/link'
import { StatusLabel } from '@/app/(dashboard)/workspace/[workspaceId]/tasks/components/status-label'
import { useRemoveFavorite, useReorderFavorites } from '@/hooks/use-favorites-api'
import { useWorkerRegistry } from '@/stores/workers/registry/store'

export type NavFavoritesProps = SidebarGroupProps & {
  favorites: FavoriteDto[]
}

export function NavFavorites({ favorites, ...other }: NavFavoritesProps): React.JSX.Element {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  )

  const [items, setItems] = React.useState<string[]>(favorites.map((favorite) => favorite.id))
  const reorderFavoritesMutation = useReorderFavorites()

  React.useEffect(() => {
    setItems(favorites.map((favorite) => favorite.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites.length])

  const active = favorites.find((t) => t.id === activeId)

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(event.active.id.toString())
  }

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id.toString())
      const newIndex = items.indexOf(over.id.toString())

      const oldItems = items.slice()
      const newItems = arrayMove(oldItems.slice(), oldIndex, newIndex)

      setItems(newItems)

      try {
        await reorderFavoritesMutation.mutateAsync({
          favorites: newItems.map((item, index) => ({
            id: item,
            order: index,
          })),
        })
      } catch (error) {
        toast.error("Couldn't reorder favorites")
        setItems(oldItems)
      }
    }

    setActiveId(null)
  }

  const handleDragCancel = (): void => {
    setActiveId(null)
  }

  return (
    <Collapsible asChild defaultOpen className='group/collapsible'>
      <SidebarGroup {...other}>
        <SidebarGroupLabel
          asChild
          className='group/label hover:bg-sidebar-accent group-data-[collapsible=icon]:mt-0'
        >
          <CollapsibleTrigger className='group-data-[collapsible=icon]:invisible'>
            <span className='text-muted-foreground text-sm'>Favorites</span>
            <ChevronRightIcon className='ml-auto hidden opacity-60 transition-transform duration-200 group-hover/label:inline group-data-[state=open]/collapsible:rotate-90' />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent className='mt-2'>
            {favorites.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext items={items} strategy={rectSortingStrategy}>
                  <SidebarMenu>
                    {favorites
                      .sort((a, b) => items.indexOf(a.id) - items.indexOf(b.id))
                      .map((favorite) => (
                        <SortableFavoriteSidebarMenuItem key={favorite.id} favorite={favorite} />
                      ))}
                    <DragOverlay adjustScale={true}>
                      {active && <FavoriteSidebarMenuItem favorite={active} />}
                    </DragOverlay>
                  </SidebarMenu>
                </SortableContext>
              </DndContext>
            ) : (
              <EmptyText className='ml-3 text-xs group-data-[collapsible=icon]:hidden'>
                No items added.
              </EmptyText>
            )}
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

type FavoriteSidebarMenuItemElement = HTMLLIElement
type FavoriteSidebarMenuItemProps = React.HTMLAttributes<HTMLLIElement> & {
  favorite: FavoriteDto
}
const FavoriteSidebarMenuItem = React.forwardRef<
  FavoriteSidebarMenuItemElement,
  FavoriteSidebarMenuItemProps
>(({ favorite, ...other }, ref): React.JSX.Element => {
  const { isMobile, state } = useSidebar()
  const { activeWorkspaceId } = useWorkerRegistry()
  const removeFavoriteMutation = useRemoveFavorite()

  const handleRemoveFromFavorites = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ): Promise<void> => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await removeFavoriteMutation.mutateAsync({ taskId: favorite.taskId })
    } catch (error) {
      toast.error("Couldn't remove favorite")
    }
  }
  return (
    <SidebarMenuItem key={favorite.id} ref={ref} {...other}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/workspace/${favorite.workspaceId}/tasks/${favorite.taskId}`}
            className={cn(
              sidebarMenuButtonVariants({ variant: 'default' }),
              'group/fav-item relative'
            )}
          >
            <GripVerticalIcon className='-left-0.5 !size-3 pointer-events-none absolute top-3 z-20 shrink-0 opacity-0 group-hover/fav-item:opacity-60' />
            {favorite.taskId && favorite.status !== TaskStatus.TODO && (
              <StatusLabel status={favorite.status!} className='mr-2' />
            )}
            {favorite.projectId && <BoxIcon className='mr-2' />}
            <span className='backface-hidden ml-0.5 truncate font-normal text-sm will-change-transform'>
              {favorite.name}
            </span>
            <Button
              type='button'
              variant='ghost'
              className='-mr-1 ml-auto size-6 p-0 text-muted-foreground opacity-0 group-hover/fav-item:opacity-60 group-data-[collapsible=icon]:hidden'
              onClick={handleRemoveFromFavorites}
            >
              <StarOffIcon className='size-3.5 shrink-0' />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side='right' align='center' hidden={state !== 'collapsed' || isMobile}>
          {favorite.name}
        </TooltipContent>
      </Tooltip>
    </SidebarMenuItem>
  )
})

function SortableFavoriteSidebarMenuItem(props: FavoriteSidebarMenuItemProps): React.JSX.Element {
  const sortable = useSortable({ id: props.favorite.id })
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable

  const inlineStyles: React.CSSProperties = {
    transform: transform?.toString(),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <FavoriteSidebarMenuItem
      suppressHydrationWarning
      {...props}
      ref={setNodeRef}
      style={inlineStyles}
      {...attributes}
      {...listeners}
    />
  )
}
