import { Octokit } from '@octokit/rest'
import type { PRDiff, DiffFile, Repository } from '@devlens/core'
import { DevLensError } from '@devlens/core'

export class GitHubClient {
  private octokit: Octokit

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken })
  }

  /**
   * Parse a GitHub PR URL into owner, repo, and pull number.
   */
  parsePRUrl(url: string): { owner: string; repo: string; pullNumber: number } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
    if (!match?.[1] || !match[2] || !match[3]) {
      throw new DevLensError('Invalid GitHub PR URL', 'INVALID_PR_URL', 400)
    }
    return { owner: match[1], repo: match[2], pullNumber: parseInt(match[3], 10) }
  }

  /**
   * Fetch the full diff and metadata for a PR.
   */
  async getPRDiff(owner: string, repo: string, pullNumber: number): Promise<PRDiff> {
    const [prResponse, filesResponse] = await Promise.all([
      this.octokit.pulls.get({ owner, repo, pull_number: pullNumber }),
      this.octokit.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: 100 }),
    ])

    const pr = prResponse.data
    const files: DiffFile[] = filesResponse.data.map((f) => ({
      filename: f.filename,
      status: f.status as DiffFile['status'],
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch ?? '',
    }))

    return {
      url: pr.html_url,
      title: pr.title,
      description: pr.body ?? '',
      author: pr.user?.login ?? 'unknown',
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      files,
      additions: pr.additions,
      deletions: pr.deletions,
    }
  }

  /**
   * Post a review comment on a PR.
   */
  async postPRComment(owner: string, repo: string, pullNumber: number, body: string): Promise<void> {
    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body,
    })
  }

  /**
   * List repositories accessible to the authenticated user.
   */
  async listRepositories(): Promise<Repository[]> {
    const response = await this.octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    })

    return response.data.map((r) => ({
      id: r.id.toString(),
      owner: r.owner?.login ?? '',
      name: r.name,
      fullName: r.full_name,
      defaultBranch: r.default_branch ?? 'main',
      isPrivate: r.private,
      ...(r.language ? { language: r.language } : {}),
    }))
  }

  /**
   * Fetch the raw content of a file from a repository.
   */
  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const response = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ...(ref ? { ref } : {}),
    })

    const data = response.data
    if (Array.isArray(data) || data.type !== 'file') {
      throw new DevLensError(`${path} is not a file`, 'NOT_A_FILE', 400)
    }

    return Buffer.from(data.content, 'base64').toString('utf-8')
  }

  /**
   * List all files in a repository tree (recursively).
   */
  async listAllFiles(owner: string, repo: string, ref?: string): Promise<string[]> {
    const repoData = await this.octokit.repos.get({ owner, repo })
    const branch = ref ?? repoData.data.default_branch

    const tree = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: 'true',
    })

    return tree.data.tree
      .filter((item) => item.type === 'blob' && item.path)
      .map((item) => item.path!)
  }
}
