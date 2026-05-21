import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimiter } from '@/lib/redis'
import { getAIProvider } from '@/lib/providers'
import { db } from '@/db'
import { reviews } from '@/db/schema'
import { GitHubClient, buildReviewPrompt, buildReviewSystemPrompt, parseReviewResponse, formatReviewAsComment } from '@devlens/github'
import { accounts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { AIProviderType } from '@devlens/core'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = await rateLimiter.limit(session.user.id)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 })
  }

  const body = await req.json() as { prUrl: string; provider: AIProviderType; postToGitHub?: boolean }
  const { prUrl, provider, postToGitHub = false } = body

  if (!prUrl || !provider) {
    return NextResponse.json({ error: 'prUrl and provider are required' }, { status: 400 })
  }

  try {
    // Get user's GitHub access token
    const githubAccount = await db.query.accounts.findFirst({
      where: and(eq(accounts.userId, session.user.id), eq(accounts.provider, 'github')),
    })
    if (!githubAccount?.accessToken) {
      return NextResponse.json({ error: 'GitHub account not connected' }, { status: 400 })
    }

    const githubClient = new GitHubClient(githubAccount.accessToken)
    const aiProvider = await getAIProvider(session.user.id, provider)

    // Parse PR URL and fetch diff
    const { owner, repo, pullNumber } = githubClient.parsePRUrl(prUrl)
    const diff = await githubClient.getPRDiff(owner, repo, pullNumber)

    // Generate review
    const prompt = buildReviewPrompt(diff)
    const systemPrompt = buildReviewSystemPrompt()
    const raw = await aiProvider.complete(prompt, { systemPrompt, maxTokens: 4096, temperature: 0.2 })
    const review = parseReviewResponse(raw)

    // Post to GitHub if requested
    if (postToGitHub) {
      const comment = formatReviewAsComment(review)
      await githubClient.postPRComment(owner, repo, pullNumber, comment)
    }

    // Save to DB
    await db.insert(reviews).values({
      userId: session.user.id,
      prUrl,
      prTitle: diff.title,
      provider,
      reviewJson: JSON.stringify(review),
      postedToGitHub: postToGitHub,
    })

    return NextResponse.json({ review, diff: { title: diff.title, author: diff.author } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
