import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider, AIProviderType, CompletionOptions } from '@devlens/core'

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey)
  }

  getProviderType(): AIProviderType {
    return 'gemini'
  }

  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: options.model ?? 'gemini-1.5-pro',
      ...(options.systemPrompt ? { systemInstruction: options.systemPrompt } : {}),
    })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.2,
      },
    })

    return result.response.text()
  }

  async embed(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model.embedContent(text)
    return result.embedding.values
  }
}
