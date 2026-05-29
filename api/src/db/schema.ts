import { relations } from 'drizzle-orm'
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const visibility = ['public', 'unlisted', 'private'] as const
export type Visibility = (typeof visibility)[number]

export const profileVisibility = ['public', 'private'] as const
export type ProfileVisibility = (typeof profileVisibility)[number]

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  discordId: text('discord_id').notNull(),
  username: text('username').notNull(),
  avatar: text('avatar'),
  displayName: text('display_name'),
  bio: text('bio'),
  profileVisibility: text('profile_visibility', { enum: profileVisibility }).notNull().default('public'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex('users_discord_id_idx').on(t.discordId)])

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [index('builds_user_id_idx').on(t.userId)])

export const craftedItems = pgTable('crafted_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  itemData: jsonb('item_data').notNull(),
  gameVersion: text('game_version').notNull(),
  visibility: text('visibility', { enum: visibility }).notNull().default('private'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [index('crafted_items_user_id_idx').on(t.userId)])

export const buildsRelations = relations(builds, ({ one }) => ({
  user: one(users, { fields: [builds.userId], references: [users.id] }),
}))

export const craftedItemsRelations = relations(craftedItems, ({ one }) => ({
  user: one(users, { fields: [craftedItems.userId], references: [users.id] }),
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
