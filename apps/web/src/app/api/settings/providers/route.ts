import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveProviderKey, listConfiguredProviders } from '@/lib/providers'
import type { AIProviderType } from '@devlens/core'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providers = await listConfiguredProviders(session.user.id)
  return NextResponse.json({ providers })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { provider: AIProviderType; apiKey?: string; accessToken?: string }
  const { provider, apiKey, accessToken } = body

  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 })
  }
  if (!apiKey && !accessToken) {
    return NextResponse.json({ error: 'apiKey or accessToken is required' }, { status: 400 })
  }

  await saveProviderKey(session.user.id, provider, apiKey, accessToken)
  return NextResponse.json({ success: true })
}
