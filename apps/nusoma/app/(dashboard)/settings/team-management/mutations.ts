import { useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/auth-client'
import { checkEnterprisePlan } from '@/lib/subscription/utils'

// Mutation to update the number of seats in a subscription
export const useUpdateSeats = () => {
  const queryClient = useQueryClient()
  const { data: activeOrg } = client.useActiveOrganization()

  return useMutation({
    mutationFn: async (newSeatCount: number) => {
      if (!activeOrg) {
        throw new Error('No active organization selected.')
      }

      const subscriptionData = await queryClient.fetchQuery<{
        plan: string
        seats?: number
      } | null>({
        queryKey: ['organizationSubscription', activeOrg.id],
      })

      if (subscriptionData && checkEnterprisePlan(subscriptionData)) {
        throw new Error('Enterprise plan seats can only be modified by contacting support.')
      }

      const { used: totalCount } = calculateSeatUsage(activeOrg)
      if (newSeatCount < (subscriptionData?.seats ?? 0) && totalCount >= newSeatCount) {
        throw new Error(
          `You have ${totalCount} active members/invitations. Please remove members or cancel invitations before reducing seats.`
        )
      }

      const { error } = await client.subscription.upgrade({
        plan: 'team',
        referenceId: activeOrg.id,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
        seats: newSeatCount,
      })

      if (error) {
        throw new Error(error.message || 'Failed to update seats.')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizationSubscription', activeOrg?.id],
      })
      queryClient.invalidateQueries({ queryKey: ['teamData'] })
    },
  })
}

// Mutation to create a new organization and transfer subscription
export const useCreateOrganization = () => {
  const queryClient = useQueryClient()
  const { data: activeOrg } = client.useActiveOrganization()

  return useMutation({
    mutationFn: async (variables: {
      orgName: string
      orgSlug: string
      hasTeamPlan: boolean
      hasEnterprisePlan: boolean
    }) => {
      const { orgName, orgSlug, hasTeamPlan, hasEnterprisePlan } = variables

      const result = await client.organization.create({
        name: orgName,
        slug: orgSlug,
      })

      if (!result.data?.id) {
        throw new Error('Failed to create organization')
      }

      const orgId = result.data.id
      await client.organization.setActive({
        organizationId: orgId,
      })

      if (hasTeamPlan || hasEnterprisePlan) {
        const userSubResponse = await client.subscription.list()
        let teamSubscription = userSubResponse.data?.find(
          (sub) => (sub.plan === 'team' || sub.plan === 'enterprise') && sub.status === 'active'
        )

        if (!teamSubscription && hasEnterprisePlan) {
          const enterpriseResponse = await fetch('/api/user/subscription/enterprise')
          if (enterpriseResponse.ok) {
            const enterpriseData = await enterpriseResponse.json()
            if (enterpriseData.subscription) {
              teamSubscription = enterpriseData.subscription
            }
          }
        }

        if (teamSubscription) {
          const transferResponse = await fetch(
            `/api/user/subscription/${teamSubscription.id}/transfer`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                organizationId: orgId,
              }),
            }
          )

          if (!transferResponse.ok) {
            const errorText = await transferResponse.text()
            let errorMessage = 'Failed to transfer subscription'
            try {
              if (errorText?.trim().startsWith('{')) {
                const errorData = JSON.parse(errorText)
                errorMessage = errorData.error || errorMessage
              }
            } catch (_e) {
              errorMessage = errorText || errorMessage
            }
            throw new Error(errorMessage)
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamData'] })
      // Active org should refetch automatically after setActive is called
    },
  })
}

// Mutation to invite a member
export const useInviteMember = () => {
  const queryClient = useQueryClient()
  const { data: activeOrg } = client.useActiveOrganization()

  return useMutation({
    mutationFn: async (email: string) => {
      if (!activeOrg) {
        throw new Error('No active organization selected.')
      }

      const {
        used: totalCount,
        pending: pendingInvitationCount,
        members: currentMemberCount,
      } = calculateSeatUsage(activeOrg)

      const subscriptionData = await queryClient.fetchQuery<{
        seats?: number
      } | null>({
        queryKey: ['organizationSubscription', activeOrg.id],
      })
      const seatLimit = subscriptionData?.seats || 0

      if (totalCount >= seatLimit) {
        throw new Error(
          `You've reached your team seat limit of ${seatLimit}. Please upgrade your plan for more seats.`
        )
      }

      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address')
      }

      const inviteResult = await client.organization.inviteMember({
        email,
        role: 'member',
        organizationId: activeOrg.id,
      })

      if (inviteResult.error) {
        throw new Error(inviteResult.error.message || 'Failed to send invitation')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamData'] })
    },
  })
}

// Helper function from page.tsx, needed for useInviteMember
function calculateSeatUsage(org: any) {
  const members = org?.members?.length ?? 0
  const pending = org?.invitations?.filter((inv: any) => inv.status === 'pending').length ?? 0
  return { used: members + pending, members, pending }
}

// Mutation to remove a member
export const useRemoveMember = () => {
  const queryClient = useQueryClient()
  const { data: activeOrg } = client.useActiveOrganization()
  const updateSeatsMutation = useUpdateSeats()

  return useMutation({
    mutationFn: async (variables: { memberId: string; shouldReduceSeats: boolean }) => {
      if (!activeOrg) {
        throw new Error('No active organization selected.')
      }
      const { memberId, shouldReduceSeats } = variables

      await client.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: activeOrg.id,
      })

      if (shouldReduceSeats) {
        const subscriptionData = await queryClient.fetchQuery<{
          seats?: number
        } | null>({
          queryKey: ['organizationSubscription', activeOrg.id],
        })
        const currentSeats = subscriptionData?.seats || 0
        if (currentSeats > 1) {
          await updateSeatsMutation.mutateAsync(currentSeats - 1)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamData'] })
      queryClient.invalidateQueries({
        queryKey: ['organizationSubscription', activeOrg?.id],
      })
    },
  })
}

// Mutation to cancel an invitation
export const useCancelInvitation = () => {
  const queryClient = useQueryClient()
  const { data: activeOrg } = client.useActiveOrganization()
  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!activeOrg) {
        throw new Error('No active organization selected.')
      }
      await client.organization.cancelInvitation({ invitationId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamData'] })
    },
  })
}

// Mutation to set an organization as active
export const useSetActiveOrg = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orgId: string) => {
      await client.organization.setActive({ organizationId: orgId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamData'] })
      // This should trigger a refetch of the active org from the hook in the component
    },
  })
}

// Mutation to upgrade to a team subscription
export const useConfirmTeamUpgrade = () => {
  const queryClient = useQueryClient()
  const { data: activeOrg } = client.useActiveOrganization()
  return useMutation({
    mutationFn: async (seats: number) => {
      if (!activeOrg) {
        throw new Error('No active organization selected.')
      }
      const { error } = await client.subscription.upgrade({
        plan: 'team',
        referenceId: activeOrg.id,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
        seats,
      })
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizationSubscription', activeOrg?.id],
      })
    },
  })
}
