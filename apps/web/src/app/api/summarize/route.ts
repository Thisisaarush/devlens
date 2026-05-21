import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimiter } from '@/lib/redis'
import { getAIProvider } from '@/lib/providers'
import { db } from '@/db'
import { summaries, accounts } from '@/db/schema'
import { GitHubClient, buildSummaryPrompt, buildSummarySystemPrompt, parseSummaryResponse, formatSummaryAsComment } from '@devlens/github'
import { eq, and } from 'drizzle-orm'
import type { AIProviderType } from '@devlens/core'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = await rateLimiter.limit(session.user.id)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  const body = await req.json() as { prUrl: string; provider: AIProviderType; postToGitHub?: boolean }
  const { prUrl, provider, postToGitHub = false } = body

  if (!prUrl || !provider) {
    return NextResponse.json({ error: 'prUrl and provider are required' }, { status: 400 })
  }

  try {
    const githubAccount = await db.query.accounts.findFirst({
      where: and(eq(accounts.userId, session.user.id), eq(accounts.provider, 'github')),
    })
    if (!githubAccount?.accessToken) {
      return NextResponse.json({ error: 'GitHub account not connected' }, { status: 400 })
    }

    const githubClient = new GitHubClient(githubAccount.accessToken)
    const aiProvider = await getAIProvider(session.user.id, provider)

    const { owner, repo, pullNumber } = githubClient.parsePRUrl(prUrl)
    const diff = await githubClient.getPRDiff(owner, repo, pullNumber)

    const prompt = buildSummaryPrompt(diff)
    const systemPrompt = buildSummarySystemPrompt()
    const raw = await aiProvider.complete(prompt, { systemPrompt, maxTokens: 2048, temperature: 0.2 })
    const summary = parseSummaryResponse(raw)

    if (postToGitHub) {
      const comment = formatSummaryAsComment(summary)
      await githubClient.postPRComment(owner, repo, pullNumber, comment)
    }

    await db.insert(summaries).values({
      userId: session.user.id,
      prUrl,
      prTitle: diff.title,
      provider,
      summaryJson: JSON.stringify(summary),
      postedToGitHub: postToGitHub,
    })

    return NextResponse.json({ summary, diff: { title: diff.title, author: diff.author } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
