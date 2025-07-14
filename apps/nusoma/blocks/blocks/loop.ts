import { LoopIcon } from '@nusoma/design-system/components/icons'
import type { BlockConfig } from '../types'

interface LoopBlockOutput {
  success: boolean
  output: {
    index: number
    currentItem: any
    items: any[]
  }
}

export const LoopBlock: BlockConfig<LoopBlockOutput> = {
  type: 'loop',
  name: 'Loop',
  description: 'Execute a sequence of blocks multiple times',
  longDescription:
    'Add a loop to execute a sequence of blocks multiple times, either a fixed number of times or over a collection of items.',
  docsLink: 'https://docs.nusoma.app/blocks/loop',
  bgColor: '#3b82f6',
  icon: LoopIcon,
  category: 'blocks',
  subBlocks: [
    {
      id: 'loopType',
      type: 'dropdown',
      title: 'Loop Type',
      options: [
        { label: 'For Loop', id: 'for' },
        { label: 'For Each', id: 'forEach' },
      ],
      value: () => 'for',
    },
    {
      id: 'count',
      type: 'slider',
      title: 'Number of Iterations',
      value: () => '5',
      min: 1,
      max: 50,
      condition: {
        field: 'loopType',
        value: 'for',
      },
    },
    {
      id: 'collection',
      type: 'long-input',
      title: 'Collection to Iterate Over',
      value: () => '',
      condition: {
        field: 'loopType',
        value: 'forEach',
      },
    },
  ],
  outputs: {
    response: {
      type: {
        index: 'number',
        currentItem: 'any',
        items: 'json',
      },
    },
  },
  tools: {
    access: [],
  },
  inputs: {},
}
