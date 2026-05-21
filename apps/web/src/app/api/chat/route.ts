import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimiter } from '@/lib/redis'
import { getAIProvider } from '@/lib/providers'
import { db } from '@/db'
import { conversations, repositories, accounts } from '@/db/schema'
import { GitHubClient } from '@devlens/github'
import { RAGPipeline } from '@devlens/rag'
import { eq, and } from 'drizzle-orm'
import type { AIProviderType, QAMessage } from '@devlens/core'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = await rateLimiter.limit(session.user.id)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  const body = await req.json() as {
    question: string
    repoId: string
    provider: AIProviderType
    conversationId?: string
  }
  const { question, repoId, provider, conversationId } = body

  if (!question || !repoId || !provider) {
    return NextResponse.json({ error: 'question, repoId, and provider are required' }, { status: 400 })
  }

  try {
    // Get the repo
    const repo = await db.query.repositories.findFirst({
      where: and(eq(repositories.id, repoId), eq(repositories.userId, session.user.id)),
    })
    if (!repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    // Get GitHub token
    const githubAccount = await db.query.accounts.findFirst({
      where: and(eq(accounts.userId, session.user.id), eq(accounts.provider, 'github')),
    })
    if (!githubAccount?.accessToken) {
      return NextResponse.json({ error: 'GitHub account not connected' }, { status: 400 })
    }

    // Load conversation history
    let history: QAMessage[] = []
    let conversation = conversationId
      ? await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) })
      : null

    if (conversation) {
      history = JSON.parse(conversation.messagesJson) as QAMessage[]
    }

    // Run RAG pipeline
    const githubClient = new GitHubClient(githubAccount.accessToken)
    const aiProvider = await getAIProvider(session.user.id, provider)
    const rag = new RAGPipeline(aiProvider, githubClient)

    const answer = await rag.query(repo.owner, repo.name, question, history)

    // Update or create conversation
    const userMessage: QAMessage = { role: 'user', content: question }
    const updatedMessages = [...history, userMessage, answer]

    if (conversation) {
      await db
        .update(conversations)
        .set({ messagesJson: JSON.stringify(updatedMessages), updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id))
    } else {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId: session.user.id,
          repoId,
          title: question.slice(0, 100),
          messagesJson: JSON.stringify(updatedMessages),
        })
        .returning()
      conversation = newConversation ?? null
    }

    return NextResponse.json({
      answer,
      conversationId: conversation?.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
