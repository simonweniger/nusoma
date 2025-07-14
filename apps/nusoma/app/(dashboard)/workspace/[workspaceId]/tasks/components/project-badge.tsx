import { Badge } from '@nusoma/design-system/components/ui/badge'
import { FolderOpen } from 'lucide-react'
import Link from 'next/link'

interface ProjectInfo {
  id: string
  name: string
  workspaceId?: string
  workspaceName?: string
}

interface ProjectBadgeProps {
  project: ProjectInfo
  href?: string
  showIcon?: boolean
  className?: string
}

export function ProjectBadge({
  project,
  href,
  showIcon = true,
  className = '',
}: ProjectBadgeProps) {
  const defaultHref = project.workspaceId
    ? `/workspace/${project.workspaceId}/projects/${project.id}`
    : `/projects/${project.id}`

  const linkHref = href || defaultHref

  return (
    <Link
      href={linkHref}
      className={`flex items-center justify-center gap-1.5 ${className}`}
      legacyBehavior
    >
      <Badge
        variant='outline'
        className='gap-1.5 rounded-full bg-background text-muted-foreground transition-colors hover:bg-muted/50'
      >
        {showIcon && <FolderOpen size={14} />}
        <span className='max-w-[120px] truncate'>{project.name}</span>
      </Badge>
    </Link>
  )
}
