'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { ControlBar } from './components/control-bar/control-bar'
import { ErrorMessage } from './components/error-message'
import { Section } from './components/section'
import { Toolbar } from './components/toolbar/toolbar'
import { WorkerCard } from './components/worker-card'
import { WorkerCardSkeleton } from './components/worker-card-skeleton'
import { CATEGORIES, getCategoryLabel } from './constants/categories'

// Types
export interface Worker {
  id: string
  name: string
  description: string
  author: string
  views: number
  tags: string[]
  thumbnail?: string
  workerUrl: string
  workerState?: {
    blocks: Record<string, any>
    edges: Array<{
      id: string
      source: string
      target: string
      sourceHandle?: string
      targetHandle?: string
    }>
    loops: Record<string, any>
    parallels?: Record<string, any>
    cursors?: Record<string, any>
  }
}

// Updated interface to match API response format
export interface MarketplaceWorker {
  id: string
  workerId: string
  name: string
  description: string
  authorName: string
  views: number
  category: string
  createdAt: string
  updatedAt: string
  workerState?: {
    blocks: Record<string, any>
    edges: Array<{
      id: string
      source: string
      target: string
      sourceHandle?: string
      targetHandle?: string
    }>
    loops: Record<string, any>
    parallels?: Record<string, any>
  }
}

export interface MarketplaceData {
  popular: MarketplaceWorker[]
  recent: MarketplaceWorker[]
  byCategory: Record<string, MarketplaceWorker[]>
}

// The order to display sections in, matching toolbar order
const SECTION_ORDER = ['popular', 'recent', ...CATEGORIES.map((cat) => cat.value)]

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceData>({
    popular: [],
    recent: [],
    byCategory: {},
  })
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set(['popular', 'recent']))
  const [_visibleSections, setVisibleSections] = useState<Set<string>>(new Set(['popular']))

  // Create refs for each section
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const contentRef = useRef<HTMLDivElement>(null)
  const initialFetchCompleted = useRef(false)

  // Convert marketplace data to the format expected by components
  const workerData = useMemo(() => {
    const result: Record<string, Worker[]> = {
      popular: marketplaceData.popular.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        author: item.authorName,
        views: item.views,
        tags: [item.category],
        workerState: item.workerState,
        workerUrl: `/workspace/${item.workerId}`,
      })),
      recent: marketplaceData.recent.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        author: item.authorName,
        views: item.views,
        tags: [item.category],
        workerState: item.workerState,
        workerUrl: `/workspace/${item.workerId}`,
      })),
    }

    // Add entries for each category
    Object.entries(marketplaceData.byCategory).forEach(([category, items]) => {
      if (items && items.length > 0) {
        result[category] = items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          author: item.authorName,
          views: item.views,
          tags: [item.category],
          workerState: item.workerState,
          workerUrl: `/workspace/${item.workerId}`,
        }))
      }
    })

    return result
  }, [marketplaceData])

  // Fetch workers on component mount - improved to include state initially
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)

        // Fetch ALL data including categories in the initial load
        const response = await fetch(
          '/api/marketplace/workers?includeState=true&section=popular,recent,byCategory'
        )

        if (!response.ok) {
          throw new Error('Failed to fetch marketplace data')
        }

        const data = await response.json()

        // Add all categories to loaded sections to avoid redundant load
        setLoadedSections((prev) => {
          const allSections = new Set([...prev])
          Object.keys(data.byCategory || {}).forEach((category) => {
            allSections.add(category)
          })
          return allSections
        })

        setMarketplaceData(data)
        initialFetchCompleted.current = true

        // Set initial active section to popular
        setActiveSection('popular')
        setLoading(false)
      } catch (_error) {
        setError('Failed to load workers. Please try again later.')
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // Lazy load category data when sections become visible
  const loadCategoryData = async (categoryName: string) => {
    if (loadedSections.has(categoryName)) {
      return // Already loaded, no need to fetch again
    }

    try {
      setLoadedSections((prev) => new Set([...prev, categoryName]))

      const response = await fetch(
        `/api/marketplace/workers?includeState=true&category=${categoryName}`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch ${categoryName} category data`)
      }

      const data = await response.json()

      // Check if we received any data in the category
      if (
        !data.byCategory ||
        !data.byCategory[categoryName] ||
        data.byCategory[categoryName].length === 0
      ) {
      }

      setMarketplaceData((prev) => ({
        ...prev,
        byCategory: {
          ...prev.byCategory,
          [categoryName]: data.byCategory?.[categoryName] || [],
        },
      }))
    } catch (_error) {
      // We don't set a global error, just log it
    }
  }

  // Function to mark a worker as needing state and fetch it if not available
  const ensureWorkerState = async (workerId: string) => {
    try {
      // Find which section contains this worker
      let foundWorker: MarketplaceWorker | undefined

      // Check in popular section
      foundWorker = marketplaceData.popular.find((w) => w.id === workerId)

      // Check in recent section if not found
      if (!foundWorker) {
        foundWorker = marketplaceData.recent.find((w) => w.id === workerId)
      }

      // Check in category sections if not found
      if (!foundWorker) {
        for (const category of Object.keys(marketplaceData.byCategory)) {
          foundWorker = marketplaceData.byCategory[category].find((w) => w.id === workerId)
          if (foundWorker) {
            break
          }
        }
      }

      // If we have the worker but it doesn't have state, fetch it
      if (foundWorker && !foundWorker.workerState) {
        const response = await fetch(
          `/api/marketplace/workers?marketplaceId=${workerId}&includeState=true`,
          {
            method: 'GET',
          }
        )

        if (response.ok) {
          const data = await response.json()

          // Update the worker data with the state
          setMarketplaceData((prevData) => {
            const updatedData = { ...prevData }

            // Helper function to update worker in a section
            const updateWorkerInSection = (workers: MarketplaceWorker[]) => {
              return workers.map((w) =>
                w.id === workerId
                  ? {
                      ...w,
                      workerState: data.data.workerState,
                    }
                  : w
              )
            }

            // Update in popular
            updatedData.popular = updateWorkerInSection(updatedData.popular)

            // Update in recent
            updatedData.recent = updateWorkerInSection(updatedData.recent)

            // Update in categories
            Object.keys(updatedData.byCategory).forEach((category) => {
              updatedData.byCategory[category] = updateWorkerInSection(
                updatedData.byCategory[category]
              )
            })

            return updatedData
          })
        }
      }
    } catch (_error) {}
  }

  // Filter workers based on search query
  const filteredWorkers = useMemo(() => {
    if (!searchQuery.trim()) {
      return workerData
    }

    const query = searchQuery.toLowerCase()
    const filtered: Record<string, Worker[]> = {}

    Object.entries(workerData).forEach(([category, workers]) => {
      const matchingWorkers = workers.filter(
        (worker) =>
          worker.name.toLowerCase().includes(query) ||
          worker.description.toLowerCase().includes(query) ||
          worker.author.toLowerCase().includes(query) ||
          worker.tags.some((tag) => tag.toLowerCase().includes(query))
      )

      if (matchingWorkers.length > 0) {
        filtered[category] = matchingWorkers
      }
    })

    return filtered
  }, [searchQuery, workerData])

  // Sort sections according to the toolbar order
  const sortedFilteredWorkers = useMemo(() => {
    // Get entries from filteredWorkers
    const entries = Object.entries(filteredWorkers)

    // Sort based on the SECTION_ORDER
    entries.sort((a, b) => {
      const indexA = SECTION_ORDER.indexOf(a[0])
      const indexB = SECTION_ORDER.indexOf(b[0])

      // If both categories are in our predefined order, use that order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }

      // If only one category is in our order, prioritize it
      if (indexA !== -1) {
        return -1
      }
      if (indexB !== -1) {
        return 1
      }

      // Otherwise, alphabetical order
      return a[0].localeCompare(b[0])
    })

    return entries
  }, [filteredWorkers])

  // Function to scroll to a specific section
  const scrollToSection = (sectionId: string) => {
    if (sectionRefs.current[sectionId]) {
      // Load the section data if not already loaded
      if (!loadedSections.has(sectionId) && sectionId !== 'popular' && sectionId !== 'recent') {
        loadCategoryData(sectionId)
      }

      sectionRefs.current[sectionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  // Setup intersection observer to track active section and load sections as they become visible
  useEffect(() => {
    if (!initialFetchCompleted.current) {
      return
    }

    // Function to get current section IDs in their display order
    const getCurrentSectionIds = () => {
      return Object.keys(filteredWorkers).filter(
        (key) => filteredWorkers[key] && filteredWorkers[key].length > 0
      )
    }

    // Create intersection observer to detect when sections enter viewport
    const observeSections = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const sectionId = entry.target.id

            // Update visibility tracking
            if (entry.isIntersecting) {
              setVisibleSections((prev) => {
                const updated = new Set(prev)
                updated.add(sectionId)
                return updated
              })

              // Load category data if section is visible and not loaded yet
              if (
                !loadedSections.has(sectionId) &&
                sectionId !== 'popular' &&
                sectionId !== 'recent'
              ) {
                loadCategoryData(sectionId)
              }
            } else {
              setVisibleSections((prev) => {
                const updated = new Set(prev)
                updated.delete(sectionId)
                return updated
              })
            }
          })
        },
        {
          root: contentRef.current,
          rootMargin: '200px 0px', // Load sections slightly before they become visible
          threshold: 0.1,
        }
      )

      // Observe all sections
      Object.entries(sectionRefs.current).forEach(([_id, ref]) => {
        if (ref) {
          observer.observe(ref)
        }
      })

      return observer
    }

    const observer = observeSections()

    // Use a single source of truth for determining the active section
    const determineActiveSection = () => {
      if (!contentRef.current) {
        return
      }

      const { scrollTop, scrollHeight, clientHeight } = contentRef.current
      const viewportTop = scrollTop
      const viewportMiddle = viewportTop + clientHeight / 2
      const viewportBottom = scrollTop + clientHeight
      const isAtBottom = viewportBottom >= scrollHeight - 50
      const isAtTop = viewportTop <= 20

      const currentSectionIds = getCurrentSectionIds()

      // Handle edge cases first
      if (isAtTop && currentSectionIds.length > 0) {
        setActiveSection(currentSectionIds[0])
        return
      }

      if (isAtBottom && currentSectionIds.length > 0) {
        setActiveSection(currentSectionIds.at(-1) || null)
        return
      }

      // Find section whose position is closest to middle of viewport
      // This creates smoother transitions as we scroll
      let closestSection = null
      let closestDistance = Number.POSITIVE_INFINITY

      Object.entries(sectionRefs.current).forEach(([id, ref]) => {
        if (!ref || !currentSectionIds.includes(id)) {
          return
        }

        const rect = ref.getBoundingClientRect()
        const sectionTop =
          rect.top + scrollTop - (contentRef.current?.getBoundingClientRect().top || 0)
        const sectionMiddle = sectionTop + rect.height / 2
        const distance = Math.abs(viewportMiddle - sectionMiddle)

        if (distance < closestDistance) {
          closestDistance = distance
          closestSection = id
        }
      })

      if (closestSection) {
        setActiveSection(closestSection)
      }
    }

    // Use a passive scroll listener for smooth transitions
    const handleScroll = () => {
      // Using requestAnimationFrame ensures we only calculate
      // section positions during a paint frame, reducing jank
      window.requestAnimationFrame(determineActiveSection)
    }

    const contentElement = contentRef.current
    contentElement?.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      observer.disconnect()
      contentElement?.removeEventListener('scroll', handleScroll)
    }
  }, [initialFetchCompleted.current, loading, filteredWorkers, loadedSections])

  return (
    <div className='flex h-[100vh] flex-col'>
      {/* Control Bar */}
      <ControlBar setSearchQuery={setSearchQuery} />

      <div className='flex flex-1 overflow-hidden'>
        {/* Toolbar */}
        <Toolbar scrollToSection={scrollToSection} activeSection={activeSection} />

        {/* Main content */}
        <div ref={contentRef} className='flex-1 overflow-y-auto px-6 py-6 pb-16'>
          {/* Error message */}
          <ErrorMessage message={error} />

          {/* Loading state */}
          {loading && (
            <Section
              id='loading'
              title='Popular'
              ref={(el) => {
                sectionRefs.current.loading = el
              }}
            >
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {Array.from({ length: 6 }).map((_, index) => (
                  <WorkerCardSkeleton key={`skeleton-${index}`} />
                ))}
              </div>
            </Section>
          )}

          {/* Render worker sections */}
          {!loading && (
            <>
              {sortedFilteredWorkers.map(
                ([category, workers]) =>
                  workers.length > 0 && (
                    <Section
                      key={category}
                      id={category}
                      title={getCategoryLabel(category)}
                      ref={(el) => {
                        if (el) {
                          sectionRefs.current[category] = el
                        }
                      }}
                    >
                      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                        {workers.map((worker, index) => (
                          <WorkerCard
                            key={worker.id}
                            worker={worker}
                            index={index}
                            onHover={ensureWorkerState}
                          />
                        ))}
                      </div>
                    </Section>
                  )
              )}

              {sortedFilteredWorkers.length === 0 && !loading && (
                <div className='flex h-64 flex-col items-center justify-center'>
                  <AlertCircle className='mb-4 h-8 w-8 text-muted-foreground' />
                  <p className='text-muted-foreground'>No workers found matching your search.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
