/** biome-ignore-all lint/nursery/useUniqueElementIds: ignored */
'use client'
import { type ReactNode, useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@nusoma/design-system/components/ui/alert-dialog'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@nusoma/design-system/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@nusoma/design-system/components/ui/dialog'
import { Input } from '@nusoma/design-system/components/ui/input'
import { Label } from '@nusoma/design-system/components/ui/label'
import { Skeleton } from '@nusoma/design-system/components/ui/skeleton'
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  FileText,
  GraduationCap,
  KeySquare,
  Plus,
  Trash2,
} from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { createLogger } from '@/lib/logger/console-logger'

const logger = createLogger('ApiKeys')

interface Guide {
  icon: ReactNode
  iconBg: string
  iconColor: string
  title: string
  description: string
}

const _guides: Guide[] = [
  {
    icon: <BookOpen size={20} />,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Start guide',
    description: 'Quick tips for beginners',
  },
  {
    icon: <FileText size={20} />,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    title: 'Feature guide',
    description: 'How Linear works',
  },
  {
    icon: <GraduationCap size={20} />,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    title: 'Linear method',
    description: 'Best practices for building',
  },
]

const _GuideCard = ({ guide }: { guide: Guide }) => {
  return (
    <div className='flex items-start gap-3 rounded-lg border bg-card p-5'>
      <div className='shrink-0'>{guide.icon}</div>
      <div className='-mt-1 w-full'>
        <h3 className='font-medium text-card-foreground text-sm'>{guide.title}</h3>
        <p className='mt-1 line-clamp-1 text-muted-foreground text-xs'>{guide.description}</p>
      </div>
      <Button variant='ghost' size='icon' className='shrink-0'>
        <ArrowRight size={16} />
      </Button>
    </div>
  )
}

interface ApiKeysProps {
  onOpenChange?: (open: boolean) => void
}

interface ApiKey {
  id: string
  name: string
  key: string
  lastUsed?: string
  createdAt: string
  expiresAt?: string
}

export default function ApiKeysSettingsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<ApiKey | null>(null)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [deleteKey, setDeleteKey] = useState<ApiKey | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // Fetch API keys
  const fetchApiKeys = async () => {
    if (!userId) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/user/api-keys')
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.keys || [])
      }
    } catch (error) {
      logger.error('Error fetching API keys:', { error })
    } finally {
      setIsLoading(false)
    }
  }

  // Generate a new API key
  const handleCreateKey = async () => {
    if (!userId || !newKeyName.trim()) {
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Show the new key dialog with the API key (only shown once)
        setNewKey(data.key)
        setShowNewKeyDialog(true)
        // Reset form
        setNewKeyName('')
        // Refresh the keys list
        fetchApiKeys()
      }
    } catch (error) {
      logger.error('Error creating API key:', { error })
    } finally {
      setIsCreating(false)
    }
  }

  // Delete an API key
  const handleDeleteKey = async () => {
    if (!userId || !deleteKey) {
      return
    }

    try {
      const response = await fetch(`/api/user/api-keys/${deleteKey.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh the keys list
        fetchApiKeys()
        // Close the dialog
        setShowDeleteDialog(false)
        setDeleteKey(null)
      }
    } catch (error) {
      logger.error('Error deleting API key:', { error })
    }
  }

  // Copy API key to clipboard
  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  // Load API keys on mount
  useEffect(() => {
    if (userId) {
      fetchApiKeys()
    }
  }, [userId])

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return 'Never'
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className='mx-auto mt-12 flex w-full max-w-3xl flex-col justify-center py-8'>
      <div className='mb-10'>
        <h1 className='mb-1 font-semibold text-2xl'>API keys</h1>
        <p className='text-muted-foreground'>Manage your API keys.</p>
      </div>

      <Card className='mb-10'>
        <CardHeader className='flex justify-between px-5'>
          <div>
            <CardTitle className='mb-2 text-foreground'>Your API keys</CardTitle>
            <CardDescription>
              API keys allow you to authenticate and interact with your Workforce.
              <br />
              Keep your API keys secure, they have access to your account data.
            </CardDescription>
          </div>
          {apiKeys.length !== 0 && (
            <Button onClick={() => setIsCreating(true)} disabled={isLoading} size='sm'>
              <Plus className='h-4 w-4' />
              Create Key
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='mt-6 space-y-3'>
              <KeySkeleton />
              <KeySkeleton />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className='rounded-md border border-dashed bg-muted/20 p-8'>
              <div className='flex flex-col items-center justify-center text-center'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
                  <KeySquare className='h-6 w-6 text-primary' />
                </div>
                <h3 className='mt-4 font-medium text-lg'>No API keys yet</h3>
                <p className='mt-2 max-w-sm text-muted-foreground text-sm'>
                  You don&apos;t have any API keys yet. Create one to get started with the nusoma
                  SDK.
                </p>
                <Button
                  variant='default'
                  className='mt-4'
                  onClick={() => setIsCreating(true)}
                  size='sm'
                >
                  <Plus className='mr-1.5 h-4 w-4' /> Create API Key
                </Button>
              </div>
            </div>
          ) : (
            <div className='mt-2 space-y-4'>
              {apiKeys.map((key) => (
                <Card key={key.id} className='p-4 transition-shadow hover:shadow-elevation-low'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-1'>
                      <h3 className='font-medium text-base'>{key.name}</h3>
                      <div className='flex items-center space-x-1'>
                        <p className='text-muted-foreground text-xs'>
                          Created: {formatDate(key.createdAt)} • Last used:{' '}
                          {formatDate(key.lastUsed)}
                        </p>
                        <div className='rounded bg-muted/50 px-1.5 py-0.5 font-mono text-xs'>
                          •••••{key.key.slice(-6)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant='destructive'
                      size='icon'
                      onClick={() => {
                        setDeleteKey(key)
                        setShowDeleteDialog(true)
                      }}
                    >
                      <Trash2 className='h-4 w-4' />
                      <span className='sr-only'>Delete key</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>

        {/* Create API Key Dialog */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Create new API key</DialogTitle>
              <DialogDescription>
                Name your API key to help you identify it later. This key will have access to your
                account and workers.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-3'>
              <div className='space-y-2'>
                <Label htmlFor='keyName'>API Key Name</Label>
                <Input
                  id='keyName'
                  placeholder='e.g., Development, Production, etc.'
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className='focus-visible:ring-primary'
                />
              </div>
            </div>
            <DialogFooter className='gap-2 sm:justify-end'>
              <Button variant='outline' onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New API Key Dialog */}
        <Dialog
          open={showNewKeyDialog}
          onOpenChange={(open) => {
            setShowNewKeyDialog(open)
            if (!open) {
              setNewKey(null)
            }
          }}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Your API key has been created</DialogTitle>
              <DialogDescription>
                This is the only time you will see your API key. Copy it now and store it securely.
              </DialogDescription>
            </DialogHeader>
            {newKey && (
              <div className='space-y-4 py-3'>
                <div className='space-y-2'>
                  <Label>API Key</Label>
                  <div className='relative'>
                    <Input
                      readOnly
                      value={newKey.key}
                      className='border-slate-300 bg-muted/50 pr-10 font-mono text-sm'
                    />
                    <Button
                      variant='ghost'
                      size='sm'
                      className='-translate-y-1/2 absolute top-1/2 right-1 h-7 w-7'
                      onClick={() => copyToClipboard(newKey.key)}
                    >
                      {copySuccess ? (
                        <Check className='h-4 w-4 text-green-500' />
                      ) : (
                        <Copy className='h-4 w-4' />
                      )}
                      <span className='sr-only'>Copy to clipboard</span>
                    </Button>
                  </div>
                  <p className='mt-1 text-muted-foreground text-xs'>
                    For security, we don&apos;t store the complete key. You won&apos;t be able to
                    view it again.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter className='sm:justify-end'>
              <Button
                onClick={() => {
                  setShowNewKeyDialog(false)
                  setNewKey(null)
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className='sm:max-w-md'>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete API Key</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteKey && (
                  <>
                    Are you sure you want to delete the API key{' '}
                    <span className='font-semibold'>{deleteKey.name}</span>? This action cannot be
                    undone and any integrations using this key will no longer work.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className='gap-2 sm:justify-end'>
              <AlertDialogCancel onClick={() => setDeleteKey(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteKey}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      {/* <div className='mb-10'>
        <div className='mb-6 flex items-center justify-between'>
          <h2 className='font-semibold text-xl'>Go further</h2>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {guides.map((guide, index) => (
            <GuideCard key={index} guide={guide} />
          ))}
        </div>
      </div> */}
    </div>
  )
}

function KeySkeleton() {
  return (
    <Card className='p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <Skeleton className='mb-2 h-5 w-32' />
          <Skeleton className='h-4 w-48' />
        </div>
        <Skeleton className='h-8 w-8 rounded-md' />
      </div>
    </Card>
  )
}
