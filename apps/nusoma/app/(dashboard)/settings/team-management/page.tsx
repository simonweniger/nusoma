'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@nusoma/design-system/components/ui/alert'
import { Button } from '@nusoma/design-system/components/ui/button'
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
import { Progress } from '@nusoma/design-system/components/ui/progress'
import { Skeleton } from '@nusoma/design-system/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@nusoma/design-system/components/ui/tabs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Copy, PlusCircle, RefreshCw, UserX, XCircle } from 'lucide-react'
import { client, useSession } from '@/lib/auth-client'
import { createLogger } from '@/lib/logger/console-logger'
import { checkEnterprisePlan } from '@/lib/subscription/utils'
import { TeamSeatsDialog } from '../subscription/components/team-seats-dialog'
import {
  useCancelInvitation,
  useConfirmTeamUpgrade,
  useCreateOrganization,
  useInviteMember,
  useRemoveMember,
  useSetActiveOrg,
  useUpdateSeats,
} from './mutations'

const logger = createLogger('TeamManagement')

// API fetching functions for TanStack Query
const fetchTeamData = async () => {
  const [orgsResponse, subStatusResponse] = await Promise.all([
    client.organization.list(),
    fetch('/api/user/subscription'),
  ])

  if (orgsResponse.error) {
    throw new Error(orgsResponse.error.message)
  }
  if (!subStatusResponse.ok) {
    throw new Error('Failed to fetch subscription status')
  }

  const organizations = orgsResponse.data || []
  const subStatus = await subStatusResponse.json()

  return { organizations, subStatus }
}

const fetchOrganizationSubscription = async (orgId: string, hasEnterprise: boolean) => {
  logger.info('Loading subscription for organization', { orgId })

  const { data, error } = await client.subscription.list({
    query: { referenceId: orgId },
  })

  if (error) {
    logger.error('Error fetching organization subscription', { error })
    throw new Error('Failed to load subscription data')
  }

  logger.info('Organization subscription data loaded', {
    subscriptions: data?.map((s) => ({
      id: s.id,
      plan: s.plan,
      status: s.status,
      seats: s.seats,
      referenceId: s.referenceId,
    })),
  })

  const teamSubscription = data?.find((sub) => sub.status === 'active' && sub.plan === 'team')
  const enterpriseSubscription = data?.find((sub) => checkEnterprisePlan(sub))
  const activeSubscription = enterpriseSubscription || teamSubscription

  if (activeSubscription) {
    logger.info('Found active subscription', {
      id: activeSubscription.id,
      plan: activeSubscription.plan,
      seats: activeSubscription.seats,
    })
    return activeSubscription
  }

  if (hasEnterprise) {
    try {
      const enterpriseResponse = await fetch('/api/user/subscription/enterprise')
      if (enterpriseResponse.ok) {
        const enterpriseData = await enterpriseResponse.json()
        if (enterpriseData.subscription) {
          logger.info('Found enterprise subscription', {
            id: enterpriseData.subscription.id,
            seats: enterpriseData.subscription.seats,
          })
          return enterpriseData.subscription
        }
      }
    } catch (err) {
      logger.error('Error fetching enterprise subscription', { error: err })
    }
  }

  logger.warn('No active subscription found for organization', { orgId })
  return null
}

type User = { name?: string; email?: string }

type Member = {
  id: string
  role: string
  user?: User
}

type Invitation = {
  id: string
  email: string
  status: string
}

type Organization = {
  id: string
  name: string
  slug: string
  members?: Member[]
  invitations?: Invitation[]
  createdAt: string | Date
  [key: string]: unknown
}

interface SubscriptionMetadata {
  perSeatAllowance?: number
  totalAllowance?: number
  [key: string]: unknown
}

type Subscription = {
  id: string
  plan: string
  status: string
  seats?: number
  referenceId: string
  cancelAtPeriodEnd?: boolean
  periodEnd?: number | Date
  trialEnd?: number | Date
  metadata?: SubscriptionMetadata
  [key: string]: unknown
}

function calculateSeatUsage(org?: Organization | null) {
  const members = org?.members?.length ?? 0
  const pending = org?.invitations?.filter((inv) => inv.status === 'pending').length ?? 0
  return { used: members + pending, members, pending }
}

function useOrganizationRole(userEmail: string | undefined, org: Organization | null | undefined) {
  return useMemo(() => {
    if (!userEmail || !org?.members) {
      return { userRole: 'member', isAdminOrOwner: false }
    }
    const currentMember = org.members.find((m) => m.user?.email === userEmail)
    const role = currentMember?.role ?? 'member'
    return {
      userRole: role,
      isAdminOrOwner: role === 'owner' || role === 'admin',
    }
  }, [userEmail, org])
}

export default function TeamManagement() {
  const { data: session } = useSession()
  const { data: activeOrg } = client.useActiveOrganization()
  const _queryClient = useQueryClient()

  const {
    data: teamData,
    isLoading: isLoadingTeamData,
    error: teamDataError,
  } = useQuery({
    queryKey: ['teamData', session?.user?.id],
    queryFn: fetchTeamData,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000,
  })

  const organizations = teamData?.organizations ?? []
  const hasTeamPlan = teamData?.subStatus?.isTeam ?? false
  const hasEnterprisePlan = teamData?.subStatus?.isEnterprise ?? false

  const {
    data: subscriptionData,
    isLoading: isLoadingSubscription,
    error: subscriptionError,
  } = useQuery({
    queryKey: ['organizationSubscription', activeOrg?.id],
    queryFn: () => fetchOrganizationSubscription(activeOrg!.id, hasEnterprisePlan),
    enabled: !!activeOrg?.id && teamData !== undefined,
    staleTime: 5 * 60 * 1000,
  })

  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false)
  const [removeMemberDialog, setRemoveMemberDialog] = useState<{
    open: boolean
    memberId: string
    memberName: string
    shouldReduceSeats: boolean
  }>({ open: false, memberId: '', memberName: '', shouldReduceSeats: false })
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('members')

  const [isAddSeatDialogOpen, setIsAddSeatDialogOpen] = useState(false)
  const [_newSeatCount, _setNewSeatCount] = useState(1)
  const [_isUpdatingSeats, _setIsUpdatingSeats] = useState(false)

  // Mutations
  const createOrgMutation = useCreateOrganization()
  const setActiveOrgMutation = useSetActiveOrg()
  const inviteMemberMutation = useInviteMember()
  const removeMemberMutation = useRemoveMember()
  const cancelInvitationMutation = useCancelInvitation()
  const updateSeatsMutation = useUpdateSeats()
  const confirmTeamUpgradeMutation = useConfirmTeamUpgrade()

  const { userRole, isAdminOrOwner } = useOrganizationRole(session?.user?.email, activeOrg)
  const { used: usedSeats } = useMemo(() => calculateSeatUsage(activeOrg), [activeOrg])

  useEffect(() => {
    if (createOrgMutation.error) {
      setError(createOrgMutation.error.message)
    }
    if (setActiveOrgMutation.error) {
      setError(setActiveOrgMutation.error.message)
    }
    if (inviteMemberMutation.error) {
      setError(inviteMemberMutation.error.message)
    }
    if (removeMemberMutation.error) {
      setError(removeMemberMutation.error.message)
    }
    if (cancelInvitationMutation.error) {
      setError(cancelInvitationMutation.error.message)
    }
    if (updateSeatsMutation.error) {
      setError(updateSeatsMutation.error.message)
    }
    if (confirmTeamUpgradeMutation.error) {
      setError(confirmTeamUpgradeMutation.error.message)
    }
  }, [
    createOrgMutation.error,
    setActiveOrgMutation.error,
    inviteMemberMutation.error,
    removeMemberMutation.error,
    cancelInvitationMutation.error,
    updateSeatsMutation.error,
    confirmTeamUpgradeMutation.error,
  ])

  useEffect(() => {
    if (hasTeamPlan || hasEnterprisePlan) {
      setOrgName(`${session?.user?.name || 'My'}'s Team`)
      setOrgSlug(generateSlug(`${session?.user?.name || 'My'}'s Team`))
    }
  }, [hasTeamPlan, hasEnterprisePlan, session?.user?.name])

  // Handle seat reduction - remove members when seats are reduced
  const handleReduceSeats = () => {
    if (!session?.user || !activeOrg || !subscriptionData) {
      return
    }

    const currentSeats = subscriptionData.seats || 0
    if (currentSeats <= 1) {
      setError('Cannot reduce seats below 1')
      return
    }

    const { used: totalCount } = calculateSeatUsage(activeOrg)

    if (totalCount >= currentSeats) {
      setError(
        `You have ${totalCount} active members/invitations. Please remove members or cancel invitations before reducing seats.`
      )
      return
    }

    updateSeatsMutation.mutate(currentSeats - 1)
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-')
  }

  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setOrgName(newName)
    setOrgSlug(generateSlug(newName))
  }

  const handleCreateOrganization = () => {
    if (!session?.user) {
      return
    }

    setError(null)
    createOrgMutation.mutate(
      { orgName, orgSlug, hasTeamPlan, hasEnterprisePlan },
      {
        onSuccess: () => {
          setCreateOrgDialogOpen(false)
          setOrgName('')
          setOrgSlug('')
        },
      }
    )
  }

  // Upgrade to team subscription with organization as reference
  const confirmTeamUpgrade = (seats: number) => {
    if (!session?.user || !activeOrg) {
      return
    }

    setError(null)
    confirmTeamUpgradeMutation.mutate(seats)
  }

  // Set an organization as active
  const handleSetActiveOrg = (orgId: string) => {
    if (!session?.user) {
      return
    }
    setError(null)
    setActiveOrgMutation.mutate(orgId)
  }

  // Invite a member to the organization
  const handleInviteMember = () => {
    if (!session?.user || !activeOrg) {
      return
    }

    setError(null)
    setInviteSuccess(false)
    inviteMemberMutation.mutate(inviteEmail, {
      onSuccess: () => {
        setInviteEmail('')
        setInviteSuccess(true)
      },
    })
  }

  // Remove a member from the organization
  const handleRemoveMember = (member: any) => {
    if (!session?.user || !activeOrg) {
      return
    }

    // Open confirmation dialog
    setRemoveMemberDialog({
      open: true,
      memberId: member.id,
      memberName: member.user?.name || member.user?.email || 'this member',
      shouldReduceSeats: false,
    })
  }

  // Actual member removal after confirmation
  const confirmRemoveMember = (shouldReduceSeats = false) => {
    const { memberId } = removeMemberDialog
    if (!session?.user || !activeOrg || !memberId) {
      return
    }

    removeMemberMutation.mutate(
      { memberId, shouldReduceSeats },
      {
        onSuccess: () => {
          setRemoveMemberDialog({
            open: false,
            memberId: '',
            memberName: '',
            shouldReduceSeats: false,
          })
        },
      }
    )
  }

  // Cancel an invitation
  const handleCancelInvitation = (invitationId: string) => {
    if (!session?.user || !activeOrg) {
      return
    }
    setError(null)
    cancelInvitationMutation.mutate(invitationId)
  }

  const getEffectivePlanName = () => {
    if (!subscriptionData) {
      return 'No Plan'
    }

    if (checkEnterprisePlan(subscriptionData)) {
      return 'Enterprise'
    }
    if (subscriptionData.plan === 'team') {
      return 'Team'
    }
    return (
      subscriptionData.plan?.charAt(0).toUpperCase() + subscriptionData.plan?.slice(1) || 'Unknown'
    )
  }

  const _mutationError = (teamDataError || subscriptionError)?.message
  const isLoading = isLoadingTeamData || (!!activeOrg && isLoadingSubscription)
  const isMutating =
    createOrgMutation.isPending ||
    setActiveOrgMutation.isPending ||
    inviteMemberMutation.isPending ||
    removeMemberMutation.isPending ||
    cancelInvitationMutation.isPending ||
    updateSeatsMutation.isPending ||
    confirmTeamUpgradeMutation.isPending

  if (isLoading && !activeOrg && !(hasTeamPlan || hasEnterprisePlan)) {
    return <TeamManagementSkeleton />
  }

  const getInvitationStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <div className='flex items-center text-amber-500'>
            <RefreshCw className='mr-1 h-4 w-4' />
            <span>Pending</span>
          </div>
        )
      case 'accepted':
        return (
          <div className='flex items-center text-green-500'>
            <CheckCircle className='mr-1 h-4 w-4' />
            <span>Accepted</span>
          </div>
        )
      case 'canceled':
        return (
          <div className='flex items-center text-red-500'>
            <XCircle className='mr-1 h-4 w-4' />
            <span>Canceled</span>
          </div>
        )
      default:
        return status
    }
  }

  // No organization yet - show creation UI
  if (!activeOrg) {
    return (
      <div className='space-y-6 p-6'>
        <div className='space-y-6'>
          <h3 className='font-medium text-lg'>
            {hasTeamPlan || hasEnterprisePlan ? 'Create Your Team Workspace' : 'No Team Workspace'}
          </h3>

          {hasTeamPlan || hasEnterprisePlan ? (
            <div className='space-y-6 rounded-lg border p-6'>
              <p className='text-muted-foreground text-sm'>
                You're subscribed to a {hasEnterprisePlan ? 'enterprise' : 'team'} plan. Create your
                workspace to start collaborating with your team.
              </p>

              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='orgName' className='font-medium text-sm'>
                    Team Name
                  </Label>
                  <Input value={orgName} onChange={handleOrgNameChange} placeholder='My Team' />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='orgSlug' className='font-medium text-sm'>
                    Team URL
                  </Label>
                  <div className='flex items-center space-x-2'>
                    <div className='rounded-l-md bg-muted px-3 py-2 text-muted-foreground text-sm'>
                      nusoma.app/team/
                    </div>
                    <Input
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(e.target.value)}
                      className='rounded-l-none'
                    />
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant='destructive'>
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className='flex justify-end space-x-2'>
                <Button
                  onClick={handleCreateOrganization}
                  disabled={!orgName || !orgSlug || createOrgMutation.isPending}
                >
                  {createOrgMutation.isPending && (
                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  Create Team Workspace
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className='text-muted-foreground text-sm'>
                You don't have a team workspace yet. To collaborate with others, first upgrade to a
                team or enterprise plan.
              </p>

              <Button
                onClick={() => {
                  // Open the subscription tab
                  const event = new CustomEvent('open-settings', {
                    detail: { tab: 'subscription' },
                  })
                  window.dispatchEvent(event)
                }}
              >
                Upgrade to Team Plan
              </Button>
            </>
          )}
        </div>

        <Dialog open={createOrgDialogOpen} onOpenChange={setCreateOrgDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team Workspace</DialogTitle>
              <DialogDescription>
                Create a workspace for your team to collaborate on projects.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='orgName' className='font-medium text-sm'>
                  Team Name
                </Label>
                <Input value={orgName} onChange={handleOrgNameChange} placeholder='My Team' />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='orgSlug' className='font-medium text-sm'>
                  Team URL
                </Label>
                <div className='flex items-center space-x-2'>
                  <div className='rounded-l-md bg-muted px-3 py-2 text-muted-foreground text-sm'>
                    nusoma.app/team/
                  </div>
                  <Input
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    className='rounded-l-none'
                  />
                </div>
              </div>
            </div>

            {error && (
              <Alert variant='destructive'>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setCreateOrgDialogOpen(false)}
                disabled={createOrgMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrganization}
                disabled={!orgName || !orgSlug || createOrgMutation.isPending}
              >
                {createOrgMutation.isPending && <ButtonSkeleton />}
                <span className={createOrgMutation.isPending ? 'ml-2' : ''}>
                  Create Team Workspace
                </span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <h3 className='font-medium text-lg'>Team Management</h3>

        {organizations.length > 1 && (
          <div className='flex items-center space-x-2'>
            <select
              className='rounded-md border border-input bg-background px-3 py-2 text-sm'
              value={activeOrg.id}
              onChange={(e) => handleSetActiveOrg(e.target.value)}
              disabled={isMutating}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <Alert variant='destructive'>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value='members'>Members</TabsTrigger>
          <TabsTrigger value='settings'>Settings</TabsTrigger>
        </TabsList>

        <TabsContent value='members' className='mt-4 space-y-4'>
          {isAdminOrOwner && (
            <div className='rounded-md border p-4'>
              <h4 className='mb-4 font-medium text-sm'>Invite Team Members</h4>

              <div className='flex items-center space-x-2'>
                <Input
                  placeholder='Email address'
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviteMemberMutation.isPending}
                />
                <Button
                  onClick={handleInviteMember}
                  disabled={!inviteEmail || inviteMemberMutation.isPending}
                >
                  {inviteMemberMutation.isPending ? (
                    <ButtonSkeleton />
                  ) : (
                    <PlusCircle className='mr-2 h-4 w-4' />
                  )}
                  <span>Invite</span>
                </Button>
              </div>

              {inviteSuccess && (
                <p className='mt-2 text-green-500 text-sm'>Invitation sent successfully</p>
              )}
            </div>
          )}

          {/* Team Seats Usage - only show to admins/owners */}
          {isAdminOrOwner && (
            <div className='rounded-md border p-4'>
              <h4 className='mb-2 font-medium text-sm'>Team Seats</h4>

              {isLoadingSubscription ? (
                <TeamSeatsSkeleton />
              ) : subscriptionData ? (
                <>
                  <div className='mb-2 flex justify-between text-sm'>
                    <span>Used</span>
                    <span>
                      {usedSeats}/{subscriptionData.seats || 0}
                    </span>
                  </div>
                  <Progress
                    value={(usedSeats / (subscriptionData.seats || 1)) * 100}
                    className='h-2'
                  />

                  {checkEnterprisePlan(subscriptionData) ? (
                    <div />
                  ) : (
                    <div className='mt-4 flex justify-between'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleReduceSeats}
                        disabled={
                          (subscriptionData.seats || 0) <= 1 || updateSeatsMutation.isPending
                        }
                      >
                        Remove Seat
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setIsAddSeatDialogOpen(true)}
                        disabled={updateSeatsMutation.isPending}
                      >
                        Add Seat
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className='space-y-2 text-muted-foreground text-sm'>
                  <p>No active subscription found for this organization.</p>
                  <p>
                    This might happen if your subscription was created for your personal account but
                    hasn't been properly transferred to the organization.
                  </p>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setError(null)
                      confirmTeamUpgrade(2) // Start with 2 seats as default
                    }}
                    disabled={confirmTeamUpgradeMutation.isPending}
                  >
                    Set Up Team Subscription
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Team Members - show to all users */}
          <div className='rounded-md border'>
            <h4 className='border-b p-4 font-medium text-sm'>Team Members</h4>

            {activeOrg.members?.length === 0 ? (
              <div className='p-4 text-muted-foreground text-sm'>
                No members in this organization yet.
              </div>
            ) : (
              <div className='divide-y'>
                {activeOrg.members?.map((member: any) => (
                  <div key={member.id} className='flex items-center justify-between p-4'>
                    <div>
                      <div className='font-medium'>{member.user?.name || 'Unknown'}</div>
                      <div className='text-muted-foreground text-sm'>{member.user?.email}</div>
                      <div className='mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs'>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </div>
                    </div>

                    {/* Only show remove button for non-owners and if current user is admin/owner */}
                    {isAdminOrOwner &&
                      member.role !== 'owner' &&
                      member.user?.email !== session?.user?.email && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleRemoveMember(member)}
                          disabled={removeMemberMutation.isPending}
                        >
                          <UserX className='h-4 w-4' />
                        </Button>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Invitations - only show to admins/owners */}
          {isAdminOrOwner && (activeOrg.invitations?.length ?? 0) > 0 && (
            <div className='rounded-md border'>
              <h4 className='border-b p-4 font-medium text-sm'>Pending Invitations</h4>

              <div className='divide-y'>
                {activeOrg.invitations?.map((invitation: any) => (
                  <div key={invitation.id} className='flex items-center justify-between p-4'>
                    <div>
                      <div className='font-medium'>{invitation.email}</div>
                      <div className='mt-1 text-xs'>{getInvitationStatus(invitation.status)}</div>
                    </div>

                    {invitation.status === 'pending' && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleCancelInvitation(invitation.id)}
                        disabled={cancelInvitationMutation.isPending}
                      >
                        <XCircle className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value='settings' className='mt-4 space-y-4'>
          <div className='space-y-4 rounded-md border p-4'>
            <div>
              <h4 className='mb-2 font-medium text-sm'>Team Workspace Name</h4>
              <div className='font-medium'>{activeOrg.name}</div>
            </div>

            <div>
              <h4 className='mb-2 font-medium text-sm'>URL Slug</h4>
              <div className='flex items-center space-x-2'>
                <code className='rounded bg-muted px-2 py-1 text-sm'>{activeOrg.slug}</code>
                <Button variant='ghost' size='sm'>
                  <Copy className='h-4 w-4' />
                </Button>
              </div>
            </div>

            <div>
              <h4 className='mb-2 font-medium text-sm'>Created On</h4>
              <div className='text-sm'>{new Date(activeOrg.createdAt).toLocaleDateString()}</div>
            </div>

            {/* Only show subscription details to admins/owners */}
            {isAdminOrOwner && (
              <div>
                <h4 className='mb-2 font-medium text-sm'>Subscription Status</h4>
                {isLoadingSubscription ? (
                  <TeamSeatsSkeleton />
                ) : subscriptionData ? (
                  <div className='space-y-2'>
                    <div className='flex items-center space-x-2'>
                      <div
                        className={`h-2 w-2 rounded-full ${subscriptionData.status === 'active'
                            ? 'bg-green-500'
                            : subscriptionData.status === 'trialing'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                      />
                      <span className='font-medium capitalize'>
                        {getEffectivePlanName()} {subscriptionData.status}
                        {subscriptionData.cancelAtPeriodEnd ? ' (Cancels at period end)' : ''}
                      </span>
                    </div>
                    <div className='text-muted-foreground text-sm'>
                      <div>Team seats: {subscriptionData.seats}</div>
                      {checkEnterprisePlan(subscriptionData) && subscriptionData.metadata && (
                        <div>
                          {subscriptionData.metadata.perSeatAllowance && (
                            <div>
                              Per-seat allowance: ${subscriptionData.metadata.perSeatAllowance}
                            </div>
                          )}
                          {subscriptionData.metadata.totalAllowance && (
                            <div>Total allowance: ${subscriptionData.metadata.totalAllowance}</div>
                          )}
                        </div>
                      )}
                      {subscriptionData.periodEnd && (
                        <div>
                          Next billing date:{' '}
                          {new Date(subscriptionData.periodEnd).toLocaleDateString()}
                        </div>
                      )}
                      {subscriptionData.trialEnd && (
                        <div>
                          Trial ends: {new Date(subscriptionData.trialEnd).toLocaleDateString()}
                        </div>
                      )}
                      <div className='mt-2 text-xs'>
                        This subscription is associated with this team workspace.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='text-muted-foreground text-sm'>No active subscription found</div>
                )}
              </div>
            )}

            {!isAdminOrOwner && (
              <div>
                <h4 className='mb-2 font-medium text-sm'>Your Role</h4>
                <div className='text-sm'>
                  You are a <span className='font-medium capitalize'>{userRole}</span> of this
                  workspace.
                  {userRole === 'member' && (
                    <p className='mt-2 text-muted-foreground text-xs'>
                      Contact a workspace admin or owner for subscription changes or to invite new
                      members.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Member removal confirmation dialog */}
      <Dialog
        open={removeMemberDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveMemberDialog({ ...removeMemberDialog, open: false })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeMemberDialog.memberName} from the team?
            </DialogDescription>
          </DialogHeader>

          <div className='py-4'>
            <div className='flex items-center space-x-2'>
              <input
                type='checkbox'
                id='reduce-seats'
                className='rounded'
                checked={removeMemberDialog.shouldReduceSeats}
                onChange={(e) =>
                  setRemoveMemberDialog({
                    ...removeMemberDialog,
                    shouldReduceSeats: e.target.checked,
                  })
                }
              />
              <label htmlFor='reduce-seats' className='text-sm'>
                Also reduce seat count in my subscription
              </label>
            </div>
            <p className='mt-1 text-muted-foreground text-xs'>
              If selected, your team seat count will be reduced by 1, lowering your monthly billing.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() =>
                setRemoveMemberDialog({
                  open: false,
                  memberId: '',
                  memberName: '',
                  shouldReduceSeats: false,
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => confirmRemoveMember(removeMemberDialog.shouldReduceSeats)}
              disabled={removeMemberMutation.isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {subscriptionData && (
        <TeamSeatsDialog
          open={isAddSeatDialogOpen}
          onOpenChange={setIsAddSeatDialogOpen}
          title='Add Team Seats'
          description='Update your team size. Each additional seat allows another member to join your workspace.'
          currentSeats={subscriptionData.seats || 1}
          initialSeats={(subscriptionData.seats || 1) + 1}
          isLoading={updateSeatsMutation.isPending}
          onConfirm={async (selectedSeats: number) => {
            updateSeatsMutation.mutate(selectedSeats, {
              onSuccess: () => setIsAddSeatDialogOpen(false),
            })
          }}
          confirmButtonText='Update Seats'
          showCostBreakdown={true}
        />
      )}
    </div>
  )
}

function TeamManagementSkeleton() {
  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-6 w-40' />
        <Skeleton className='h-9 w-32' />
      </div>

      <div className='space-y-4'>
        <div className='rounded-md border p-4'>
          <Skeleton className='mb-4 h-5 w-32' />
          <div className='flex items-center space-x-2'>
            <Skeleton className='h-9 flex-1' />
            <Skeleton className='h-9 w-24' />
          </div>
        </div>

        <div className='rounded-md border p-4'>
          <Skeleton className='mb-4 h-5 w-32' />
          <div className='space-y-2'>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-4 w-24' />
            </div>
            <Skeleton className='h-2 w-full' />
            <div className='mt-4 flex justify-between'>
              <Skeleton className='h-9 w-24' />
              <Skeleton className='h-9 w-24' />
            </div>
          </div>
        </div>

        <div className='rounded-md border'>
          <Skeleton className='h-5 w-32 border-b p-4' />
          <div className='space-y-4 p-4'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='flex items-center justify-between'>
                <div className='space-y-2'>
                  <Skeleton className='h-5 w-32' />
                  <Skeleton className='h-4 w-48' />
                  <Skeleton className='h-4 w-16' />
                </div>
                <Skeleton className='h-9 w-9' />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ButtonSkeleton() {
  return <Skeleton className='h-9 w-24' />
}

function TeamSeatsSkeleton() {
  return (
    <div className='flex items-center space-x-2'>
      <Skeleton className='h-4 w-4' />
      <Skeleton className='h-4 w-32' />
    </div>
  )
}
