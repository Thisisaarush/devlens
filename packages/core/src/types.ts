// AI Provider Types
export type AIProviderType = 'openai' | 'anthropic' | 'gemini' | 'copilot'

export interface AIProvider {
  complete(prompt: string, options?: CompletionOptions): Promise<string>
  embed(text: string): Promise<number[]>
  getProviderType(): AIProviderType
}

export interface CompletionOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface AIProviderConfig {
  type: AIProviderType
  apiKey?: string
  accessToken?: string // for OAuth providers
}

// PR Types
export interface PRDiff {
  url: string
  title: string
  description: string
  author: string
  baseBranch: string
  headBranch: string
  files: DiffFile[]
  additions: number
  deletions: number
}

export interface DiffFile {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed'
  additions: number
  deletions: number
  patch: string
}

export interface PRReview {
  summary: string
  riskLevel: 'low' | 'medium' | 'high'
  sections: {
    bugs: ReviewComment[]
    security: ReviewComment[]
    performance: ReviewComment[]
    style: ReviewComment[]
  }
  overallFeedback: string
}

export interface ReviewComment {
  file?: string
  line?: number
  severity: 'info' | 'warning' | 'error'
  message: string
  suggestion?: string
}

export interface PRSummary {
  whatChanged: string
  whyItMatters: string
  riskLevel: 'low' | 'medium' | 'high'
  testingChecklist: string[]
  breakingChanges: boolean
  breakingChangesDescription?: string
}

// Codebase Q&A Types
export interface CodeChunk {
  repoId: string
  filePath: string
  startLine: number
  endLine: number
  content: string
  language: string
  embedding?: number[]
}

export interface QAMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

export interface Citation {
  filePath: string
  startLine: number
  endLine: number
  content: string
}

// Repository Types
export interface Repository {
  id: string
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  isPrivate: boolean
  language?: string
}

// Error Types
export class DevLensError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message)
    this.name = 'DevLensError'
  }
}
