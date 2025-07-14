import type { WorkerMetadata } from './types'

// Available worker colors
export const WORKER_COLORS = [
  '#3972F6',
  '#F639DD',
  '#F6B539',
  '#8139F6',
  '#39B54A',
  '#39B5AB',
  '#F66839',
]

// Generates a unique name for a new worker
export function generateUniqueName(existingWorkers: Record<string, WorkerMetadata>): string {
  // Extract numbers from existing worker names using regex
  const numbers = Object.values(existingWorkers)
    .map((w) => {
      const match = w.name.match(/Worker (\d+)/)
      return match ? Number.parseInt(match[1]) : 0
    })
    .filter((n) => n > 0)

  if (numbers.length === 0) {
    return 'Worker 1'
  }

  // Find the maximum number and add 1
  const nextNumber = Math.max(...numbers) + 1
  return `Worker ${nextNumber}`
}

// Determines the next color to use for a new worker based on the color of the newest worker
export function getNextWorkerColor(existingWorkers: Record<string, WorkerMetadata>): string {
  const workerArray = Object.values(existingWorkers)

  if (workerArray.length === 0) {
    return WORKER_COLORS[0]
  }

  // Sort workers by lastModified date (newest first)
  const sortedWorkers = [...workerArray].sort((a, b) => {
    const dateA =
      a.lastModified instanceof Date ? a.lastModified.getTime() : new Date(a.lastModified).getTime()
    const dateB =
      b.lastModified instanceof Date ? b.lastModified.getTime() : new Date(b.lastModified).getTime()
    return dateB - dateA
  })

  // Get the newest worker (first in sorted array)
  const newestWorker = sortedWorkers[0]

  // Find the index of the newest worker's color, defaulting to -1 if undefined
  const currentColorIndex = newestWorker?.color ? WORKER_COLORS.indexOf(newestWorker.color) : -1

  // Get next color index, wrapping around to 0 if we reach the end
  const nextColorIndex = (currentColorIndex + 1) % WORKER_COLORS.length

  return WORKER_COLORS[nextColorIndex]
}
