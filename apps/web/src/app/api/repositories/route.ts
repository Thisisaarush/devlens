import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { repositories, accounts } from '@/db/schema'
import { GitHubClient } from '@devlens/github'
import { eq, and } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const repos = await db.query.repositories.findMany({
    where: eq(repositories.userId, session.user.id),
  })

  return NextResponse.json({ repositories: repos })
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const githubAccount = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, session.user.id), eq(accounts.provider, 'github')),
  })
  if (!githubAccount?.accessToken) {
    return NextResponse.json({ error: 'GitHub account not connected' }, { status: 400 })
  }

  const client = new GitHubClient(githubAccount.accessToken)
  const githubRepos = await client.listRepositories()

  // Upsert all repos
  for (const repo of githubRepos) {
    const existing = await db.query.repositories.findFirst({
      where: and(eq(repositories.userId, session.user.id), eq(repositories.githubId, repo.id)),
    })

    if (!existing) {
      await db.insert(repositories).values({
        userId: session.user.id,
        githubId: repo.id,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
        isPrivate: repo.isPrivate,
        language: repo.language,
      })
    }
  }

  return NextResponse.json({ synced: githubRepos.length })
}
