import { db, aiProviderKeys } from '@/db'
import { encrypt, decrypt } from '@devlens/core'
import { createAIProvider } from '@devlens/ai-providers'
import type { AIProvider, AIProviderType } from '@devlens/core'
import { eq, and } from 'drizzle-orm'

const ENCRYPTION_SECRET = process.env['ENCRYPTION_SECRET']!

export async function saveProviderKey(
  userId: string,
  provider: AIProviderType,
  apiKey?: string,
  accessToken?: string,
): Promise<void> {
  const encryptedKey = apiKey ? encrypt(apiKey, ENCRYPTION_SECRET) : null
  const encryptedToken = accessToken ? encrypt(accessToken, ENCRYPTION_SECRET) : null

  // Upsert — one active key per provider per user
  const existing = await db.query.aiProviderKeys.findFirst({
    where: and(eq(aiProviderKeys.userId, userId), eq(aiProviderKeys.provider, provider)),
  })

  if (existing) {
    await db
      .update(aiProviderKeys)
      .set({
        encryptedKey: encryptedKey ?? existing.encryptedKey,
        accessToken: encryptedToken ?? existing.accessToken,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(aiProviderKeys.id, existing.id))
  } else {
    await db.insert(aiProviderKeys).values({
      userId,
      provider,
      encryptedKey,
      accessToken: encryptedToken,
    })
  }
}

export async function getAIProvider(
  userId: string,
  provider: AIProviderType,
): Promise<AIProvider> {
  const key = await db.query.aiProviderKeys.findFirst({
    where: and(
      eq(aiProviderKeys.userId, userId),
      eq(aiProviderKeys.provider, provider),
      eq(aiProviderKeys.isActive, true),
    ),
  })

  if (!key) {
    throw new Error(`No active ${provider} configuration found. Please add your API key in Settings.`)
  }

  const apiKey = key.encryptedKey ? decrypt(key.encryptedKey, ENCRYPTION_SECRET) : undefined
  const accessToken = key.accessToken ? decrypt(key.accessToken, ENCRYPTION_SECRET) : undefined

  return createAIProvider({ type: provider, apiKey, accessToken })
}

export async function listConfiguredProviders(userId: string): Promise<AIProviderType[]> {
  const keys = await db.query.aiProviderKeys.findMany({
    where: and(eq(aiProviderKeys.userId, userId), eq(aiProviderKeys.isActive, true)),
  })
  return keys.map((k) => k.provider as AIProviderType)
}
