/**
 * Integration tests for schedule status API route
 *
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockRequest, mockScheduleStatusDb } from '@/app/api/__test-utils__/utils'

// Common mocks
const mockSchedule = {
  id: 'schedule-id',
  workerId: 'worker-id',
  status: 'active',
  failedCount: 0,
  lastRanAt: new Date('2024-01-01T00:00:00.000Z'),
  lastFailedAt: null,
  nextRunAt: new Date('2024-01-02T00:00:00.000Z'),
}

beforeEach(() => {
  vi.resetModules()

  vi.doMock('@/lib/logger/console-logger', () => ({
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  }))

  vi.doMock('crypto', () => ({
    randomUUID: vi.fn(() => 'test-uuid'),
    default: { randomUUID: vi.fn(() => 'test-uuid') },
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Schedule Status API Route', () => {
  it('returns schedule status successfully', async () => {
    mockScheduleStatusDb({}) // default mocks

    vi.doMock('@/lib/auth', () => ({
      getSession: vi.fn().mockResolvedValue({ user: { id: 'user-id' } }),
    }))

    const req = createMockRequest('GET')

    const { GET } = await import('./route')

    const res = await GET(req, { params: Promise.resolve({ id: 'schedule-id' }) })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data).toMatchObject({
      status: 'active',
      failedCount: 0,
      nextRunAt: mockSchedule.nextRunAt.toISOString(),
      isDisabled: false,
    })
  })

  it('marks disabled schedules with isDisabled = true', async () => {
    mockScheduleStatusDb({
      schedule: [{ ...mockSchedule, status: 'disabled' }],
      worker: [{ userId: 'user-id' }],
    })

    vi.doMock('@/lib/auth', () => ({
      getSession: vi.fn().mockResolvedValue({ user: { id: 'user-id' } }),
    }))

    const req = createMockRequest('GET')
    const { GET } = await import('./route')
    const res = await GET(req, { params: Promise.resolve({ id: 'schedule-id' }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('status', 'disabled')
    expect(data).toHaveProperty('isDisabled', true)
    expect(data).toHaveProperty('lastFailedAt')
  })

  it('returns 404 if schedule not found', async () => {
    mockScheduleStatusDb({
      schedule: [],
      worker: [{ userId: 'user-id' }],
    })

    vi.doMock('@/lib/auth', () => ({
      getSession: vi.fn().mockResolvedValue({ user: { id: 'user-id' } }),
    }))

    const req = createMockRequest('GET')
    const { GET } = await import('./route')
    const res = await GET(req, { params: Promise.resolve({ id: 'missing-id' }) })

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Schedule not found')
  })

  it('returns 404 if related worker not found', async () => {
    mockScheduleStatusDb({
      schedule: [mockSchedule],
      worker: [],
    })

    vi.doMock('@/lib/auth', () => ({
      getSession: vi.fn().mockResolvedValue({ user: { id: 'user-id' } }),
    }))

    const req = createMockRequest('GET')
    const { GET } = await import('./route')
    const res = await GET(req, { params: Promise.resolve({ id: 'schedule-id' }) })

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Worker not found')
  })

  it('returns 403 when user is not owner of worker', async () => {
    mockScheduleStatusDb({
      schedule: [mockSchedule],
      worker: [{ userId: 'another-user' }],
    })

    vi.doMock('@/lib/auth', () => ({
      getSession: vi.fn().mockResolvedValue({ user: { id: 'user-id' } }),
    }))

    const req = createMockRequest('GET')
    const { GET } = await import('./route')
    const res = await GET(req, { params: Promise.resolve({ id: 'schedule-id' }) })

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Not authorized to view this schedule')
  })

  it('returns 401 when user is not authenticated', async () => {
    mockScheduleStatusDb({
      schedule: [mockSchedule],
      worker: [{ userId: 'user-id' }],
    })

    vi.doMock('@/lib/auth', () => ({
      getSession: vi.fn().mockResolvedValue(null),
    }))

    const req = createMockRequest('GET')
    const { GET } = await import('./route')
    const res = await GET(req, { params: Promise.resolve({ id: 'schedule-id' }) })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Unauthorized')
  })
})
