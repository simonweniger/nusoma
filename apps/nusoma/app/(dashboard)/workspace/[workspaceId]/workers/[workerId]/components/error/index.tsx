'use client'

import { Component, type ReactNode, useEffect } from 'react'
import { Card } from '@nusoma/design-system/components/ui/card'
import { BotIcon } from 'lucide-react'
import { createLogger } from '@/lib/logger/console-logger'

const logger = createLogger('ErrorBoundary')

// ======== Shared Error UI Component ========
interface ErrorUIProps {
  title?: string
  message?: string
  onReset?: () => void
  fullScreen?: boolean
}

export function ErrorUI({
  title = 'Unexpected Error',
  message = 'Ohh sorry...An unexpected error occurred. Please try again later. If the problem persists, please contact support.',
  onReset,
  fullScreen = false,
}: ErrorUIProps) {
  const containerClass = fullScreen
    ? 'flex items-center justify-center w-full h-screen bg-muted/40'
    : 'flex items-center justify-center w-full h-full bg-muted/40'

  return (
    <div className={containerClass}>
      <Card className='max-w-md space-y-4 p-6 text-center'>
        <div className='flex justify-center'>
          <BotIcon className='h-16 w-16 text-muted-foreground' />
        </div>
        <h3 className='font-semibold text-lg'>{title}</h3>
        <p className='text-muted-foreground'>{message}</p>
      </Card>
    </div>
  )
}

// ======== React Error Boundary Component ========
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorUI />
    }

    return this.props.children
  }
}

// ======== Next.js Error Page Component ========
interface NextErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export function NextError({ error, reset }: NextErrorProps) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    logger.error('Worker error:', { error })
  }, [error])

  return <ErrorUI onReset={reset} />
}

// ======== Next.js Global Error Page Component ========
export function NextGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Global workspace error:', { error })
  }, [error])

  return (
    <html lang='en'>
      <body>
        <ErrorUI
          title='Application Error'
          message='Something went wrong with the application. Please try again later.'
          onReset={reset}
          fullScreen={true}
        />
      </body>
    </html>
  )
}
