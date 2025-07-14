'use client'

import { useEffect, useMemo, useRef } from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import createGlobe, { type COBEOptions } from 'cobe'
import { useMotionValue, useSpring } from 'motion/react'
import { useTheme } from 'next-themes'

const MOVEMENT_DAMPING = 1400

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    // Americas
    { location: [40.7128, -74.006], size: 0.1 }, // New York
    { location: [34.0522, -118.2437], size: 0.08 }, // Los Angeles
    { location: [19.4326, -99.1332], size: 0.1 }, // Mexico City
    { location: [-23.5505, -46.6333], size: 0.1 }, // São Paulo
    { location: [-34.6037, -58.3816], size: 0.09 }, // Buenos Aires
    { location: [51.0447, -114.0719], size: 0.06 }, // Calgary

    // Europe
    { location: [51.5074, -0.1278], size: 0.1 }, // London
    { location: [48.8566, 2.3522], size: 0.07 }, // Paris
    { location: [52.52, 13.405], size: 0.07 }, // Berlin
    { location: [41.9029, 12.4534], size: 0.06 }, // Rome
    { location: [55.7558, 37.6173], size: 0.09 }, // Moscow
    { location: [40.4168, -3.7038], size: 0.07 }, // Madrid

    // Asia
    { location: [35.6895, 139.6917], size: 0.1 }, // Tokyo
    { location: [39.9042, 116.4074], size: 0.08 }, // Beijing
    { location: [19.076, 72.8777], size: 0.1 }, // Mumbai
    { location: [1.3521, 103.8198], size: 0.05 }, // Singapore
    { location: [31.2304, 121.4737], size: 0.08 }, // Shanghai
    { location: [14.5995, 120.9842], size: 0.03 }, // Manila (Existing)
    { location: [23.8103, 90.4125], size: 0.05 }, // Dhaka (Existing, adjusted)
    { location: [34.6937, 135.5022], size: 0.05 }, // Osaka (Existing)
    { location: [41.0082, 28.9784], size: 0.06 }, // Istanbul (Existing)

    // Africa
    { location: [30.0444, 31.2357], size: 0.07 }, // Cairo
    { location: [-1.2921, 36.8219], size: 0.06 }, // Nairobi
    { location: [-26.2041, 28.0473], size: 0.07 }, // Johannesburg
    { location: [6.5244, 3.3792], size: 0.08 }, // Lagos

    // Oceania
    { location: [-33.8688, 151.2093], size: 0.08 }, // Sydney
    { location: [-37.8136, 144.9631], size: 0.07 }, // Melbourne
    { location: [-41.2865, 174.7762], size: 0.04 }, // Wellington
  ],
}

// Define color configurations for light and dark modes
const COLORS = {
  light: {
    base: [1, 1, 1] as [number, number, number],
    glow: [1, 1, 1] as [number, number, number],
    marker: [59 / 255, 130 / 255, 246 / 255] as [number, number, number],
  },
  dark: {
    base: [0.4, 0.4, 0.4] as [number, number, number],
    glow: [0.24, 0.24, 0.27] as [number, number, number],
    marker: [59 / 255, 130 / 255, 246 / 255] as [number, number, number],
  },
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: COBEOptions
}) {
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'

  const phiRef = useRef(0)
  const widthRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)

  const r = useMotionValue(0)
  const rs = useSpring(r, {
    mass: 1,
    damping: 30,
    stiffness: 100,
  })

  const finalConfig = useMemo(
    () => ({
      ...config,
      baseColor: isDarkMode ? COLORS.dark.base : COLORS.light.base,
      glowColor: isDarkMode ? COLORS.dark.glow : COLORS.light.glow,
      markerColor: COLORS.light.marker,
      dark: isDarkMode ? 1 : 0,
      diffuse: isDarkMode ? 0.5 : 0.4,
      mapBrightness: isDarkMode ? 1.4 : 1.2,
    }),
    [config, isDarkMode]
  )

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? 'grabbing' : 'grab'
    }
  }

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      pointerInteractionMovement.current = delta
      r.set(r.get() + delta / MOVEMENT_DAMPING)
    }
  }

  useEffect(() => {
    const onResize = () => {
      if (canvasRef.current) {
        widthRef.current = canvasRef.current.offsetWidth
      }
    }

    window.addEventListener('resize', onResize)
    onResize()

    const globe = createGlobe(canvasRef.current!, {
      ...finalConfig,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      onRender: (state) => {
        if (!pointerInteracting.current) {
          phiRef.current += 0.005
        }
        state.phi = phiRef.current + rs.get()
        state.width = widthRef.current * 2
        state.height = widthRef.current * 2
      },
    })

    setTimeout(() => (canvasRef.current?.style.opacity = '1'), 0)
    return () => {
      globe.destroy()
      window.removeEventListener('resize', onResize)
    }
  }, [rs, finalConfig])

  return (
    <div className={cn('absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]', className)}>
      <canvas
        className={cn(
          'size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]'
        )}
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX
          updatePointerInteraction(e.clientX)
        }}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) => e.touches[0] && updateMovement(e.touches[0].clientX)}
      />
    </div>
  )
}
