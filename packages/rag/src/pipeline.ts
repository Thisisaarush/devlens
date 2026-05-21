import type { AIProvider, CodeChunk, QAMessage, Citation } from '@devlens/core'
import { GitHubClient } from '@devlens/github'
import { chunkFile, rankFilesByRelevance, cosineSimilarity, shouldIndexFile } from './chunker'

const QA_SYSTEM_PROMPT = `You are an expert software engineer answering questions about a codebase.
Use the provided code context to give accurate, specific answers.
Always cite the exact files and line numbers where relevant code lives.
If the context doesn't contain enough information, say so clearly.`

interface RetrievedChunk extends CodeChunk {
  similarity: number
}

export class RAGPipeline {
  private provider: AIProvider
  private githubClient: GitHubClient
  private chunkCache: Map<string, CodeChunk & { embedding: number[] }> = new Map()

  constructor(provider: AIProvider, githubClient: GitHubClient) {
    this.provider = provider
    this.githubClient = githubClient
  }

  /**
   * Answer a question about a codebase using lazy RAG.
   * Only fetches and embeds files most relevant to the question.
   */
  async query(
    owner: string,
    repo: string,
    question: string,
    history: QAMessage[] = [],
  ): Promise<QAMessage> {
    // Step 1: Get all file paths in the repo
    const allFiles = await this.githubClient.listAllFiles(owner, repo)

    // Step 2: Rank files by keyword relevance to the question (lazy indexing)
    const relevantFiles = rankFilesByRelevance(question, allFiles)

    // Step 3: Fetch + chunk + embed only the relevant files
    const chunks = await this.fetchAndEmbedFiles(owner, repo, relevantFiles, question)

    // Step 4: Find top-k most similar chunks to the question
    const questionEmbedding = await this.provider.embed(question)
    const topChunks = this.retrieveTopChunks(chunks, questionEmbedding, 8)

    // Step 5: Build context + prompt
    const context = this.buildContext(topChunks)
    const prompt = this.buildQAPrompt(question, context, history)

    // Step 6: Get AI answer
    const answer = await this.provider.complete(prompt, {
      systemPrompt: QA_SYSTEM_PROMPT,
      maxTokens: 2048,
      temperature: 0.1,
    })

    // Step 7: Extract citations from top chunks
    const citations: Citation[] = topChunks.slice(0, 5).map((c) => ({
      filePath: c.filePath,
      startLine: c.startLine,
      endLine: c.endLine,
      content: c.content.slice(0, 200),
    }))

    return {
      role: 'assistant',
      content: answer,
      citations,
    }
  }

  private async fetchAndEmbedFiles(
    owner: string,
    repo: string,
    filePaths: string[],
    question: string,
  ): Promise<(CodeChunk & { embedding: number[] })[]> {
    const repoId = `${owner}/${repo}`
    const result: (CodeChunk & { embedding: number[] })[] = []

    // Process files in batches of 5 to avoid rate limits
    const BATCH_SIZE = 5
    for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
      const batch = filePaths.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (filePath) => {
          if (!shouldIndexFile(filePath)) return

          try {
            const content = await this.githubClient.getFileContent(owner, repo, filePath)
            const chunks = chunkFile(repoId, filePath, content)

            await Promise.all(
              chunks.map(async (chunk) => {
                const cacheKey = `${repoId}:${filePath}:${chunk.startLine}`
                const cached = this.chunkCache.get(cacheKey)

                if (cached) {
                  result.push(cached)
                  return
                }

                const embedding = await this.provider.embed(
                  `File: ${filePath}\n\n${chunk.content}`,
                )
                const withEmbedding = { ...chunk, embedding }
                this.chunkCache.set(cacheKey, withEmbedding)
                result.push(withEmbedding)
              }),
            )
          } catch {
            // Skip files that can't be fetched (binary, too large, etc.)
          }
        }),
      )
    }

    return result
  }

  private retrieveTopChunks(
    chunks: (CodeChunk & { embedding: number[] })[],
    queryEmbedding: number[],
    topK: number,
  ): RetrievedChunk[] {
    return chunks
      .map((chunk) => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
  }

  private buildContext(chunks: RetrievedChunk[]): string {
    return chunks
      .map(
        (c) =>
          `### ${c.filePath} (lines ${c.startLine}-${c.endLine})\n\`\`\`${c.language}\n${c.content}\n\`\`\``,
      )
      .join('\n\n')
  }

  private buildQAPrompt(
    question: string,
    context: string,
    history: QAMessage[],
  ): string {
    const historyText = history
      .slice(-6) // last 3 exchanges
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')

    return `${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}Relevant code context:
${context}

Question: ${question}

Answer the question based on the code context above. Be specific and cite file paths and line numbers.`
  }
}
