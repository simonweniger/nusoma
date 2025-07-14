import { useCallback, useEffect, useRef, useState } from 'react'
import { isEqual } from 'lodash'
import { getProviderFromModel } from '@/providers/utils'
import { useGeneralStore } from '@/stores/settings/general/store'
import { useSubBlockStore } from '@/stores/workers/subblock/store'
import { useWorkerStore } from '@/stores/workers/worker/store'

/**
 * Helper to determine if a subblock represents an API key field
 */
function isApiKeyField(blockType: string, subBlockId: string): boolean {
  return subBlockId === 'apiKey' || (subBlockId?.toLowerCase().includes('apikey') ?? false)
}

/**
 * Helper to handle environment variable auto-fill for a provider based on model selection
 */
function handleProviderBasedApiKey(
  blockId: string,
  subBlockId: string,
  modelValue: string | null | undefined,
  storeValue: any,
  isModelChange = false
) {
  // Skip autofill if the feature is disabled in settings
  if (!useGeneralStore.getState().isAutoFillEnvVarsEnabled) {
    return
  }

  // Only process API key fields
  if (!isApiKeyField('', subBlockId)) {
    return
  }

  const subBlockStore = useSubBlockStore.getState()

  // Check if this specific instance has been deliberately cleared
  if (subBlockStore.isParamCleared(blockId, subBlockId)) {
    return
  }

  // Skip auto-fill if there's already a value and this isn't a model change
  if (storeValue && !isModelChange) {
    return
  }

  // Extract provider from the model value
  if (modelValue) {
    const provider = getProviderFromModel(modelValue)
    if (provider && provider !== 'ollama') {
      // Try to get API key for this provider
      const apiKeyValue = subBlockStore.resolveToolParamValue(provider, 'apiKey', blockId)
      if (apiKeyValue) {
        subBlockStore.setValue(blockId, subBlockId, apiKeyValue)
      }
    }
  }
}

/**
 * Helper to handle environment variable auto-fill for standard block types
 */
function handleStandardBlockApiKey(
  blockId: string,
  subBlockId: string,
  blockType: string | undefined,
  storeValue: any
) {
  // Skip autofill if the feature is disabled in settings
  if (!useGeneralStore.getState().isAutoFillEnvVarsEnabled) {
    return
  }

  // Only process API key fields
  if (!isApiKeyField(blockType || '', subBlockId)) {
    return
  }

  const subBlockStore = useSubBlockStore.getState()

  // Check if this specific instance has been deliberately cleared
  if (subBlockStore.isParamCleared(blockId, subBlockId)) {
    return
  }

  // Skip auto-fill if there's already a value
  if (storeValue) {
    return
  }

  // Try to resolve API key for this block type
  if (blockType) {
    const apiKeyValue = subBlockStore.resolveToolParamValue(blockType, 'apiKey', blockId)
    if (apiKeyValue) {
      subBlockStore.setValue(blockId, subBlockId, apiKeyValue)
    }
  }
}

/**
 * Helper to store API key values
 */
function storeApiKeyValue(
  blockId: string,
  blockType: string | undefined,
  modelValue: string | null | undefined,
  newValue: any,
  storeValue: any
) {
  if (!blockType) {
    return
  }

  const subBlockStore = useSubBlockStore.getState()

  // Check if this is user explicitly clearing a field that had a value
  // We only want to mark it as cleared if it's a user action, not an automatic
  // clearing from model switching
  if (
    storeValue &&
    storeValue !== '' &&
    (newValue === null || newValue === '' || String(newValue).trim() === '')
  ) {
    // Mark this specific instance as cleared so we don't auto-fill it
    subBlockStore.markParamAsCleared(blockId, 'apiKey')
    return
  }

  // Only store non-empty values
  if (!newValue || String(newValue).trim() === '') {
    return
  }

  // If user enters a value, we should clear any "cleared" flag
  // to ensure auto-fill will work in the future
  if (subBlockStore.isParamCleared(blockId, 'apiKey')) {
    subBlockStore.unmarkParamAsCleared(blockId, 'apiKey')
  }

  // For provider-based blocks, store the API key under the provider name
  if (
    (blockType === 'agent' || blockType === 'router' || blockType === 'evaluator') &&
    modelValue
  ) {
    const provider = getProviderFromModel(modelValue)
    if (provider && provider !== 'ollama') {
      subBlockStore.setToolParam(provider, 'apiKey', String(newValue))
    }
  } else {
    // For other blocks, store under the block type
    subBlockStore.setToolParam(blockType, 'apiKey', String(newValue))
  }
}

// Track active inputs to prevent realtime interference during typing
const activeTypingInputs = new Set<string>()

/**
 * Custom hook to get and set values for a sub-block in a worker.
 * Handles complex object values properly by using deep equality comparison.
 * Includes typing protection to prevent cursor jumping during realtime updates.
 *
 * @param blockId The ID of the block containing the sub-block
 * @param subBlockId The ID of the sub-block
 * @param triggerWorkerUpdate Whether to trigger a worker update when the value changes
 * @returns A tuple containing the current value and a setter function
 */
export function useSubBlockValue<T = any>(
  blockId: string,
  subBlockId: string,
  triggerWorkerUpdate = false
): readonly [T | null, (value: T) => void] {
  const blockType = useWorkerStore(useCallback((state) => state.blocks?.[blockId]?.type, [blockId]))
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const inputKey = `${blockId}-${subBlockId}`

  const initialValue = useWorkerStore(
    useCallback(
      (state) => state.blocks?.[blockId]?.subBlocks?.[subBlockId]?.value ?? null,
      [blockId, subBlockId]
    )
  )

  // Keep a ref to the latest value to prevent unnecessary re-renders
  const valueRef = useRef<T | null>(null)

  // Previous model reference for detecting model changes
  const prevModelRef = useRef<string | null>(null)

  // Get value from subblock store - always call this hook unconditionally
  // Use typing protection to prevent cursor jumping
  const storeValue = useSubBlockStore(
    useCallback(
      (state) => {
        // If user is actively typing in this input, return the ref value to prevent cursor jumping
        if (isTyping || activeTypingInputs.has(inputKey)) {
          return valueRef.current
        }
        return state.getValue(blockId, subBlockId)
      },
      [blockId, subBlockId, isTyping, inputKey]
    )
  )

  // Check if this is an API key field that could be auto-filled
  const isApiKey = isApiKeyField(blockType || '', subBlockId)

  // Check if auto-fill environment variables is enabled - always call this hook unconditionally
  const isAutoFillEnvVarsEnabled = useGeneralStore((state) => state.isAutoFillEnvVarsEnabled)

  // Always call this hook unconditionally - don't wrap it in a condition
  const modelSubBlockValue = useSubBlockStore((state) =>
    blockId ? state.getValue(blockId, 'model') : null
  )

  // Determine if this is a provider-based block type
  const isProviderBasedBlock =
    blockType === 'agent' || blockType === 'router' || blockType === 'evaluator'

  // Compute the modelValue based on block type
  const modelValue = isProviderBasedBlock ? (modelSubBlockValue as string) : null

  // Hook to set a value in the subblock store
  const setValue = useCallback(
    (newValue: T) => {
      // Mark as actively typing to prevent realtime interference
      setIsTyping(true)
      activeTypingInputs.add(inputKey)

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Use deep comparison to avoid unnecessary updates for complex objects
      if (!isEqual(valueRef.current, newValue)) {
        valueRef.current = newValue

        // Ensure we're passing the actual value, not a reference that might change
        const valueCopy =
          newValue === null
            ? null
            : typeof newValue === 'object'
              ? JSON.parse(JSON.stringify(newValue))
              : newValue

        // Handle API key storage for reuse across blocks
        if (isApiKey && blockType) {
          storeApiKeyValue(blockId, blockType, modelValue, newValue, storeValue)
        }

        // Update the subblock store with the new value
        useSubBlockStore.getState().setValue(blockId, subBlockId, valueCopy)

        // Fire the event to trigger database save and realtime sync
        const event = new CustomEvent('update-subblock-value', {
          detail: {
            blockId,
            subBlockId,
            value: valueCopy,
          },
        })
        window.dispatchEvent(event)

        if (triggerWorkerUpdate) {
          useWorkerStore.getState().triggerUpdate()
        }
      }

      // Set timeout to stop typing protection after inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        activeTypingInputs.delete(inputKey)
      }, 1000) // 1 second of inactivity
    },
    [
      blockId,
      subBlockId,
      blockType,
      isApiKey,
      storeValue,
      triggerWorkerUpdate,
      modelValue,
      inputKey,
    ]
  )

  // Initialize valueRef on first render
  useEffect(() => {
    valueRef.current = storeValue !== undefined ? storeValue : initialValue
  }, [])

  // When component mounts, check for existing API key in toolParamsStore
  useEffect(() => {
    // Skip autofill if the feature is disabled in settings
    if (!isAutoFillEnvVarsEnabled) {
      return
    }

    // Only process API key fields
    if (!isApiKey) {
      return
    }

    // Handle different block types
    if (isProviderBasedBlock) {
      handleProviderBasedApiKey(blockId, subBlockId, modelValue, storeValue, false)
    } else {
      // Normal handling for non-provider blocks
      handleStandardBlockApiKey(blockId, subBlockId, blockType, storeValue)
    }
  }, [
    blockId,
    subBlockId,
    blockType,
    storeValue,
    isApiKey,
    isAutoFillEnvVarsEnabled,
    modelValue,
    isProviderBasedBlock,
  ])

  // Monitor for model changes in provider-based blocks
  useEffect(() => {
    // Only process API key fields in model-based blocks
    if (!isApiKey || !isProviderBasedBlock) {
      return
    }

    // Check if the model has changed
    if (modelValue !== prevModelRef.current) {
      // Update the previous model reference
      prevModelRef.current = modelValue

      // Handle API key auto-fill for model changes
      if (modelValue) {
        handleProviderBasedApiKey(blockId, subBlockId, modelValue, storeValue, true)
      } else {
        // If no model is selected, clear the API key field
        useSubBlockStore.getState().setValue(blockId, subBlockId, '')
      }
    }
  }, [
    blockId,
    subBlockId,
    blockType,
    isApiKey,
    modelValue,
    isAutoFillEnvVarsEnabled,
    storeValue,
    isProviderBasedBlock,
  ])

  // Update the ref if the store value changes (but not during typing)
  useEffect(() => {
    if (!isTyping && !activeTypingInputs.has(inputKey)) {
      // Use deep comparison for objects to prevent unnecessary updates
      if (!isEqual(valueRef.current, storeValue)) {
        valueRef.current = storeValue !== undefined ? storeValue : initialValue
      }
    }
  }, [storeValue, initialValue, isTyping, inputKey])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      activeTypingInputs.delete(inputKey)
      setIsTyping(false)
    }
  }, [inputKey])

  return [valueRef.current as T | null, setValue] as const
}
