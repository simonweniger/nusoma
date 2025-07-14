import { Button } from '@nusoma/design-system/components/ui/button'
import { cn } from '@nusoma/design-system/lib/utils'
import { useEditor } from '@nusoma/editor'
import { SigmaIcon } from 'lucide-react'

export const MathSelector = () => {
  const { editor } = useEditor()

  if (!editor) return null

  return (
    <Button
      variant='ghost'
      size='sm'
      className='w-12 rounded-none'
      onClick={(evt) => {
        if (editor.isActive('math')) {
          editor.chain().focus().unsetLatex().run()
        } else {
          const { from, to } = editor.state.selection
          const latex = editor.state.doc.textBetween(from, to)

          if (!latex) return

          editor.chain().focus().setLatex({ latex }).run()
        }
      }}
    >
      <SigmaIcon
        className={cn('size-4', { 'text-blue-500': editor.isActive('math') })}
        strokeWidth={2.3}
      />
    </Button>
  )
}
