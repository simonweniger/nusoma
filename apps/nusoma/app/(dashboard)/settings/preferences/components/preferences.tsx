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
import { resetAllStores } from '@/stores'

const TOOLTIPS = {
  debugMode: 'Enable visual debugging information during execution.',
  autoConnect: 'Automatically connect nodes.',
  autoFillEnvVars: 'Automatically fill API keys.',
  telemetry: 'Allow nusoma to collect anonymous telemetry data to improve the product.', // Added telemetry tooltip text
  resetData: 'Permanently delete all workers, settings, and stored data.',
}

// --- API Helper Functions (assumed structure, adjust to your actual API) ---
interface GeneralSettings {
  isAutoConnectEnabled: boolean
  isDebugModeEnabled: boolean
  isAutoFillEnvVarsEnabled: boolean
  telemetryEnabled: boolean
}

const fetchGeneralSettings = async (): Promise<GeneralSettings> => {
  // Replace with your actual API endpoint for fetching settings
  const response = await fetch('/api/general-settings')
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to load general settings')
  }
  return response.json()
}

const updateGeneralSettingAPI = async (payload: {
  settingName: keyof GeneralSettings
  value: boolean
}) => {
  // Replace with your actual API endpoint for updating a setting
  const response = await fetch('/api/general-settings/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [payload.settingName]: payload.value }),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to update ${payload.settingName}`)
  }
  return response.json()
}

export function General() {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generalSettings'] })
    },
    onError: (error, variables) => {
      toast.error(`Failed to update ${variables.settingName}:`, {
        description: error.message,
      })
    },
  })

  const _handleSettingChange = (settingName: keyof GeneralSettings, checked: boolean) => {
    if (checked !== settings?.[settingName]) {
      updateSettingMutation.mutate({ settingName, value: checked })
    }

    const handleResetData = () => {
      resetAllStores()
      queryClient.removeQueries({ queryKey: ['generalSettings'] })
      router.push('/workspace/1')
    }

    const isLoading = isLoadingSettings || updateSettingMutation.isPending

    return (
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
                  onCheckedChange={(checked) => _handleSettingChange('isDebugModeEnabled', checked)}
                  disabled={isLoading}
                  isAlternatingBg={false}
                />
                {/* Auto-Connect Setting */}
                <SettingRow
                  id='auto-connect'
                  label='Auto-connect on drop'
                  tooltip={TOOLTIPS.autoConnect}
                  checked={settings?.isAutoConnectEnabled ?? false}
                  onCheckedChange={(checked) =>
                    _handleSettingChange('isAutoConnectEnabled', checked)
                  }
                  disabled={isLoading}
                  isAlternatingBg={true}
                />
                {/* Auto-Fill Env Vars Setting */}
                <SettingRow
                  id='auto-fill-env-vars'
                  label='Auto-fill environment variables'
                  tooltip={TOOLTIPS.autoFillEnvVars}
                  checked={settings?.isAutoFillEnvVarsEnabled ?? false}
                  onCheckedChange={(checked) =>
                    _handleSettingChange('isAutoFillEnvVarsEnabled', checked)
                  }
                  disabled={isLoading}
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
    )
  }
}

// Helper component for individual setting rows to reduce repetition
interface SettingRowProps {
  id: string
  label: string
  tooltip: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled: boolean
  isAlternatingBg: boolean
}

const SettingRow: React.FC<SettingRowProps> = ({
  id,
  label,
  tooltip,
  checked,
  onCheckedChange,
  disabled,
  isAlternatingBg,
}) => (
  <div
    className={`\${isAlternatingBg ? 'bg-muted/30' : 'bg-muted/10'} flex h-14 items-center justify-between px-4`}
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
            className='h-7 p-1 text-gray-500'
            aria-label={`Learn more about ${label}`}
            disabled={disabled}
          >
            <Info className='h-5 w-5' />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='top' className='max-w-[300px] p-3'>
          <p className='text-sm'>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
  </div>
)

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
