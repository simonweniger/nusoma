import React from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { useColors } from '../../theme'
import { usePmStore } from '../../stores/pmStore'

interface Props {
  onSync: () => void
}

export function SyncStatus({ onSync }: Props) {
  const colors = useColors()
  const syncProgress = usePmStore((s) => s.syncProgress)
  const lastSyncResult = usePmStore((s) => s.lastSyncResult)

  const isSyncing = syncProgress !== null

  return (
    <div style={{ padding: '8px 12px', borderTop: `1px solid ${colors.containerBorder}` }}>
      {isSyncing && (
        <div style={{ marginBottom: 6 }}>
          <div
            style={{
              fontSize: 10,
              color: colors.textTertiary,
              marginBottom: 3,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{syncProgress.message}</span>
            {syncProgress.total > 0 && (
              <span>{syncProgress.current}/{syncProgress.total}</span>
            )}
          </div>
          {syncProgress.total > 0 && (
            <div
              style={{
                height: 2,
                background: colors.surfaceSecondary,
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: colors.accent,
                  borderRadius: 1,
                  width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        {lastSyncResult && !isSyncing ? (
          <span style={{ fontSize: 10, color: colors.textTertiary }}>
            Last sync: +{lastSyncResult.created} created, {lastSyncResult.updated} updated, {lastSyncResult.pushed} pushed
            {lastSyncResult.errors.length > 0 && (
              <span style={{ color: colors.statusError }}> ({lastSyncResult.errors.length} errors)</span>
            )}
          </span>
        ) : (
          <span />
        )}

        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-1"
          style={{
            background: 'transparent',
            border: `1px solid ${colors.containerBorder}`,
            borderRadius: 6,
            padding: '3px 8px',
            fontSize: 11,
            color: isSyncing ? colors.textTertiary : colors.textSecondary,
            cursor: isSyncing ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ArrowsClockwise size={11} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
          {isSyncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>
    </div>
  )
}
