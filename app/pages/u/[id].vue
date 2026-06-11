<script setup lang="ts">
import type { ApiBuildSummary, ApiItemSummary, ApiProfile, ApiProfilePrivate } from '~/composables/useApi'
import NotesView from '~/components/BuildDetails/NotesView.vue'
import { useApi } from '~/composables/useApi'
import { stripMarkdown } from '~/lib/build/markdown'
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const api = useApi()
const auth = useAuthStore()
const slug = computed(() => String(route.params.id))

// Profile
const { data: profileData, error: profileError } = await useAsyncData<ApiProfile | ApiProfilePrivate>(
  () => `profile-${slug.value}`,
  () => api.getProfile(slug.value),
  { watch: [slug] },
)

if (profileError.value) {
  await navigateTo('/')
  throw createError({ statusCode: 404 })
}

const isPrivate = computed(() => !!profileData.value && 'private' in profileData.value)
const fullProfile = computed(() =>
  !isPrivate.value && profileData.value ? (profileData.value as ApiProfile) : null,
)
const profile = fullProfile

// Redirect legacy nanoid URLs to canonical slug
if (fullProfile.value && fullProfile.value.resolvedVia === 'id' && fullProfile.value.canonicalSlug !== slug.value) {
  await navigateTo(`/u/${fullProfile.value.canonicalSlug}`, { redirectCode: 301, replace: true })
}

// userId for API calls — use the resolved profile id when available
const userId = computed(() => fullProfile.value?.id ?? slug.value)

function avatarUrl(discordId: string, avatar: string) {
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=80`
}

const seoTitle = computed(() =>
  profile.value ? `${profile.value.name} — wynn.tools` : 'User Profile — wynn.tools',
)
const seoDesc = computed(() =>
  profile.value
    ? (profile.value.bio && stripMarkdown(profile.value.bio, 200)) || `View ${profile.value.name}'s builds and items on wynn.tools.`
    : 'View this user\'s builds and items on wynn.tools.',
)

useSeoMeta({
  title: seoTitle,
  ogTitle: seoTitle,
  description: seoDesc,
  ogDescription: seoDesc,
  twitterCard: 'summary_large_image',
})

type Tab = 'builds' | 'items'
const activeTab = ref<Tab>('builds')

// Builds
const builds = ref<ApiBuildSummary[]>([])
const buildsNextCursor = ref<string | null>(null)
const buildsLoading = ref(false)

async function loadBuilds(cursor?: string) {
  buildsLoading.value = true
  try {
    const res = await api.getUserBuilds(userId.value, undefined, cursor, 20)
    builds.value = cursor ? [...builds.value, ...res.data] : res.data
    buildsNextCursor.value = res.nextCursor
  }
  finally {
    buildsLoading.value = false
  }
}

const isViewingOwnProfile = computed(() => !!auth.user && !!fullProfile.value && auth.user.id === fullProfile.value.id)
const openKebab = ref<string | null>(null)

async function removeMyCredit(buildId: string) {
  // eslint-disable-next-line no-alert
  if (typeof window !== 'undefined' && !window.confirm('Remove yourself from this build\'s credits?'))
    return
  try {
    await api.removeMyCreditFromBuild(buildId)
    builds.value = builds.value.filter(b => !(b.id === buildId && b.isCredit))
  }
  catch (err) {
    console.error('Failed to remove credit', err)
  }
  finally {
    openKebab.value = null
  }
}

// Items
const items = ref<ApiItemSummary[]>([])
const itemsNextCursor = ref<string | null>(null)
const itemsLoading = ref(false)

async function loadItems(cursor?: string) {
  itemsLoading.value = true
  try {
    const res = await api.getUserItems(userId.value, undefined, cursor, 20)
    items.value = cursor ? [...items.value, ...res.data] : res.data
    itemsNextCursor.value = res.nextCursor
  }
  finally {
    itemsLoading.value = false
  }
}

if (!isPrivate.value) {
  const { data: initial } = await useAsyncData(
    () => `user-content-${userId.value}`,
    async () => {
      const [b, i] = await Promise.all([
        api.getUserBuilds(userId.value, undefined, undefined, 20),
        api.getUserItems(userId.value, undefined, undefined, 20),
      ])
      return { builds: b.data, buildsCursor: b.nextCursor, items: i.data, itemsCursor: i.nextCursor }
    },
    { watch: [userId] },
  )
  if (initial.value) {
    builds.value = initial.value.builds
    buildsNextCursor.value = initial.value.buildsCursor
    items.value = initial.value.items
    itemsNextCursor.value = initial.value.itemsCursor
  }
  watch(initial, (v) => {
    if (!v)
      return
    builds.value = v.builds
    buildsNextCursor.value = v.buildsCursor
    items.value = v.items
    itemsNextCursor.value = v.itemsCursor
  })
}
</script>

<template>
  <div class="profile-page">
    <!-- Private profile -->
    <div v-if="isPrivate" class="private-state">
      <p class="private-message">
        This profile is private.
      </p>
    </div>

    <!-- Public profile -->
    <template v-else-if="profile">
      <header class="profile-header">
        <img
          v-if="profile.avatar"
          :src="avatarUrl(profile.discordId, profile.avatar)"
          :alt="profile.name"
          class="profile-avatar"
          width="56"
          height="56"
        >
        <div class="profile-info">
          <h1 class="profile-name">
            {{ profile.name }}
          </h1>
          <NotesView v-if="profile.bio" :markdown="profile.bio" class="profile-bio" />
          <a
            v-if="profile.profileUrl"
            :href="profile.profileUrl"
            class="profile-url"
            target="_blank"
            rel="noopener noreferrer"
          >{{ profile.profileUrl }}</a>
        </div>
      </header>

      <UiSegmented
        v-model="activeTab"
        :options="[
          { value: 'builds', label: 'Builds' },
          { value: 'items', label: 'Items' },
        ]"
        role="tab"
        aria-label="Profile library"
      />

      <div v-if="activeTab === 'builds'" role="tabpanel">
        <div v-if="builds.length === 0 && !buildsLoading" class="empty-state">
          No public builds.
        </div>
        <div v-else class="card-grid">
          <div v-for="b in builds" :key="b.id" class="card-wrap">
            <BuildCard
              :id="b.id"
              :name="b.name"
              :game-version="b.gameVersion"
              :owner-id="b.owner?.id"
              :owner-name="b.owner?.name"
              :owner-username="b.owner?.username"
              :tags="b.tags"
              :has-tutorial="b.hasTutorial"
            />
            <span v-if="b.isCredit" class="credited-badge">Credited</span>
            <div v-if="b.isCredit && isViewingOwnProfile" class="kebab-wrap">
              <button type="button" class="kebab-btn" aria-label="Build options" @click="openKebab = openKebab === b.id ? null : b.id">
                ⋯
              </button>
              <div v-if="openKebab === b.id" class="kebab-menu">
                <button type="button" class="kebab-item" @click="removeMyCredit(b.id)">
                  Remove me from this credit
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="buildsNextCursor" class="load-more">
          <button
            class="load-more-btn"
            type="button"
            :disabled="buildsLoading"
            @click="loadBuilds(buildsNextCursor ?? undefined)"
          >
            {{ buildsLoading ? 'Loading…' : 'Load more' }}
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'items'" role="tabpanel">
        <div v-if="items.length === 0 && !itemsLoading" class="empty-state">
          No public items.
        </div>
        <div v-else class="card-grid">
          <ItemCard
            v-for="i in items"
            :id="i.id"
            :key="i.id"
            :name="i.name"
            :game-version="i.gameVersion"
            :owner-id="i.owner?.id"
            :owner-username="i.owner?.username"
            :owner-name="i.owner?.name"
            :craft-hash="i.craftHash"
            :tags="i.tags"
          />
        </div>
        <div v-if="itemsNextCursor" class="load-more">
          <button
            class="load-more-btn"
            type="button"
            :disabled="itemsLoading"
            @click="loadItems(itemsNextCursor ?? undefined)"
          >
            {{ itemsLoading ? 'Loading…' : 'Load more' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.card-wrap {
  position: relative;
}
.credited-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--color-surface-hi);
  color: var(--color-accent);
  border: 1px solid color-mix(in oklch, var(--color-accent) 30%, var(--color-border));
  pointer-events: none;
}
.kebab-wrap {
  position: absolute;
  bottom: 8px;
  right: 8px;
}
.kebab-btn {
  background: var(--color-surface-hi);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-muted);
  cursor: pointer;
  padding: 2px 8px;
  font-size: 14px;
  line-height: 1;
}
.kebab-btn:hover {
  color: var(--color-text);
}
.kebab-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 4px);
  background: var(--color-surface-hi);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 4px;
  z-index: 10;
  white-space: nowrap;
}
.kebab-item {
  display: block;
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 12px;
  padding: 6px 10px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  border-radius: 4px;
}
.kebab-item:hover {
  background: var(--color-surface);
}
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px 0;
}

.private-state {
  padding: 48px 0;
}
.private-message {
  font-size: 14px;
  color: var(--color-muted);
  margin: 0;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--color-border);
  flex-shrink: 0;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.profile-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}
.profile-bio {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}
.profile-url {
  font-size: 12px;
  color: var(--color-muted);
  text-decoration: none;
}
.profile-url:hover {
  color: var(--color-accent);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.empty-state {
  font-size: 14px;
  color: var(--color-muted);
  padding: 24px 0;
}

.load-more {
  margin-top: 12px;
}
</style>
