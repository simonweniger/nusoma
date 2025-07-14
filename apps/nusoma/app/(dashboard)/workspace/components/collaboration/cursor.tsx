import { MousePointer2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Cursor = ({
  className,
  style,
  color,
  name,
}: {
  className?: string
  style?: React.CSSProperties
  color: string
  name: string
}) => {
  return (
    <div className={cn('pointer-events-none', className)} style={style}>
      <MousePointer2 color={color} fill={color} size={30} />

      <div
        className='mt-1 rounded px-2 py-1 text-center font-bold text-white text-xs'
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  )
}
