'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Settings, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Globe, GitBranch } from 'lucide-react'

type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'copilot'

const PROVIDERS: { id: ProviderType; label: string; description: string; authMethod: 'key' | 'oauth' | 'both' }[] = [
  { id: 'openai', label: 'OpenAI', description: 'GPT-4o, text-embedding-3-small', authMethod: 'key' },
  { id: 'anthropic', label: 'Anthropic (Claude)', description: 'claude-3-5-sonnet', authMethod: 'key' },
  { id: 'gemini', label: 'Google Gemini', description: 'gemini-1.5-pro, text-embedding-004', authMethod: 'both' },
  { id: 'copilot', label: 'GitHub Copilot', description: 'GPT-4o via GitHub — uses your GitHub login', authMethod: 'oauth' },
]

export default function SettingsPage() {
  const [configured, setConfigured] = useState<ProviderType[]>([])
  const [keys, setKeys] = useState<Partial<Record<ProviderType, string>>>({})
  const [show, setShow] = useState<Partial<Record<ProviderType, boolean>>>({})
  const [saving, setSaving] = useState<ProviderType | null>(null)
  const [saved, setSaved] = useState<ProviderType | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetch('/api/settings/providers')
      .then((r) => r.json())
      .then((d: { providers?: ProviderType[] }) => setConfigured(d.providers ?? []))
      .catch(() => {})
  }, [])

  const handleSave = async (provider: ProviderType) => {
    const apiKey = keys[provider]
    if (!apiKey) return
    setSaving(provider)
    setError('')

    try {
      const res = await fetch('/api/settings/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setConfigured((prev) => prev.includes(provider) ? prev : [...prev, provider])
      setKeys((prev) => ({ ...prev, [provider]: '' }))
      setSaved(provider)
      setTimeout(() => setSaved(null), 2000)
    } catch {
      setError(`Failed to save ${provider} key`)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-400" />
          Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure your AI providers. Keys are encrypted at rest.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 p-3 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="space-y-4">
        {PROVIDERS.map((p) => {
          const isConfigured = configured.includes(p.id)
          const isSaving = saving === p.id
          const isSaved = saved === p.id

          return (
            <Card key={p.id} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      {p.label}
                      {isConfigured && (
                        <Badge variant="success" className="text-xs">Connected</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-0.5">{p.description}</CardDescription>
                  </div>
                  {p.id === 'gemini' && (
                    <Globe className="h-5 w-5 text-blue-400" />
                  )}
                  {p.id === 'copilot' && (
                    <GitBranch className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {p.authMethod === 'oauth' ? (
                  <div className="rounded-lg bg-slate-800/50 p-3 text-sm text-slate-400">
                    GitHub Copilot uses your GitHub login automatically. No API key needed.
                    {isConfigured && (
                      <span className="ml-2 text-green-400">✓ Active</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={show[p.id] ? 'text' : 'password'}
                        placeholder={`Enter ${p.label} API key${isConfigured ? ' (already configured)' : ''}...`}
                        value={keys[p.id] ?? ''}
                        onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 pr-10"
                        onKeyDown={(e) => e.key === 'Enter' && handleSave(p.id)}
                      />
                      <button
                        type="button"
                        onClick={() => setShow((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {show[p.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      onClick={() => handleSave(p.id)}
                      disabled={!keys[p.id] || isSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSaved ? (
                        <><CheckCircle className="h-4 w-4" /> Saved</>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                )}

                {p.authMethod === 'both' && (
                  <p className="text-xs text-slate-500 mt-2">
                    Or <button className="text-blue-400 hover:underline">sign in with Google</button> to use OAuth instead of an API key.
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Usage info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm text-white">GitHub Action Setup</CardTitle>
          <CardDescription>Use DevLens in CI/CD without the web app</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-slate-800 rounded-lg p-3 text-slate-300 overflow-x-auto">{`# .github/workflows/devlens.yml
- uses: devlens/review-action@v1
  with:
    ai-provider: openai
    ai-api-key: \${{ secrets.OPENAI_API_KEY }}
    github-token: \${{ secrets.GITHUB_TOKEN }}`}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
