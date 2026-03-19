import React from 'react'
import type { Label } from '../../../shared/pm-types'

interface Props {
  label: Label
}

export function LabelChip({ label }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: `${label.color}22`,
        border: `1px solid ${label.color}44`,
        borderRadius: 4,
        padding: '1px 6px',
        fontSize: 10,
        color: label.color,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: label.color,
          flexShrink: 0,
        }}
      />
      {label.name}
    </span>
  )
}
