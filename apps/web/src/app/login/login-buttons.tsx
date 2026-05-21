'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { GitBranch, Globe } from 'lucide-react'
import { useState } from 'react'

export function LoginButtons() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSignIn = async (provider: string) => {
    setLoading(provider)
    await signIn(provider, { callbackUrl: '/dashboard' })
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full bg-white text-slate-900 hover:bg-slate-100"
        onClick={() => handleSignIn('github')}
        disabled={!!loading}
      >
        {loading === 'github' ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-900" />
        ) : (
        <GitBranch className="h-4 w-4" />
        )}
        Continue with GitHub
      </Button>
      <Button
        variant="outline"
        className="w-full border-slate-700 bg-transparent text-white hover:bg-slate-800 hover:text-white"
        onClick={() => handleSignIn('google')}
        disabled={!!loading}
      >
        {loading === 'google' ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-white" />
        ) : (
        <Globe className="h-4 w-4" />
        )}
        Continue with Google (Gemini)
      </Button>
    </div>
  )
}
