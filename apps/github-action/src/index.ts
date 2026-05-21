import * as core from '@actions/core'
import * as github from '@actions/github'
import { createAIProvider } from '@devlens/ai-providers'
import { GitHubClient, buildReviewPrompt, buildReviewSystemPrompt, parseReviewResponse, formatReviewAsComment } from '@devlens/github'
import type { AIProviderType } from '@devlens/core'

async function run(): Promise<void> {
  try {
    const aiProvider = core.getInput('ai-provider', { required: true }) as AIProviderType
    const aiApiKey = core.getInput('ai-api-key')
    const githubToken = core.getInput('github-token', { required: true })
    const postComment = core.getInput('post-comment') !== 'false'

    // Validate we have a key
    if (!aiApiKey && aiProvider !== 'copilot') {
      core.setFailed(`ai-api-key is required for provider: ${aiProvider}`)
      return
    }

    // Only run on pull_request events
    const context = github.context
    if (context.eventName !== 'pull_request') {
      core.warning('DevLens only runs on pull_request events. Skipping.')
      return
    }

    const pullRequest = context.payload.pull_request
    if (!pullRequest) {
      core.setFailed('Could not get pull request payload')
      return
    }

    core.info(`Reviewing PR #${pullRequest.number}: ${pullRequest.title}`)

    // Build AI provider
    const provider = createAIProvider({
      type: aiProvider,
      apiKey: aiApiKey || undefined,
      accessToken: aiProvider === 'copilot' ? githubToken : undefined,
    })

    // Build GitHub client
    const githubClient = new GitHubClient(githubToken)
    const { owner, repo } = context.repo
    const pullNumber = pullRequest.number as number

    // Fetch diff
    core.info('Fetching PR diff...')
    const diff = await githubClient.getPRDiff(owner, repo, pullNumber)
    core.info(`Fetched ${diff.files.length} files (+${diff.additions} -${diff.deletions})`)

    // Generate review
    core.info(`Generating review with ${aiProvider}...`)
    const prompt = buildReviewPrompt(diff)
    const systemPrompt = buildReviewSystemPrompt()
    const raw = await provider.complete(prompt, { systemPrompt, maxTokens: 4096, temperature: 0.2 })
    const review = parseReviewResponse(raw)

    core.info(`Review complete. Risk level: ${review.riskLevel}`)

    // Post comment
    if (postComment) {
      core.info('Posting review comment to PR...')
      const comment = formatReviewAsComment(review)
      await githubClient.postPRComment(owner, repo, pullNumber, comment)
      core.info('Comment posted.')
    }

    // Set outputs
    core.setOutput('review', JSON.stringify(review))
    core.setOutput('risk-level', review.riskLevel)

    // Fail the action if high risk issues found
    const errorCount = [
      ...review.sections.bugs,
      ...review.sections.security,
    ].filter((i) => i.severity === 'error').length

    if (errorCount > 0) {
      core.warning(`DevLens found ${errorCount} high-severity issue(s). Review before merging.`)
    }
  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err))
  }
}

run()
