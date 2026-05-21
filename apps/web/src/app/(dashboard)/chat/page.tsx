'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Zap, Loader2, Send, AlertCircle, FileCode, ChevronDown, ChevronUp } from 'lucide-react'
import type { QAMessage, Citation } from '@devlens/core'

interface Repo { id: string; fullName: string }

export default function ChatPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [repoId, setRepoId] = useState('')
  const [provider, setProvider] = useState('openai')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<QAMessage[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/repositories')
      .then((r) => r.json())
      .then((d: { repositories?: Repo[] }) => setRepos(d.repositories ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const syncRepos = async () => {
    setSyncing(true)
    try {
      await fetch('/api/repositories', { method: 'POST' })
      const res = await fetch('/api/repositories')
      const d = await res.json() as { repositories?: Repo[] }
      setRepos(d.repositories ?? [])
    } finally {
      setSyncing(false)
    }
  }

  const handleSend = async () => {
    if (!question.trim() || !repoId || loading) return
    const q = question.trim()
    setQuestion('')
    setLoading(true)
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, repoId, provider, conversationId }),
      })
      const data = await res.json() as { answer?: QAMessage; conversationId?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setMessages((prev) => [...prev, data.answer!])
      setConversationId(data.conversationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full p-8 gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="h-6 w-6 text-blue-400" />
          Codebase Q&A
        </h1>
        <p className="text-slate-400 text-sm mt-1">Ask anything about your repositories. Powered by RAG.</p>
      </div>

      {/* Config */}
      <Card className="bg-slate-900 border-slate-800 shrink-0">
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <label className="text-sm text-slate-400 shrink-0">Repository</label>
            <Select value={repoId} onValueChange={setRepoId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select repo..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white max-h-60">
                {repos.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 min-w-40">
            <label className="text-sm text-slate-400 shrink-0">Provider</label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="copilot">Copilot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={syncRepos} disabled={syncing} className="border-slate-700 text-slate-300 hover:text-white shrink-0">
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sync Repos'}
          </Button>
        </CardContent>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-slate-400 text-sm">Select a repository and ask anything about the codebase.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Where is auth handled?', 'How does the payment flow work?', 'What does the main API route do?'].map((q) => (
                <button key={q} onClick={() => setQuestion(q)} className="text-xs text-blue-400 border border-slate-700 rounded-full px-3 py-1 hover:border-blue-500 hover:bg-blue-500/10 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {loading && (
          <div className="flex items-center gap-3 p-4">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 p-3 text-red-400 text-sm shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 shrink-0">
        <Input
          placeholder={repoId ? 'Ask anything about this codebase...' : 'Select a repository first'}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={!repoId || loading}
          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 flex-1"
        />
        <Button onClick={handleSend} disabled={!question.trim() || !repoId || loading} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: QAMessage }) {
  const [citationsOpen, setCitationsOpen] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-slate-700' : 'bg-blue-500'}`}>
        {isUser ? <span className="text-xs text-white">You</span> : <Zap className="h-4 w-4 text-white" />}
      </div>
      <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-xl px-4 py-3 text-sm ${isUser ? 'bg-slate-700 text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'}`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setCitationsOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
            >
              <FileCode className="h-3 w-3" />
              {message.citations.length} source{message.citations.length !== 1 ? 's' : ''}
              {citationsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {citationsOpen && (
              <div className="mt-2 space-y-2">
                {message.citations.map((c: Citation, i: number) => (
                  <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs font-mono text-blue-400 border-slate-700">
                        {c.filePath}:{c.startLine}-{c.endLine}
                      </Badge>
                    </div>
                    <pre className="text-xs text-slate-400 overflow-x-auto">{c.content}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
