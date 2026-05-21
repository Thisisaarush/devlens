'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GitPullRequest, Loader2, AlertCircle, CheckCircle, ExternalLink, GitBranch } from 'lucide-react'
import type { PRReview, PRDiff } from '@devlens/core'

type ReviewMode = 'idle' | 'loading' | 'done' | 'error'

export default function ReviewPage() {
  const [prUrl, setPrUrl] = useState('')
  const [provider, setProvider] = useState('openai')
  const [postToGitHub, setPostToGitHub] = useState(false)
  const [mode, setMode] = useState<ReviewMode>('idle')
  const [review, setReview] = useState<PRReview | null>(null)
  const [diff, setDiff] = useState<Partial<PRDiff> | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!prUrl) return
    setMode('loading')
    setError('')
    setReview(null)

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl, provider, postToGitHub }),
      })
      const data = await res.json() as { review?: PRReview; diff?: Partial<PRDiff>; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate review')
      setReview(data.review!)
      setDiff(data.diff ?? null)
      setMode('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setMode('error')
    }
  }

  const riskVariant = (risk: string) =>
    risk === 'high' ? 'danger' : risk === 'medium' ? 'warning' : 'success'

  const severityVariant = (sev: string) =>
    sev === 'error' ? 'danger' : sev === 'warning' ? 'warning' : 'secondary'

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GitPullRequest className="h-6 w-6 text-blue-400" />
          PR Reviewer
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          AI-powered code review — bugs, security, performance, and style.
        </p>
      </div>

      {/* Input */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Pull Request URL</label>
            <Input
              placeholder="https://github.com/owner/repo/pull/123"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-slate-300">AI Provider</label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="copilot">GitHub Copilot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="post"
                checked={postToGitHub}
                onChange={(e) => setPostToGitHub(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
              <label htmlFor="post" className="text-sm text-slate-300 flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> Post to GitHub
              </label>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!prUrl || mode === 'loading'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {mode === 'loading' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing PR...</>
            ) : (
              <><GitPullRequest className="h-4 w-4" /> Generate Review</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {mode === 'error' && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {mode === 'done' && review && (
        <div className="space-y-4">
          {/* Header */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white">{diff?.title}</CardTitle>
                  <CardDescription className="mt-1">{review.summary}</CardDescription>
                </div>
                <Badge variant={riskVariant(review.riskLevel) as 'danger' | 'warning' | 'success'} className="shrink-0 text-sm px-3 py-1">
                  {review.riskLevel.toUpperCase()} RISK
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Sections */}
          {(['bugs', 'security', 'performance', 'style'] as const).map((section) => {
            const items = review.sections[section]
            const sectionLabel = { bugs: '🐛 Bugs', security: '🔐 Security', performance: '⚡ Performance', style: '🎨 Style' }[section]
            return (
              <Card key={section} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white flex items-center justify-between">
                    {sectionLabel}
                    {items.length > 0 ? (
                      <Badge variant="outline" className="text-slate-400">{items.length} issue{items.length !== 1 ? 's' : ''}</Badge>
                    ) : (
                      <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="h-3 w-3" />Clean</span>
                    )}
                  </CardTitle>
                </CardHeader>
                {items.length > 0 && (
                  <CardContent className="space-y-3 pt-0">
                    {items.map((item, i) => (
                      <div key={i} className="rounded-lg bg-slate-800/50 p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={severityVariant(item.severity) as 'danger' | 'warning' | 'secondary'} className="text-xs">
                            {item.severity}
                          </Badge>
                          {item.file && (
                            <code className="text-xs text-blue-400">
                              {item.file}{item.line ? `:${item.line}` : ''}
                            </code>
                          )}
                        </div>
                        <p className="text-sm text-slate-300">{item.message}</p>
                        {item.suggestion && (
                          <p className="text-xs text-slate-400 border-l-2 border-blue-500 pl-2">{item.suggestion}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* Overall feedback */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white">Overall Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">{review.overallFeedback}</p>
              {diff?.url && (
                <a
                  href={diff.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                >
                  View PR on GitHub <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
