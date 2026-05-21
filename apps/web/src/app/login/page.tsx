import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LoginButtons } from './login-buttons'
import { Code2, GitPullRequest, MessageSquare, Zap } from 'lucide-react'

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Code2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">DevLens</span>
          </div>
          <p className="text-slate-400 text-sm">AI-powered developer suite. Bring your own AI key.</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: GitPullRequest, label: 'PR Reviewer', desc: 'Bugs, security, performance & style' },
            { icon: MessageSquare, label: 'PR Summarizer', desc: 'Plain-English change summaries' },
            { icon: Zap, label: 'Codebase Q&A', desc: 'Ask anything about your repos' },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3"
            >
              <Icon className="h-5 w-5 text-blue-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Login */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <p className="text-center text-sm text-slate-300 font-medium">Sign in to get started</p>
          <LoginButtons />
          <p className="text-center text-xs text-slate-500">
            Open source · Bring your own AI key · No data stored without consent
          </p>
        </div>
      </div>
    </div>
  )
}
