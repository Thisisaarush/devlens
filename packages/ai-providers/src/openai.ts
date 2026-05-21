import OpenAI from 'openai'
import type { AIProvider, AIProviderType, CompletionOptions } from '@devlens/core'

export class OpenAIProvider implements AIProvider {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  getProviderType(): AIProviderType {
    return 'openai'
  }

  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model ?? 'gpt-4o',
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.2,
      messages: [
        ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
        { role: 'user' as const, content: prompt },
      ],
    })

    return response.choices[0]?.message?.content ?? ''
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    return response.data[0]?.embedding ?? []
  }
}
