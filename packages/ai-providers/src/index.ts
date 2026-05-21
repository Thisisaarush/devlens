import type { AIProvider, AIProviderConfig, AIProviderType } from '@devlens/core'
import { DevLensError } from '@devlens/core'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GeminiProvider } from './gemini'
import { CopilotProvider } from './copilot'

export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.type) {
    case 'openai':
      if (!config.apiKey) throw new DevLensError('OpenAI API key is required', 'MISSING_API_KEY', 400)
      return new OpenAIProvider(config.apiKey)

    case 'anthropic':
      if (!config.apiKey) throw new DevLensError('Anthropic API key is required', 'MISSING_API_KEY', 400)
      return new AnthropicProvider(config.apiKey)

    case 'gemini':
      if (!config.apiKey && !config.accessToken)
        throw new DevLensError('Gemini API key or access token is required', 'MISSING_API_KEY', 400)
      return new GeminiProvider((config.apiKey ?? config.accessToken)!)

    case 'copilot':
      if (!config.accessToken)
        throw new DevLensError('GitHub Copilot access token is required', 'MISSING_API_KEY', 400)
      return new CopilotProvider(config.accessToken)

    default: {
      const _exhaustive: never = config.type
      throw new DevLensError(`Unknown AI provider: ${_exhaustive}`, 'UNKNOWN_PROVIDER', 400)
    }
  }
}

export type { AIProvider, AIProviderType, AIProviderConfig }
export { OpenAIProvider } from './openai'
export { AnthropicProvider } from './anthropic'
export { GeminiProvider } from './gemini'
export { CopilotProvider } from './copilot'
