import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AIProviderType, CompletionOptions } from '@devlens/core'

export class AnthropicProvider implements AIProvider {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  getProviderType(): AIProviderType {
    return 'anthropic'
  }

  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const response = await this.client.messages.create({
      model: options.model ?? 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens ?? 4096,
      ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
      messages: [{ role: 'user', content: prompt }],
    })

    const block = response.content[0]
    return block?.type === 'text' ? block.text : ''
  }

  async embed(_text: string): Promise<number[]> {
    // Anthropic does not provide an embeddings API.
    // Fall back to a zero vector — callers should use OpenAI/Gemini for embeddings.
    throw new Error(
      'Anthropic does not support embeddings. Configure OpenAI or Gemini as your embedding provider.',
    )
  }
}
