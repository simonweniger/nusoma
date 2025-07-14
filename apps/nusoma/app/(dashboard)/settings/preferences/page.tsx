'use client'

import React from 'react'
import { ThemeToggle } from '@nusoma/design-system/components/theme-toggle'
import { Alert, AlertDescription } from '@nusoma/design-system/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@nusoma/design-system/components/ui/alert-dialog'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@nusoma/design-system/components/ui/card'
import { Label } from '@nusoma/design-system/components/ui/label'
import { Skeleton } from '@nusoma/design-system/components/ui/skeleton'
import { Switch } from '@nusoma/design-system/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger/console-logger'
import { resetAllStores } from '@/stores'

const _logger = createLogger('PreferencesSettingsPage')

const TOOLTIPS = {
  debugMode: 'Enable visual debugging information during execution.',
  autoConnect: 'Automatically connect nodes.',
  autoFillEnvVars: 'Automatically fill API keys.',
  telemetry: 'Allow nusoma to collect anonymous telemetry data to improve the product.', // Added telemetry tooltip text
  resetData: 'Permanently delete all workers, settings, and stored data.',
}

// --- Component-specific types and definitions ---
interface SettingRowProps {
  id: string
  label: string
  tooltip: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled: boolean
  isAlternatingBg: boolean
}

// Memoize the SettingRow component to prevent unnecessary re-renders
const SettingRow = React.memo<SettingRowProps>(
  ({ id, label, tooltip, checked, onCheckedChange, disabled, isAlternatingBg }) => (
    <div
      className={`flex h-14 items-center justify-between px-4 ${isAlternatingBg ? 'bg-muted/30' : 'bg-muted/10'}`}
    >
      <div className='flex items-center gap-2'>
        <Label htmlFor={id} className='font-medium'>
          {label}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='h-7 p-1 text-muted-foreground/60'
              aria-label={`Learn more about ${label}`}
            >
              <Info className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top' className='max-w-[300px] p-3'>
            <p className='text-sm'>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
)
SettingRow.displayName = 'SettingRow' // Adding displayName for better debugging

const SettingRowSkeleton = () => (
  <div className='rounded-lg border border-border'>
    <div className='flex h-14 items-center justify-between bg-muted/10 px-4'>
      <div className='flex items-center gap-2'>
        <Skeleton className='h-5 w-32' />
        <Skeleton className='h-5 w-5 rounded-full' />
      </div>
      <Skeleton className='h-6 w-12' />
    </div>
  </div>
)
SettingRowSkeleton.displayName = 'SettingRowSkeleton' // Adding displayName

// --- API Helper Functions (assumed structure, adjust to your actual API) ---
// Interface for the component's state and TanStack Query
interface GeneralSettings {
  isAutoConnectEnabled: boolean
  isDebugModeEnabled: boolean
  isAutoFillEnvVarsEnabled: boolean
  telemetryEnabled: boolean
}

// Maps frontend setting keys to backend/DB keys
const keyMapToDB: Partial<Record<keyof GeneralSettings, string>> = {
  isAutoConnectEnabled: 'autoConnect',
  isDebugModeEnabled: 'debugMode',
  isAutoFillEnvVarsEnabled: 'autoFillEnvVars',
  telemetryEnabled: 'telemetryEnabled',
}

const fetchGeneralSettings = async (): Promise<GeneralSettings> => {
  const response = await fetch('/api/user/settings') // Use existing endpoint
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to load general settings')
  }
  const { data: apiData } = await response.json() // Existing API returns { data: { ... } }

  // Map API response to GeneralSettings interface
  return {
    isAutoConnectEnabled: apiData.autoConnect ?? true, // Provide defaults from original Zustand store if needed
    isDebugModeEnabled: apiData.debugMode ?? false,
    isAutoFillEnvVarsEnabled: apiData.autoFillEnvVars ?? true,
    telemetryEnabled: apiData.telemetryEnabled ?? true, // Assuming telemetry is part of /api/user/settings
  }
}

const updateGeneralSettingAPI = async (payload: {
  settingName: keyof GeneralSettings // e.g., 'isAutoConnectEnabled'
  value: boolean
}) => {
  const dbKey = keyMapToDB[payload.settingName]
  if (!dbKey) {
    throw new Error(`Invalid setting name for update: ${payload.settingName}`)
  }

  const response = await fetch('/api/user/settings', {
    // Use existing endpoint
    method: 'PATCH', // Existing API uses PATCH
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [dbKey]: payload.value }), // Send { autoConnect: true } or { debugMode: false }
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to update ${payload.settingName}`)
  }
  return response.json() // API returns { success: true } or the updated settings data
}

export default function PreferencesSettingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery<GeneralSettings, Error>({
    queryKey: ['generalSettings'],
    queryFn: fetchGeneralSettings,
  })

  const updateSettingMutation = useMutation<
    unknown,
    Error,
    { settingName: keyof GeneralSettings; value: boolean }
  >({
    mutationFn: updateGeneralSettingAPI,
    // Use optimistic updates to prevent UI flicker
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['generalSettings'] })

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<GeneralSettings>(['generalSettings'])

      // Optimistically update to the new value
      if (previousSettings) {
        queryClient.setQueryData<GeneralSettings>(['generalSettings'], {
          ...previousSettings,
          [variables.settingName]: variables.value,
        })
      }

      // Return a context object with the snapshot
      return { previousSettings }
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error, variables) => {
      toast.error(`Failed to update ${variables.settingName}:`, {
        description: error.message,
      })
    },
    // Always refetch after error or success to ensure data consistency
    onSettled: () => {
      // We don't need to invalidate and refetch immediately - this prevents UI flicker
      // The data will be refreshed on the next user interaction or when the component remounts
      // queryClient.invalidateQueries({ queryKey: ['generalSettings'] })
    },
  })

  const handleSettingChange = React.useCallback(
    (settingName: keyof GeneralSettings, checked: boolean) => {
      if (checked !== settings?.[settingName]) {
        updateSettingMutation.mutate({ settingName, value: checked })
      }
    },
    [settings, updateSettingMutation]
  )

  const handleResetData = React.useCallback(() => {
    resetAllStores()
    queryClient.removeQueries({ queryKey: ['generalSettings'] })
    router.push('/workspace/1')
  }, [queryClient, router])

  return (
    <div className='mx-auto mt-12 flex w-full max-w-3xl flex-col justify-center py-8'>
      <div className='mb-10 w-full'>
        <h1 className='mb-1 font-semibold text-2xl'>Preferences</h1>
        <p className='text-muted-foreground'>Manage your preferences settings.</p>
      </div>
      <div className='flex w-full flex-col'>
        <div>
          {settingsError && (
            <Alert variant='destructive' className='mb-4'>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription className='flex items-center justify-between'>
                <span>Failed to load settings: {settingsError.message}</span>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => refetchSettings()}
                  disabled={isLoadingSettings}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Card className='rounded-b-none'>
            <CardHeader className='p-4'>
              <CardTitle className='text-card-foreground text-lg'>General Settings</CardTitle>
              <CardDescription>General settings for your workspace</CardDescription>
            </CardHeader>
            <CardContent className='mb-8 space-y-4'>
              {isLoadingSettings && !settings ? ( // Show skeletons only on initial load
                <>
                  <SettingRowSkeleton />
                  <SettingRowSkeleton />
                  <SettingRowSkeleton />
                  <SettingRowSkeleton />
                  <SettingRowSkeleton />
                </>
              ) : (
                <div className='rounded-lg border border-border'>
                  {/* Theme Setting */}
                  <div className='flex h-14 items-center justify-between bg-muted/30 px-4'>
                    <Label htmlFor='theme-select' className='font-medium'>
                      Theme
                    </Label>
                    <div className='mr-2 scale-125'>
                      <ThemeToggle />
                    </div>
                  </div>

                  {/* Debug Mode Setting */}
                  <SettingRow
                    id='debug-mode'
                    label='Debug mode'
                    tooltip={TOOLTIPS.debugMode}
                    checked={settings?.isDebugModeEnabled ?? false}
                    onCheckedChange={(checked) =>
                      handleSettingChange('isDebugModeEnabled', checked)
                    }
                    disabled={isLoadingSettings || updateSettingMutation.isPending}
                    isAlternatingBg={false}
                  />
                  {/* Auto-Connect Setting */}
                  <SettingRow
                    id='auto-connect'
                    label='Auto-connect on drop'
                    tooltip={TOOLTIPS.autoConnect}
                    checked={settings?.isAutoConnectEnabled ?? false}
                    onCheckedChange={(checked) =>
                      handleSettingChange('isAutoConnectEnabled', checked)
                    }
                    disabled={isLoadingSettings || updateSettingMutation.isPending}
                    isAlternatingBg={true}
                  />
                  {/* Auto-Fill Env Vars Setting */}
                  <SettingRow
                    id='auto-fill-env-vars'
                    label='Auto-fill environment variables'
                    tooltip={TOOLTIPS.autoFillEnvVars}
                    checked={settings?.isAutoFillEnvVarsEnabled ?? false}
                    onCheckedChange={(checked) =>
                      handleSettingChange('isAutoFillEnvVarsEnabled', checked)
                    }
                    disabled={isLoadingSettings || updateSettingMutation.isPending}
                    isAlternatingBg={false}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone Section */}
          <div className='mt-[-1px] flex items-center justify-between rounded-b-lg bg-muted px-4 py-2'>
            {' '}
            {/* Adjusted margin for better connection */}
            <div className='flex items-center gap-2'>
              <Label className='font-medium'>Reset all data</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 p-1 text-gray-500'
                    aria-label='Learn more about resetting all data'
                    disabled={isLoadingSettings}
                  >
                    <Info className='h-5 w-5' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='top' className='max-w-[300px] p-3'>
                  <p className='text-sm'>{TOOLTIPS.resetData}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant='destructive' size='sm' disabled={isLoadingSettings}>
                  Reset Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all your workers,
                    settings, and stored data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetData}
                    className='bg-red-600 hover:bg-red-700'
                  >
                    Reset Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
      {/* <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Go further</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {guides.map((guide, index) => (
            <GuideCard key={index} guide={guide} />
          ))}
        </div>
      </div> */}
    </div>
  )
}
