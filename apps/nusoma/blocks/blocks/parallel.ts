import { ParallelIcon } from '@nusoma/design-system/components/icons'
import type { BlockConfig } from '../types'

interface ParallelBlockOutput {
  success: boolean
  output: {
    results: any[]
  }
}

export const ParallelBlock: BlockConfig<ParallelBlockOutput> = {
  type: 'parallel',
  name: 'Parallel',
  description: 'Execute multiple blocks in parallel',
  longDescription: 'Add a parallel block to execute multiple sequences of blocks simultaneously.',
  docsLink: 'https://docs.nusoma.app/blocks/parallel',
  bgColor: '#3b82f6',
  icon: ParallelIcon,
  category: 'blocks',
  subBlocks: [
    {
      id: 'maxConcurrency',
      type: 'slider',
      title: 'Maximum Concurrent Executions',
      value: () => '5',
      min: 1,
      max: 10,
    },
  ],
  outputs: {
    response: {
      type: {
        results: 'json',
      },
    },
  },
  tools: {
    access: [],
  },
  inputs: {},
}
