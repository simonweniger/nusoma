import type { ReactNode } from 'react'
import { ErrorBoundary } from './components/error/index'

export default function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex h-full w-full flex-col items-center'>
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  )
}
