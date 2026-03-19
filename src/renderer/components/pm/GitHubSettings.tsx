import React, { useState, useEffect } from 'react'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { useColors } from '../../theme'

interface Props {
  githubOwner?: string | null
  githubRepo?: string | null
}

export function GitHubSettings({ githubOwner, githubRepo }: Props) {
  const colors = useColors()
  const [token, setToken] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.nusoma.pm.hasGitHubToken().then(setHasToken).catch(() => {})
  }, [])

  const handleSaveToken = async () => {
    if (!token.trim()) return
    setSaving(true)
    try {
      await window.nusoma.pm.setGitHubToken(token.trim())
      setHasToken(true)
      setToken('')
      setTestResult(null)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!githubOwner || !githubRepo) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.nusoma.pm.testGitHubConnection(githubOwner, githubRepo)
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }

  const fieldStyle = {
    background: colors.surfacePrimary,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 12,
    color: colors.textPrimary,
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    fontSize: 11,
    fontWeight: 500,
    color: colors.textTertiary,
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div style={{ padding: '0 12px 12px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        GitHub
      </p>

      {/* Token input */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          Personal Access Token {hasToken && <span style={{ color: colors.statusComplete }}>✓ set</span>}
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={hasToken ? 'Replace existing token…' : 'ghp_…'}
            style={fieldStyle}
            onFocus={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputFocusBorder }}
            onBlur={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputBorder }}
          />
          <button
            onClick={handleSaveToken}
            disabled={!token.trim() || saving}
            style={{
              background: token.trim() ? colors.accent : colors.btnDisabled,
              border: 'none',
              borderRadius: 8,
              padding: '0 12px',
              fontSize: 12,
              color: token.trim() ? '#fff' : colors.textTertiary,
              cursor: token.trim() ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Test connection */}
      {githubOwner && githubRepo && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleTest}
            disabled={testing || !hasToken}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.containerBorder}`,
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 12,
              color: colors.textSecondary,
              cursor: hasToken ? 'pointer' : 'default',
            }}
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>

          {testResult && (
            <span
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: testResult.ok ? colors.statusComplete : colors.statusError }}
            >
              {testResult.ok ? <CheckCircle size={13} /> : <WarningCircle size={13} />}
              {testResult.ok ? 'Connected' : testResult.error ?? 'Failed'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
