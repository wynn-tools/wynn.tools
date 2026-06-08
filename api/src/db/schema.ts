import type { Buffer } from 'node:buffer'
import { relations, sql } from 'drizzle-orm'
import {
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
