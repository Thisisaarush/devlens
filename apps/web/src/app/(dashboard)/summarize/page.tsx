'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Loader2, AlertCircle, CheckCircle, GitBranch, Copy, Check } from 'lucide-react'
import type { PRSummary } from '@devlens/core'

export default function SummarizePage() {
  const [prUrl, setPrUrl] = useState('')
  const [provider, setProvider] = useState('openai')
  const [postToGitHub, setPostToGitHub] = useState(false)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<PRSummary | null>(null)
  const [prTitle, setPrTitle] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    if (!prUrl) return
    setLoading(true)
    setError('')
    setSummary(null)

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl, provider, postToGitHub }),
      })
      const data = await res.json() as { summary?: PRSummary; diff?: { title: string }; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setSummary(data.summary!)
      setPrTitle(data.diff?.title ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!summary) return
    const text = `## ${prTitle}\n\n**What Changed:** ${summary.whatChanged}\n\n**Why It Matters:** ${summary.whyItMatters}\n\n**Risk:** ${summary.riskLevel}\n\n**Testing Checklist:**\n${summary.testingChecklist.map((i) => `- [ ] ${i}`).join('\n')}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const riskVariant = (risk: string) =>
    risk === 'high' ? 'danger' : risk === 'medium' ? 'warning' : 'success'

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-400" />
          PR Summarizer
        </h1>
        <p className="text-slate-400 text-sm mt-1">Get a plain-English summary of any pull request instantly.</p>
      </div>

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
              <input type="checkbox" id="post" checked={postToGitHub} onChange={(e) => setPostToGitHub(e.target.checked)} className="h-4 w-4 rounded border-slate-600" />
              <label htmlFor="post" className="text-sm text-slate-300 flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> Post to GitHub
              </label>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!prUrl || loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Summarizing...</> : <><MessageSquare className="h-4 w-4" /> Generate Summary</>}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {summary && (
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base">{prTitle}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={riskVariant(summary.riskLevel) as 'danger' | 'warning' | 'success'}>
                    {summary.riskLevel.toUpperCase()} RISK
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="border-slate-700 text-slate-300 hover:text-white h-8">
                    {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">What Changed</p>
                <p className="text-sm text-slate-200">{summary.whatChanged}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Why It Matters</p>
                <p className="text-sm text-slate-200">{summary.whyItMatters}</p>
              </div>

              {summary.breakingChanges && (
                <div className="rounded-lg border border-red-800 bg-red-950/30 p-3">
                  <p className="text-sm text-red-400 font-medium">⚠️ Breaking Changes</p>
                  <p className="text-sm text-red-300 mt-1">{summary.breakingChangesDescription}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Testing Checklist</p>
                {summary.testingChecklist.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
