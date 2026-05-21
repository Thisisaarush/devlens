import type { CodeChunk } from '@devlens/core'

// File extensions to index
const INDEXABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
  '.c', '.cpp', '.cs', '.rb', '.php', '.swift', '.kt', '.scala',
  '.vue', '.svelte', '.html', '.css', '.scss', '.sql', '.sh',
  '.yaml', '.yml', '.json', '.toml', '.md',
])

// Files/dirs to always skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /dist\//,
  /build\//,
  /\.next\//,
  /coverage\//,
  /\.turbo\//,
  /pnpm-lock\.yaml/,
  /package-lock\.json/,
  /yarn\.lock/,
]

const CHUNK_SIZE = 60  // lines per chunk
const CHUNK_OVERLAP = 10 // lines of overlap between chunks

export function shouldIndexFile(filePath: string): boolean {
  if (SKIP_PATTERNS.some((p) => p.test(filePath))) return false
  const ext = '.' + filePath.split('.').pop()
  return INDEXABLE_EXTENSIONS.has(ext)
}

/**
 * Detect language from file extension.
 */
export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', go: 'go', rs: 'rust', java: 'java', c: 'c', cpp: 'cpp',
    cs: 'csharp', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
    scala: 'scala', vue: 'vue', svelte: 'svelte', html: 'html', css: 'css',
    scss: 'scss', sql: 'sql', sh: 'bash', yaml: 'yaml', yml: 'yaml',
    json: 'json', toml: 'toml', md: 'markdown',
  }
  return map[ext] ?? 'text'
}

/**
 * Split file content into overlapping chunks.
 * Uses line-based chunking with overlap for better context preservation.
 */
export function chunkFile(
  repoId: string,
  filePath: string,
  content: string,
): CodeChunk[] {
  const lines = content.split('\n')
  const language = detectLanguage(filePath)
  const chunks: CodeChunk[] = []

  // Small files: single chunk
  if (lines.length <= CHUNK_SIZE) {
    chunks.push({
      repoId,
      filePath,
      startLine: 1,
      endLine: lines.length,
      content,
      language,
    })
    return chunks
  }

  let start = 0
  while (start < lines.length) {
    const end = Math.min(start + CHUNK_SIZE, lines.length)
    const chunkLines = lines.slice(start, end)

    chunks.push({
      repoId,
      filePath,
      startLine: start + 1,
      endLine: end,
      content: chunkLines.join('\n'),
      language,
    })

    // Move forward, keeping overlap
    start += CHUNK_SIZE - CHUNK_OVERLAP
    if (start >= lines.length) break
  }

  return chunks
}

/**
 * Find the most relevant files for a given question using keyword matching.
 * Used for lazy indexing — we only embed files most likely to contain the answer.
 */
export function rankFilesByRelevance(question: string, filePaths: string[]): string[] {
  const keywords = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2)

  const scored = filePaths
    .filter(shouldIndexFile)
    .map((path) => {
      const pathLower = path.toLowerCase()
      const score = keywords.reduce((acc, kw) => acc + (pathLower.includes(kw) ? 1 : 0), 0)
      return { path, score }
    })
    .sort((a, b) => b.score - a.score)

  // Return top 20 most relevant files, always include at least some
  return scored.slice(0, 20).map((s) => s.path)
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0)
    normA += (a[i] ?? 0) ** 2
    normB += (b[i] ?? 0) ** 2
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
