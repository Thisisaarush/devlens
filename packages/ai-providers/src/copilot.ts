import type { AIProvider, AIProviderType, CompletionOptions } from '@devlens/core'

/**
 * GitHub Copilot uses the OpenAI-compatible API via GitHub's endpoint.
 * Users authenticate via GitHub OAuth — we use their access token.
 */
export class CopilotProvider implements AIProvider {
  private baseURL = 'https://api.githubcopilot.com'
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  getProviderType(): AIProviderType {
    return 'copilot'
  }

  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Copilot-Integration-Id': 'devlens',
      },
      body: JSON.stringify({
        model: options.model ?? 'gpt-4o',
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.2,
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Copilot API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>
    }

    return data.choices[0]?.message?.content ?? ''
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error(
      'GitHub Copilot does not support embeddings. Configure OpenAI or Gemini as your embedding provider.',
    )
  }
}
