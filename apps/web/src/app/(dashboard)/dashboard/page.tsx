import { auth } from '@/lib/auth'
import { db, reviews, summaries, conversations } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GitPullRequest, MessageSquare, Zap, Activity } from 'lucide-react'
import Link from 'next/link'
import type { PRReview, PRSummary } from '@devlens/core'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const [recentReviews, recentSummaries, recentConvos] = await Promise.all([
    db.query.reviews.findMany({ where: eq(reviews.userId, userId), orderBy: [desc(reviews.createdAt)], limit: 5 }),
    db.query.summaries.findMany({ where: eq(summaries.userId, userId), orderBy: [desc(summaries.createdAt)], limit: 5 }),
    db.query.conversations.findMany({ where: eq(conversations.userId, userId), orderBy: [desc(conversations.updatedAt)], limit: 5 }),
  ])

  const riskColor = (risk: string) =>
    risk === 'high' ? 'danger' : risk === 'medium' ? 'warning' : 'success'

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Welcome back, {session?.user?.name?.split(' ')[0]}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: GitPullRequest, label: 'PR Reviews', value: recentReviews.length, href: '/review' },
          { icon: MessageSquare, label: 'PR Summaries', value: recentSummaries.length, href: '/summarize' },
          { icon: Zap, label: 'Q&A Sessions', value: recentConvos.length, href: '/chat' },
        ].map(({ icon: Icon, label, value, href }) => (
          <Link key={label} href={href}>
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-600 transition-colors cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Reviews */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              Recent Reviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentReviews.length === 0 ? (
              <p className="text-sm text-slate-500">No reviews yet. <Link href="/review" className="text-blue-400 hover:underline">Start reviewing</Link></p>
            ) : (
              recentReviews.map((r) => {
                const review = JSON.parse(r.reviewJson) as PRReview
                return (
                  <div key={r.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{r.prTitle}</p>
                      <p className="text-xs text-slate-500">{r.provider} · {new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={riskColor(review.riskLevel) as 'danger' | 'warning' | 'success'} className="shrink-0">
                      {review.riskLevel}
                    </Badge>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Summaries */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              Recent Summaries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSummaries.length === 0 ? (
              <p className="text-sm text-slate-500">No summaries yet. <Link href="/summarize" className="text-blue-400 hover:underline">Summarize a PR</Link></p>
            ) : (
              recentSummaries.map((s) => {
                const summary = JSON.parse(s.summaryJson) as PRSummary
                return (
                  <div key={s.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{s.prTitle}</p>
                      <p className="text-xs text-slate-500">{s.provider} · {new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={riskColor(summary.riskLevel) as 'danger' | 'warning' | 'success'} className="shrink-0">
                      {summary.riskLevel}
                    </Badge>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
