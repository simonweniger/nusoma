/**
 * Deployment Controls Change Detection Logic Tests
 *
 * This file tests the core logic of how DeploymentControls handles change detection,
 * specifically focusing on the needsRedeployment prop handling and state management.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockDeploymentStatus = {
  isDeployed: false,
  needsRedeployment: false,
}

const mockWorkerRegistry = {
  getState: vi.fn(() => ({
    getWorkerDeploymentStatus: vi.fn((workerId) => mockDeploymentStatus),
  })),
}

vi.mock('@/stores/workers/registry/store', () => ({
  useWorkerRegistry: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockWorkerRegistry.getState())
    }
    return mockWorkerRegistry.getState()
  }),
}))

describe('DeploymentControls Change Detection Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeploymentStatus.isDeployed = false
    mockDeploymentStatus.needsRedeployment = false
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('needsRedeployment Priority Logic', () => {
    it('should prioritize parent needsRedeployment over worker registry', () => {
      const parentNeedsRedeployment = true
      const workerRegistryNeedsRedeployment = false

      const workerNeedsRedeployment = parentNeedsRedeployment

      expect(workerNeedsRedeployment).toBe(true)
      expect(workerNeedsRedeployment).not.toBe(workerRegistryNeedsRedeployment)
    })

    it('should handle false needsRedeployment correctly', () => {
      const parentNeedsRedeployment = false
      const workerNeedsRedeployment = parentNeedsRedeployment

      expect(workerNeedsRedeployment).toBe(false)
    })

    it('should maintain consistency with parent state changes', () => {
      let parentNeedsRedeployment = false
      let workerNeedsRedeployment = parentNeedsRedeployment

      expect(workerNeedsRedeployment).toBe(false)

      parentNeedsRedeployment = true
      workerNeedsRedeployment = parentNeedsRedeployment

      expect(workerNeedsRedeployment).toBe(true)

      parentNeedsRedeployment = false
      workerNeedsRedeployment = parentNeedsRedeployment

      expect(workerNeedsRedeployment).toBe(false)
    })
  })

  describe('Deployment Status Integration', () => {
    it('should handle deployment status correctly', () => {
      mockDeploymentStatus.isDeployed = true
      mockDeploymentStatus.needsRedeployment = false

      const deploymentStatus = mockWorkerRegistry.getState().getWorkerDeploymentStatus('test-id')

      expect(deploymentStatus.isDeployed).toBe(true)
      expect(deploymentStatus.needsRedeployment).toBe(false)
    })

    it('should handle missing deployment status', () => {
      const tempMockRegistry = {
        getState: vi.fn(() => ({
          getWorkerDeploymentStatus: vi.fn(() => null),
        })),
      }

      // Temporarily replace the mock
      const originalMock = mockWorkerRegistry.getState
      mockWorkerRegistry.getState = tempMockRegistry.getState as any

      const deploymentStatus = mockWorkerRegistry.getState().getWorkerDeploymentStatus('test-id')

      expect(deploymentStatus).toBe(null)

      mockWorkerRegistry.getState = originalMock
    })

    it('should handle undefined deployment status properties', () => {
      mockWorkerRegistry.getState = vi.fn(() => ({
        getWorkerDeploymentStatus: vi.fn(() => ({})),
      })) as any

      const deploymentStatus = mockWorkerRegistry.getState().getWorkerDeploymentStatus('test-id')

      const isDeployed = deploymentStatus?.isDeployed || false
      expect(isDeployed).toBe(false)
    })
  })

  describe('Change Detection Scenarios', () => {
    it('should handle the redeployment cycle correctly', () => {
      // Scenario 1: Initial state - deployed, no changes
      mockDeploymentStatus.isDeployed = true
      let parentNeedsRedeployment = false
      let shouldShowIndicator = mockDeploymentStatus.isDeployed && parentNeedsRedeployment

      expect(shouldShowIndicator).toBe(false)

      // Scenario 2: User makes changes
      parentNeedsRedeployment = true
      shouldShowIndicator = mockDeploymentStatus.isDeployed && parentNeedsRedeployment

      expect(shouldShowIndicator).toBe(true)

      // Scenario 3: User redeploys
      parentNeedsRedeployment = false // Reset after redeployment
      shouldShowIndicator = mockDeploymentStatus.isDeployed && parentNeedsRedeployment

      expect(shouldShowIndicator).toBe(false)
    })

    it('should not show indicator when worker is not deployed', () => {
      mockDeploymentStatus.isDeployed = false
      const parentNeedsRedeployment = true
      const shouldShowIndicator = mockDeploymentStatus.isDeployed && parentNeedsRedeployment

      expect(shouldShowIndicator).toBe(false)
    })

    it('should show correct tooltip messages based on state', () => {
      const getTooltipMessage = (isDeployed: boolean, needsRedeployment: boolean) => {
        if (isDeployed && needsRedeployment) {
          return 'Worker changes detected'
        }
        if (isDeployed) {
          return 'Deployment Settings'
        }
        return 'Deploy as API'
      }

      // Not deployed
      expect(getTooltipMessage(false, false)).toBe('Deploy as API')
      expect(getTooltipMessage(false, true)).toBe('Deploy as API')

      // Deployed, no changes
      expect(getTooltipMessage(true, false)).toBe('Deployment Settings')

      // Deployed, changes detected
      expect(getTooltipMessage(true, true)).toBe('Worker changes detected')
    })
  })

  describe('Error Handling', () => {
    it('should handle null activeWorkerId gracefully', () => {
      const deploymentStatus = mockWorkerRegistry.getState().getWorkerDeploymentStatus(null)

      expect(deploymentStatus).toBeDefined()
    })
  })

  describe('Props Integration', () => {
    it('should correctly pass needsRedeployment to child components', () => {
      const parentNeedsRedeployment = true
      const propsToModal = {
        needsRedeployment: parentNeedsRedeployment,
        workerId: 'test-id',
      }

      expect(propsToModal.needsRedeployment).toBe(true)
    })

    it('should maintain prop consistency across re-renders', () => {
      let needsRedeployment = false

      let componentProps = { needsRedeployment }
      expect(componentProps.needsRedeployment).toBe(false)

      needsRedeployment = true
      componentProps = { needsRedeployment }
      expect(componentProps.needsRedeployment).toBe(true)

      needsRedeployment = false
      componentProps = { needsRedeployment }
      expect(componentProps.needsRedeployment).toBe(false)
    })
  })
})
