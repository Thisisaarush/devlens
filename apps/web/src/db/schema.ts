import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  vector,
  uuid,
  primaryKey,
} from 'drizzle-orm/pg-core'

// ─── Auth (NextAuth Drizzle Adapter schema) ───────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
)

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
)

// ─── AI Provider Keys ─────────────────────────────────────────────────────────

export const aiProviderKeys = pgTable('ai_provider_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'openai' | 'anthropic' | 'gemini' | 'copilot'
  encryptedKey: text('encrypted_key'), // null for OAuth providers
  accessToken: text('access_token'),   // for OAuth providers (also encrypted)
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Repositories ─────────────────────────────────────────────────────────────

export const repositories = pgTable('repositories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  githubId: text('github_id').notNull(),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  fullName: text('full_name').notNull(),
  defaultBranch: text('default_branch').default('main').notNull(),
  isPrivate: boolean('is_private').default(false).notNull(),
  language: text('language'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Embeddings (pgvector) ────────────────────────────────────────────────────

export const embeddings = pgTable('embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  repoId: uuid('repo_id')
    .notNull()
    .references(() => repositories.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  startLine: integer('start_line').notNull(),
  endLine: integer('end_line').notNull(),
  content: text('content').notNull(),
  language: text('language').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI text-embedding-3-small
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── PR Reviews ───────────────────────────────────────────────────────────────

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  prUrl: text('pr_url').notNull(),
  prTitle: text('pr_title').notNull(),
  provider: text('provider').notNull(),
  reviewJson: text('review_json').notNull(), // PRReview JSON
  postedToGitHub: boolean('posted_to_github').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── PR Summaries ─────────────────────────────────────────────────────────────

export const summaries = pgTable('summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  prUrl: text('pr_url').notNull(),
  prTitle: text('pr_title').notNull(),
  provider: text('provider').notNull(),
  summaryJson: text('summary_json').notNull(), // PRSummary JSON
  postedToGitHub: boolean('posted_to_github').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Conversations (Codebase Q&A) ─────────────────────────────────────────────

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  repoId: uuid('repo_id')
    .notNull()
    .references(() => repositories.id, { onDelete: 'cascade' }),
  title: text('title'),
  messagesJson: text('messages_json').notNull().default('[]'), // QAMessage[] JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
