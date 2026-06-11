import type { Buffer } from 'node:buffer'
import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const bytea = customType<{ data: Buffer, driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

export const visibility = ['public', 'unlisted', 'private'] as const
export type Visibility = (typeof visibility)[number]

export const profileVisibility = ['public', 'private'] as const
export type ProfileVisibility = (typeof profileVisibility)[number]

export const discordJoinStatus = ['unset', 'joined', 'declined'] as const
export type DiscordJoinStatus = (typeof discordJoinStatus)[number]

export const userKind = ['real', 'person', 'community', 'anonymous'] as const
export type UserKind = (typeof userKind)[number]

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  discordId: text('discord_id').notNull(),
  username: text('username').notNull(),
  avatar: text('avatar'),
  displayName: text('display_name'),
  bio: text('bio'),
  kind: text('kind', { enum: userKind }).notNull().default('real'),
  profileUrl: text('profile_url'),
  profileVisibility: text('profile_visibility', { enum: profileVisibility }).notNull().default('public'),
  discordJoinStatus: text('discord_join_status', { enum: discordJoinStatus }).notNull().default('unset'),
  discordJoinedAt: timestamp('discord_joined_at', { withTimezone: true }),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('users_discord_id_idx').on(t.discordId),
  uniqueIndex('users_username_lower_idx').on(sql`lower(${t.username})`),
])

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const builds = pgTable('builds', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  buildString: text('build_string').notNull(),
  gameVersion: text('game_version').notNull(),
  visibility: text('visibility', { enum: visibility }).notNull().default('private'),
  viewCount: integer('view_count').notNull().default(0),
  playerClass: text('class'),
  itemIds: integer('item_ids').array(),
  source: text('source'),
  tags: text('tags').array(),
  tutorialUrl: text('tutorial_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index('builds_user_id_idx').on(t.userId),
  index('idx_builds_tags_gin').using('gin', t.tags),
])

export const craftedItems = pgTable('crafted_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  itemData: jsonb('item_data').notNull(),
  gameVersion: text('game_version').notNull(),
  visibility: text('visibility', { enum: visibility }).notNull().default('private'),
  tags: text('tags').array(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index('crafted_items_user_id_idx').on(t.userId),
  index('idx_crafted_items_tags_gin').using('gin', t.tags),
])

export const craftedItemCredits = pgTable('crafted_item_credits', {
  itemId: text('item_id').notNull().references(() => craftedItems.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
}, t => [
  primaryKey({ columns: [t.itemId, t.userId] }),
  index('crafted_item_credits_user_id_idx').on(t.userId),
])

export const buildCredits = pgTable('build_credits', {
  buildId: text('build_id').notNull().references(() => builds.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
}, t => [
  primaryKey({ columns: [t.buildId, t.userId] }),
  index('build_credits_user_id_idx').on(t.userId),
])

export const buildsRelations = relations(builds, ({ one, many }) => ({
  user: one(users, { fields: [builds.userId], references: [users.id] }),
  credits: many(buildCredits),
}))

export const buildCreditsRelations = relations(buildCredits, ({ one }) => ({
  build: one(builds, { fields: [buildCredits.buildId], references: [builds.id] }),
  user: one(users, { fields: [buildCredits.userId], references: [users.id] }),
}))

export const craftedItemsRelations = relations(craftedItems, ({ one, many }) => ({
  user: one(users, { fields: [craftedItems.userId], references: [users.id] }),
  credits: many(craftedItemCredits),
}))

export const craftedItemCreditsRelations = relations(craftedItemCredits, ({ one }) => ({
  item: one(craftedItems, { fields: [craftedItemCredits.itemId], references: [craftedItems.id] }),
  user: one(users, { fields: [craftedItemCredits.userId], references: [users.id] }),
}))

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  keyHash: text('key_hash').notNull(),
  prefix: text('prefix').notNull(),
  scopes: text('scopes').array().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, t => [
  uniqueIndex('api_keys_key_hash_idx').on(t.keyHash),
  index('api_keys_user_id_idx').on(t.userId),
])

export const marketPriceCache = pgTable('market_price_cache', {
  key: text('key').primaryKey(), // `${name}|${tier ?? ''}|${shiny ? 1 : 0}`
  payload: jsonb('payload'), // upstream /price JSON, or null = no listings
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
})

export const weightCache = pgTable('weight_cache', {
  itemName: text('item_name').primaryKey(),
  nori: jsonb('nori'),
  wynnpool: jsonb('wynnpool'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
})

export const ogImageCache = pgTable('og_image_cache', {
  key: text('key').primaryKey(),
  data: bytea('data').notNull(),
  contentType: text('content_type').notNull().default('image/png'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const wynndleMode = ['weapon', 'armor'] as const
export type WynndleMode = (typeof wynndleMode)[number]

export const wynndlePuzzles = pgTable('wynndle_puzzles', {
  id: text('id').primaryKey(),
  mode: text('mode', { enum: wynndleMode }).notNull(),
  date: text('date').notNull(),
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  // Denormalized rarity captured at puzzle-creation time. Matches the same
  // pattern used for itemName so the answer reveal can render in its proper
  // rarity color without re-fetching the items.json snapshot. Nullable for
  // pre-migration rows; materializeRound falls back to a pool lookup when
  // missing.
  itemRarity: text('item_rarity'),
  gameVersion: text('game_version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('wynndle_puzzles_mode_date_idx').on(t.mode, t.date),
])

export const wynndleRounds = pgTable('wynndle_rounds', {
  id: text('id').primaryKey(),
  puzzleId: text('puzzle_id').notNull().references(() => wynndlePuzzles.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  anonKey: text('anon_key'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  solvedAt: timestamp('solved_at', { withTimezone: true }),
  hintsRevealed: integer('hints_revealed').notNull().default(0),
  guessCount: integer('guess_count').notNull().default(0),
  won: integer('won').notNull().default(0),
  finished: integer('finished').notNull().default(0),
}, t => [
  uniqueIndex('wynndle_rounds_puzzle_user_idx')
    .on(t.puzzleId, t.userId)
    .where(sql`${t.userId} is not null`),
  uniqueIndex('wynndle_rounds_puzzle_anon_idx')
    .on(t.puzzleId, t.anonKey)
    .where(sql`${t.anonKey} is not null`),
  index('wynndle_rounds_user_idx').on(t.userId),
])

export const wynndleGuesses = pgTable('wynndle_guesses', {
  id: text('id').primaryKey(),
  roundId: text('round_id').notNull().references(() => wynndleRounds.id, { onDelete: 'cascade' }),
  ordinal: integer('ordinal').notNull(),
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  // Mirror of itemRarity on wynndle_puzzles: denormalized so historical guess
  // rows survive pool drift and the identity cell can render in the right
  // rarity hex even if the pool item is gone. Nullable for pre-migration rows.
  itemRarity: text('item_rarity'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('wynndle_guesses_round_ordinal_idx').on(t.roundId, t.ordinal),
])

export const wynndleStreaks = pgTable('wynndle_streaks', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mode: text('mode', { enum: wynndleMode }).notNull(),
  current: integer('current').notNull().default(0),
  longest: integer('longest').notNull().default(0),
  lastSolved: text('last_solved'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  primaryKey({ columns: [t.userId, t.mode] }),
])

// --- Stock (Wynntils Stock platform) ---

export const stockKind = ['infobox', 'custom-bar', 'bundle'] as const
export type StockKind = (typeof stockKind)[number]

export const stockCategory = [
  'combat',
  'party-ui',
  'raid',
  'lootrun',
  'dps-meter',
  'cooldown-tracker',
  'resource-tracker',
  'qol',
] as const
export type StockCategory = (typeof stockCategory)[number]

export const stockPartRole = ['function', 'infobox', 'resourcepack'] as const
export type StockPartRole = (typeof stockPartRole)[number]

export const stockClass = ['mage', 'archer', 'warrior', 'shaman', 'assassin'] as const
export type StockClass = (typeof stockClass)[number]

export const stockVersionStatus = ['draft', 'published'] as const
export type StockVersionStatus = (typeof stockVersionStatus)[number]

export const stockReactionEmoji = ['thumbs_up', 'fire', 'art', 'bug'] as const
export type StockReactionEmoji = (typeof stockReactionEmoji)[number]

export const stockBlob = pgTable('stock_blob', {
  sha256: text('sha256').primaryKey(),
  byteSize: integer('byte_size').notNull(),
  mimeType: text('mime_type').notNull(),
  originalFilename: text('original_filename').notNull(),
  refCount: integer('ref_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const stockCreation = pgTable('stock_creation', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  authorUserId: text('author_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  kind: text('kind', { enum: stockKind }).notNull(),
  classes: text('classes', { enum: stockClass }).array().notNull().default(sql`'{}'::text[]`),
  category: text('category', { enum: stockCategory }).notNull(),
  creditsNote: text('credits_note').notNull().default(''),
  installCount: integer('install_count').notNull().default(0),
  reactionCounts: jsonb('reaction_counts').notNull().default(sql`'{}'::jsonb`),
  discordThreadId: text('discord_thread_id'),
  searchTsv: text('search_tsv'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, t => [
  uniqueIndex('stock_creation_slug_idx').on(t.slug),
  index('stock_creation_author_idx').on(t.authorUserId),
  index('stock_creation_kind_idx').on(t.kind),
  index('stock_creation_category_idx').on(t.category),
  index('stock_creation_last_activity_idx').on(t.lastActivityAt),
])

export const stockVersion = pgTable('stock_version', {
  id: text('id').primaryKey(),
  creationId: text('creation_id').notNull().references(() => stockCreation.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  label: text('label').notNull(),
  changelog: text('changelog').notNull().default(''),
  status: text('status', { enum: stockVersionStatus }).notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('stock_version_creation_number_idx').on(t.creationId, t.number),
  uniqueIndex('stock_version_draft_idx').on(t.creationId).where(sql`status = 'draft'`),
])

export const stockPart = pgTable('stock_part', {
  id: text('id').primaryKey(),
  versionId: text('version_id').notNull().references(() => stockVersion.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  role: text('role', { enum: stockPartRole }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  group: text('group'),
  textContent: text('text_content'),
  blobSha256: text('blob_sha256').references(() => stockBlob.sha256, { onDelete: 'restrict' }),
  blobFilename: text('blob_filename'),
}, t => [
  index('stock_part_version_idx').on(t.versionId),
  index('stock_part_blob_idx').on(t.blobSha256),
])

export const stockMedia = pgTable('stock_media', {
  id: text('id').primaryKey(),
  creationId: text('creation_id').notNull().references(() => stockCreation.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  blobSha256: text('blob_sha256').notNull().references(() => stockBlob.sha256, { onDelete: 'restrict' }),
  caption: text('caption'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index('stock_media_creation_idx').on(t.creationId),
])

export const stockCredit = pgTable('stock_credit', {
  creationId: text('creation_id').notNull().references(() => stockCreation.id, { onDelete: 'cascade' }),
  creditedCreationId: text('credited_creation_id').notNull().references(() => stockCreation.id, { onDelete: 'cascade' }),
}, t => [
  primaryKey({ columns: [t.creationId, t.creditedCreationId] }),
  index('stock_credit_credited_idx').on(t.creditedCreationId),
])

export const stockReaction = pgTable('stock_reaction', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  creationId: text('creation_id').notNull().references(() => stockCreation.id, { onDelete: 'cascade' }),
  emoji: text('emoji', { enum: stockReactionEmoji }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  primaryKey({ columns: [t.userId, t.creationId, t.emoji] }),
  index('stock_reaction_creation_idx').on(t.creationId),
])

export const stockReport = pgTable('stock_report', {
  id: text('id').primaryKey(),
  creationId: text('creation_id').notNull().references(() => stockCreation.id, { onDelete: 'cascade' }),
  reporterUserId: text('reporter_user_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index('stock_report_creation_idx').on(t.creationId),
])

export const stockAdminAuditLog = pgTable('stock_admin_audit_log', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index('stock_admin_audit_actor_idx').on(t.actorUserId),
  index('stock_admin_audit_target_idx').on(t.targetType, t.targetId),
])

export const stockCreationRelations = relations(stockCreation, ({ one, many }) => ({
  author: one(users, { fields: [stockCreation.authorUserId], references: [users.id] }),
  versions: many(stockVersion),
  media: many(stockMedia),
  credits: many(stockCredit, { relationName: 'creationToCredits' }),
  creditedBy: many(stockCredit, { relationName: 'creditedToReverse' }),
  reactions: many(stockReaction),
}))

export const stockVersionRelations = relations(stockVersion, ({ one, many }) => ({
  creation: one(stockCreation, { fields: [stockVersion.creationId], references: [stockCreation.id] }),
  parts: many(stockPart),
}))

export const stockPartRelations = relations(stockPart, ({ one }) => ({
  version: one(stockVersion, { fields: [stockPart.versionId], references: [stockVersion.id] }),
  blob: one(stockBlob, { fields: [stockPart.blobSha256], references: [stockBlob.sha256] }),
}))

export const stockMediaRelations = relations(stockMedia, ({ one }) => ({
  creation: one(stockCreation, { fields: [stockMedia.creationId], references: [stockCreation.id] }),
  blob: one(stockBlob, { fields: [stockMedia.blobSha256], references: [stockBlob.sha256] }),
}))

export const stockCreditRelations = relations(stockCredit, ({ one }) => ({
  creation: one(stockCreation, { fields: [stockCredit.creationId], references: [stockCreation.id], relationName: 'creationToCredits' }),
  credited: one(stockCreation, { fields: [stockCredit.creditedCreationId], references: [stockCreation.id], relationName: 'creditedToReverse' }),
}))
