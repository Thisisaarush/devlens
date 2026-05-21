'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Code2, GitPullRequest, MessageSquare, Zap, Settings, LogOut, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/review', icon: GitPullRequest, label: 'PR Reviewer' },
  { href: '/summarize', icon: MessageSquare, label: 'PR Summarizer' },
  { href: '/chat', icon: Zap, label: 'Codebase Q&A' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-slate-800 bg-slate-950 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 pb-6">
        <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Code2 className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-white text-lg">DevLens</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-800 px-3 pt-4 space-y-2">
        <div className="flex items-center gap-3 px-1">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? ''} className="h-7 w-7 rounded-full" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
              {user.name?.[0] ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
