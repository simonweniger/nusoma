'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@nusoma/design-system/components/ui/dialog'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import { Input } from '@nusoma/design-system/components/ui/input'
import { Label } from '@nusoma/design-system/components/ui/label'
import { LoadingAgent } from '@nusoma/design-system/components/ui/loading-logo-animation'
import { Notice } from '@nusoma/design-system/components/ui/notice'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nusoma/design-system/components/ui/select'
import { Textarea } from '@nusoma/design-system/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { cn } from '@nusoma/design-system/lib/utils'
import { Eye, HelpCircle, Info, Trash } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createLogger } from '@/lib/logger/console-logger'
import {
  CATEGORIES,
  getCategoryColor,
  getCategoryIcon,
  getCategoryLabel,
} from '@/app/(dashboard)/marketplace/constants/categories'
import { useNotificationStore } from '@/stores/notifications/store'
import { getWorkerWithValues } from '@/stores/workers'
import { useWorkerRegistry } from '@/stores/workers/registry/store'

const logger = createLogger('MarketplaceModal')

/**
 * Sanitizes sensitive data from worker state before publishing
 * Removes API keys, tokens, and environment variable references
 */
const sanitizeWorkerData = (workerData: any) => {
  if (!workerData) {
    return workerData
  }

  const sanitizedData = JSON.parse(JSON.stringify(workerData))
  let sanitizedCount = 0

  // Handle worker state format
  if (sanitizedData.state?.blocks) {
    Object.values(sanitizedData.state.blocks).forEach((block: any) => {
      if (block.subBlocks) {
        // Check for sensitive fields in subBlocks
        Object.entries(block.subBlocks).forEach(([key, subBlock]: [string, any]) => {
          // Check for API key related fields in any block type
          const isSensitiveField =
            key.toLowerCase() === 'apikey' || key.toLowerCase().includes('api_key')

          if (isSensitiveField && subBlock.value) {
            subBlock.value = ''
            sanitizedCount++
          }
        })
      }
    })
  }

  logger.info(`Sanitized ${sanitizedCount} API keys from worker data`)
  return sanitizedData
}

interface MarketplaceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Form schema for validation
const marketplaceFormSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description cannot exceed 500 characters'),
  category: z.string().min(1, 'Please select a category'),
  authorName: z
    .string()
    .min(2, 'Author name must be at least 2 characters')
    .max(50, 'Author name cannot exceed 50 characters'),
})

type MarketplaceFormValues = z.infer<typeof marketplaceFormSchema>

// Tooltip texts
const TOOLTIPS = {
  category: 'Categorizing your worker helps users find it more easily.',
  authorName: 'The name you want to publish under (defaults to your account name if left empty).',
}

interface MarketplaceInfo {
  id: string
  name: string
  description: string
  category: string
  authorName: string
  views: number
  createdAt: string
  updatedAt: string
}

export function MarketplaceModal({ open, onOpenChange }: MarketplaceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUnpublishing, setIsUnpublishing] = useState(false)
  const [marketplaceInfo, setMarketplaceInfo] = useState<MarketplaceInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { addNotification } = useNotificationStore()
  const { activeWorkerId, workers, updateWorker } = useWorkerRegistry()

  // Get marketplace data from the registry
  const getMarketplaceData = () => {
    if (!activeWorkerId || !workers[activeWorkerId]) {
      return null
    }
    return workers[activeWorkerId].marketplaceData
  }

  // Check if worker is published to marketplace
  const isPublished = () => {
    return !!getMarketplaceData()
  }

  // Check if the current user is the owner of the published worker
  const isOwner = () => {
    const marketplaceData = getMarketplaceData()
    return marketplaceData?.status === 'owner'
  }

  // Initialize form with react-hook-form
  const form = useForm<MarketplaceFormValues>({
    resolver: zodResolver(marketplaceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'marketing',
      authorName: '',
    },
  })

  // Fetch marketplace information when the modal opens and the worker is published
  useEffect(() => {
    async function fetchMarketplaceInfo() {
      if (!open || !activeWorkerId || !isPublished()) {
        setMarketplaceInfo(null)
        return
      }

      try {
        setIsLoading(true)

        // Get marketplace ID from the worker's marketplaceData
        const marketplaceData = getMarketplaceData()
        if (!marketplaceData?.id) {
          throw new Error('No marketplace ID found in worker data')
        }

        // Use the marketplace ID to fetch details instead of worker ID
        const response = await fetch(`/api/marketplace/workers?marketplaceId=${marketplaceData.id}`)

        if (!response.ok) {
          throw new Error('Failed to fetch marketplace information')
        }

        // The API returns the data directly without wrapping
        const marketplaceEntry = await response.json()
        setMarketplaceInfo(marketplaceEntry)
      } catch (_error) {
        addNotification('error', 'Failed to fetch marketplace information', activeWorkerId)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMarketplaceInfo()
  }, [open, activeWorkerId, addNotification])

  // Update form values when the active worker changes or modal opens
  useEffect(() => {
    if (open && activeWorkerId && workers[activeWorkerId] && !isPublished()) {
      const worker = workers[activeWorkerId]
      form.setValue('name', worker.name)
      form.setValue('description', worker.description || '')
    }
  }, [open, activeWorkerId, workers, form])

  // Listen for the custom event to open the marketplace modal
  useEffect(() => {
    const handleOpenMarketplace = () => {
      onOpenChange(true)
    }

    // Add event listener
    window.addEventListener('open-marketplace', handleOpenMarketplace as EventListener)

    // Clean up
    return () => {
      window.removeEventListener('open-marketplace', handleOpenMarketplace as EventListener)
    }
  }, [onOpenChange])

  const onSubmit = async (data: MarketplaceFormValues) => {
    if (!activeWorkerId) {
      addNotification('error', 'No active worker to publish', null)
      return
    }

    try {
      setIsSubmitting(true)

      // Get the complete worker state client-side
      const workerData = getWorkerWithValues(activeWorkerId)
      if (!workerData) {
        addNotification('error', 'Failed to retrieve worker state', activeWorkerId)
        return
      }

      // Sanitize the worker data
      const sanitizedWorkerData = sanitizeWorkerData(workerData)
      logger.info('Publishing sanitized worker to marketplace', {
        workerId: activeWorkerId,
        workerName: data.name,
        category: data.category,
      })

      const response = await fetch('/api/marketplace/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workerId: activeWorkerId,
          name: data.name,
          description: data.description,
          category: data.category,
          authorName: data.authorName,
          workerState: sanitizedWorkerData.state,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish worker')
      }

      // Get the marketplace ID from the response
      const responseData = await response.json()
      const marketplaceId = responseData.data.id

      // Update the marketplace data in the worker registry
      updateWorker(activeWorkerId, {
        marketplaceData: { id: marketplaceId, status: 'owner' },
      })

      // Add a marketplace notification with detailed information
      addNotification(
        'marketplace',
        `"${data.name}" successfully published to marketplace`,
        activeWorkerId
      )

      // Close the modal after successful submission
      onOpenChange(false)
    } catch (error: any) {
      addNotification('error', `Failed to publish worker: ${error.message}`, activeWorkerId)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnpublish = async () => {
    if (!activeWorkerId) {
      addNotification('error', 'No active worker to unpublish', null)
      return
    }

    try {
      setIsUnpublishing(true)

      // Get marketplace ID from the worker's marketplaceData
      const marketplaceData = getMarketplaceData()
      if (!marketplaceData?.id) {
        throw new Error('No marketplace ID found in worker data')
      }

      logger.info('Attempting to unpublish marketplace entry', {
        marketplaceId: marketplaceData.id,
        workerId: activeWorkerId,
        status: marketplaceData.status,
      })

      const response = await fetch(`/api/marketplace/${marketplaceData.id}/unpublish`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        logger.error('Error response from unpublish endpoint', {
          status: response.status,
          data: errorData,
        })
        throw new Error(errorData.error || 'Failed to unpublish worker')
      }

      logger.info('Successfully unpublished worker from marketplace', {
        marketplaceId: marketplaceData.id,
        workerId: activeWorkerId,
      })

      // First close the modal to prevent any flashing
      onOpenChange(false)

      // Then update the worker state after modal is closed
      setTimeout(() => {
        // Remove the marketplace data from the worker registry
        updateWorker(activeWorkerId, {
          marketplaceData: null,
        })
      }, 100)
    } catch (error: any) {
      addNotification('error', `Failed to unpublish worker: ${error.message}`, activeWorkerId)
    } finally {
      setIsUnpublishing(false)
    }
  }

  const LabelWithTooltip = ({ name, tooltip }: { name: string; tooltip: string }) => (
    <div className='flex items-center gap-1.5'>
      <FormLabel>{name}</FormLabel>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className='h-4 w-4 cursor-help text-muted-foreground' />
        </TooltipTrigger>
        <TooltipContent side='top' className='max-w-[300px] p-3'>
          <p className='text-sm'>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )

  // Render marketplace information for published workers
  const renderMarketplaceInfo = () => {
    if (isLoading) {
      return (
        <div className='flex items-center justify-center py-12'>
          <LoadingAgent size='md' />
        </div>
      )
    }

    if (!marketplaceInfo) {
      return (
        <div className='flex items-center justify-center py-12 text-muted-foreground'>
          <div className='flex flex-col items-center gap-2'>
            <Info className='h-5 w-5' />
            <p className='text-sm'>No marketplace information available</p>
          </div>
        </div>
      )
    }

    return (
      <div className='space-y-5 px-1'>
        {/* Header section with title and stats */}
        <div className='space-y-2.5'>
          <div className='flex items-start justify-between'>
            <h3 className='font-medium text-xl leading-tight'>{marketplaceInfo.name}</h3>
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-1.5 rounded-md px-2 py-1'>
                <Eye className='h-3.5 w-3.5 text-muted-foreground' />
                <span className='font-medium text-muted-foreground text-xs'>
                  {marketplaceInfo.views}
                </span>
              </div>
            </div>
          </div>
          <p className='text-muted-foreground text-sm'>{marketplaceInfo.description}</p>
        </div>

        {/* Category and Author Info */}
        <div className='flex items-center gap-6'>
          <div className='space-y-1.5'>
            <Label className='text-muted-foreground text-xs'>Category</Label>
            <div
              className='flex items-center gap-1.5 rounded-md px-2.5 py-1'
              style={{
                backgroundColor: `${getCategoryColor(marketplaceInfo.category)}15`,
                color: getCategoryColor(marketplaceInfo.category),
              }}
            >
              {getCategoryIcon(marketplaceInfo.category)}
              <span className='font-medium text-sm'>
                {getCategoryLabel(marketplaceInfo.category)}
              </span>
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label className='text-muted-foreground text-xs'>Author</Label>
            <div className='flex items-center font-medium text-sm'>
              {marketplaceInfo.authorName}
            </div>
          </div>
        </div>

        {/* Action buttons - Only show unpublish if owner */}
        {isOwner() && (
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              type='button'
              variant='destructive'
              onClick={handleUnpublish}
              disabled={isUnpublishing}
              className='gap-2'
            >
              {isUnpublishing ? (
                <div className='mr-2 h-4 w-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent' />
              ) : (
                <Trash className='mr-2 h-4 w-4' />
              )}
              {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Render publish form for unpublished workers
  const renderPublishForm = () => (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <Notice variant='warning' title='Security'>
          API keys and environment variables will be automatically removed before publishing.
        </Notice>

        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Worker Name</FormLabel>
              <FormControl>
                <Input placeholder='Enter worker name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Describe what your worker does and how it can help others'
                  className='min-h-24'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='category'
          render={({ field }) => (
            <FormItem>
              <LabelWithTooltip name='Category' tooltip={TOOLTIPS.category} />
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select a category' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem
                      key={category.value}
                      value={category.value}
                      className='flex items-center'
                    >
                      <div className='flex items-center'>
                        {category.icon}
                        {category.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='authorName'
          render={({ field }) => (
            <FormItem>
              <LabelWithTooltip name='Author Name' tooltip={TOOLTIPS.authorName} />
              <FormControl>
                <Input placeholder='Enter author name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex justify-between gap-2'>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type='submit'
            disabled={isSubmitting}
            className={cn(
              // Base styles
              'gap-2 font-medium',
              // Brand color with hover states
              'bg-[#802FFF] hover:bg-[#7028E6]',
              // Hover effect with brand color
              'shadow-[0_0_0_0_#802FFF] hover:shadow-[0_0_0_4px_rgba(127,47,255,0.15)]',
              // Text color and transitions
              'text-white transition-all duration-200',
              // Running state animation
              isSubmitting &&
              'relative after:absolute after:inset-0 after:animate-pulse after:bg-white/20',
              // Disabled state
              'disabled:opacity-50 disabled:hover:bg-[#802FFF] disabled:hover:shadow-none'
            )}
          >
            {isSubmitting ? 'Publishing...' : 'Publish Worker'}
          </Button>
        </div>
      </form>
    </FormProvider>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex flex-col gap-0 p-0 sm:max-w-[600px]'>
        <DialogHeader className='border-b px-6 py-4'>
          <DialogTitle className='font-medium text-lg'>
            {isPublished() ? 'Marketplace Information' : 'Publish to Marketplace'}
          </DialogTitle>
        </DialogHeader>

        <div className='overflow-y-auto px-6 pt-4 pb-6'>
          {isPublished() ? renderMarketplaceInfo() : renderPublishForm()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
