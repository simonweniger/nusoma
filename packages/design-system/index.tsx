import { AnalyticsProvider } from '@nusoma/analytics'
import type { ThemeProviderProps } from 'next-themes'
import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import { ThemeProvider } from './providers/theme'

export const DesignSystemProvider = ({ children, ...properties }: ThemeProviderProps) => (
  <ThemeProvider {...properties}>
    <AnalyticsProvider>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </AnalyticsProvider>
  </ThemeProvider>
)
