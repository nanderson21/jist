<template>
  <div class="smart-media-view h-full flex flex-col">
    <!-- Toolbar -->
    <div class="border-b bg-background/95 backdrop-blur-sm">
      <!-- Main Controls -->
      <div class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-semibold">
              {{ currentCollection?.name || 'All Media' }}
              <span v-if="currentCollection?.icon" class="ml-2">{{ currentCollection.icon }}</span>
            </h2>
            <div class="text-sm text-muted-foreground">
              {{ filteredGroups.length }} groups • {{ totalAssets }} assets
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- View Type Toggle -->
            <div class="flex border rounded-lg overflow-hidden">
              <button
                @click="viewType = 'cards'"
                :class="viewType === 'cards' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'"
                class="px-3 py-2 text-sm transition-colors"
              >
                🔲 Cards
              </button>
              <button
                @click="viewType = 'table'"
                :class="viewType === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'"
                class="px-3 py-2 text-sm transition-colors"
              >
                📋 Table
              </button>
              <button
                @click="viewType = 'timeline'"
                :class="viewType === 'timeline' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'"
                class="px-3 py-2 text-sm transition-colors"
              >
                📅 Timeline
              </button>
            </div>
            
            <!-- Group/Ungroup Toggle -->
            <button
              @click="showRepresentations = !showRepresentations"
              :class="showRepresentations ? 'bg-accent' : ''"
              class="px-3 py-2 text-sm border rounded hover:bg-accent transition-colors"
            >
              {{ showRepresentations ? '📁 Group' : '📄 Expand' }}
            </button>
          </div>
        </div>
        
        <!-- Filter Controls -->
        <div class="flex items-center gap-3 flex-wrap">
          <!-- Search -->
          <div class="relative">
            <input
              v-model="searchQuery"
              placeholder="Search assets..."
              class="pl-8 pr-3 py-2 text-sm border rounded-md bg-background"
            />
            <span class="absolute left-2.5 top-2.5 text-muted-foreground text-sm">🔍</span>
          </div>
          
          <!-- Sort -->
          <select v-model="sortBy" class="px-3 py-2 text-sm border rounded-md bg-background">
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Date</option>
            <option value="size">Sort by Size</option>
            <option value="format">Sort by Format</option>
            <option value="resolution">Sort by Resolution</option>
          </select>
          
          <button
            @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
            class="px-3 py-2 text-sm border rounded-md hover:bg-accent"
          >
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </button>
          
          <!-- Filter Dropdowns -->
          <div class="flex gap-2">
            <FilterDropdown
              label="Format"
              :options="formatOptions"
              v-model="activeFormatFilters"
              @change="updateFilters"
            />
            <FilterDropdown
              label="Resolution"
              :options="resolutionOptions"
              v-model="activeResolutionFilters"
              @change="updateFilters"
            />
            <FilterDropdown
              label="Type"
              :options="typeOptions"
              v-model="activeTypeFilters"
              @change="updateFilters"
            />
          </div>
          
          <!-- Clear Filters -->
          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="px-3 py-2 text-sm text-muted-foreground hover:text-destructive"
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      <!-- Tag Bar -->
      <div v-if="activeTags.length > 0" class="px-4 pb-3">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-muted-foreground">Active tags:</span>
          <span
            v-for="tag in activeTags"
            :key="tag"
            class="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs"
          >
            {{ tag }}
            <button @click="removeTag(tag)" class="hover:bg-primary/20 rounded">×</button>
          </span>
        </div>
      </div>
    </div>
    
    <!-- Content Area -->
    <div class="flex-1 overflow-auto">
      <!-- Cards View -->
      <div v-if="viewType === 'cards'" class="p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <MediaGroupCard
            v-for="group in paginatedGroups"
            :key="group.id"
            :group="group"
            :show-representations="showRepresentations"
            @select="handleGroupSelect"
            @tag-click="addTag"
          />
        </div>
      </div>
      
      <!-- Table View -->
      <div v-else-if="viewType === 'table'" class="p-4">
        <MediaGroupTable
          :groups="paginatedGroups"
          :show-representations="showRepresentations"
          @select="handleGroupSelect"
          @tag-click="addTag"
          @sort="handleSort"
        />
      </div>
      
      <!-- Timeline View -->
      <div v-else-if="viewType === 'timeline'" class="p-4">
        <MediaTimeline
          :groups="paginatedGroups"
          @select="handleGroupSelect"
          @tag-click="addTag"
        />
      </div>
      
      <!-- Empty State -->
      <div v-if="filteredGroups.length === 0" class="flex items-center justify-center h-full text-muted-foreground">
        <div class="text-center">
          <div class="text-lg mb-2">No media found</div>
          <div class="text-sm">Try adjusting your filters or search query</div>
        </div>
      </div>
    </div>
    
    <!-- Pagination -->
    <div v-if="totalPages > 1" class="border-t p-4">
      <div class="flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredGroups.length) }} 
          of {{ filteredGroups.length }} groups
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-3 py-2 text-sm border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span class="px-3 py-2 text-sm">{{ currentPage }} / {{ totalPages }}</span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="px-3 py-2 text-sm border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MediaGroup, SmartCollection, TagQuery } from '@/composables/useMediaRepresentations'
import FilterDropdown from './FilterDropdown.vue'
import MediaGroupCard from './MediaGroupCard.vue'
import MediaGroupTable from './MediaGroupTable.vue'
import MediaTimeline from './MediaTimeline.vue'

interface Props {
  mediaGroups: MediaGroup[]
  currentCollection?: SmartCollection | null
  appliedQuery?: TagQuery | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'group-selected': [group: MediaGroup]
  'query-changed': [query: TagQuery]
}>()

const viewType = ref<'cards' | 'table' | 'timeline'>('cards')
const showRepresentations = ref(false)
const searchQuery = ref('')
const sortBy = ref('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const itemsPerPage = ref(50)

// Filter states
const activeFormatFilters = ref<string[]>([])
const activeResolutionFilters = ref<string[]>([])
const activeTypeFilters = ref<string[]>([])
const activeTags = ref<string[]>([])

// Filter options computed from available media
const formatOptions = computed(() => {
  const formats = new Set<string>()
  props.mediaGroups.forEach(group => {
    group.tags.forEach(tag => {
      if (tag.startsWith('format:')) {
        formats.add(tag.replace('format:', ''))
      }
    })
  })
  return Array.from(formats).map(format => ({ value: format, label: format.toUpperCase() }))
})

const resolutionOptions = computed(() => {
  const resolutions = new Set<string>()
  props.mediaGroups.forEach(group => {
    group.tags.forEach(tag => {
      if (tag.startsWith('resolution:')) {
        resolutions.add(tag.replace('resolution:', ''))
      }
    })
  })
  return Array.from(resolutions).map(res => ({ value: res, label: res }))
})

const typeOptions = computed(() => [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'proxy', label: 'Proxy' },
  { value: 'preview', label: 'Preview' }
])

const hasActiveFilters = computed(() => 
  activeFormatFilters.value.length > 0 || 
  activeResolutionFilters.value.length > 0 || 
  activeTypeFilters.value.length > 0 ||
  activeTags.value.length > 0 ||
  searchQuery.value.length > 0
)

// Apply filtering and sorting
const filteredGroups = computed(() => {
  let groups = [...props.mediaGroups]
  
  // Apply collection query first
  if (props.appliedQuery) {
    groups = applyQuery(groups, props.appliedQuery)
  }
  
  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    groups = groups.filter(group => 
      group.baseName.toLowerCase().includes(query) ||
      group.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }
  
  // Apply format filters
  if (activeFormatFilters.value.length > 0) {
    groups = groups.filter(group =>
      activeFormatFilters.value.some(format =>
        group.tags.includes(`format:${format}`)
      )
    )
  }
  
  // Apply resolution filters
  if (activeResolutionFilters.value.length > 0) {
    groups = groups.filter(group =>
      activeResolutionFilters.value.some(res =>
        group.tags.includes(`resolution:${res}`)
      )
    )
  }
  
  // Apply type filters
  if (activeTypeFilters.value.length > 0) {
    groups = groups.filter(group =>
      activeTypeFilters.value.some(type =>
        group.tags.includes(`type:${type}`)
      )
    )
  }
  
  // Apply additional tags
  if (activeTags.value.length > 0) {
    groups = groups.filter(group =>
      activeTags.value.every(tag => group.tags.includes(tag))
    )
  }
  
  // Apply sorting
  groups.sort((a, b) => {
    let aValue: any, bValue: any
    
    switch (sortBy.value) {
      case 'name':
        aValue = a.baseName.toLowerCase()
        bValue = b.baseName.toLowerCase()
        break
      case 'date':
        aValue = Math.max(...a.representations.map(r => r.asset.primaryFile.lastModified?.getTime() || 0))
        bValue = Math.max(...b.representations.map(r => r.asset.primaryFile.lastModified?.getTime() || 0))
        break
      case 'size':
        aValue = a.representations.reduce((sum, r) => sum + (r.asset.primaryFile.size || 0), 0)
        bValue = b.representations.reduce((sum, r) => sum + (r.asset.primaryFile.size || 0), 0)
        break
      case 'format':
        aValue = a.primaryRepresentation.asset.format
        bValue = b.primaryRepresentation.asset.format
        break
      case 'resolution':
        aValue = a.primaryRepresentation.asset.metadata.resolution || ''
        bValue = b.primaryRepresentation.asset.metadata.resolution || ''
        break
      default:
        return 0
    }
    
    if (sortOrder.value === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })
  
  return groups
})

const totalAssets = computed(() => 
  filteredGroups.value.reduce((sum, group) => sum + group.representations.length, 0)
)

const totalPages = computed(() => Math.ceil(filteredGroups.value.length / itemsPerPage.value))

const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredGroups.value.slice(start, end)
})

function applyQuery(groups: MediaGroup[], query: TagQuery): MediaGroup[] {
  return groups.filter(group => {
    // Include filters
    if (query.include && query.include.length > 0) {
      const hasRequiredTag = query.include.some(tag => group.tags.includes(tag))
      if (!hasRequiredTag) return false
    }
    
    // Exclude filters
    if (query.exclude && query.exclude.length > 0) {
      const hasExcludedTag = query.exclude.some(tag => group.tags.includes(tag))
      if (hasExcludedTag) return false
    }
    
    // Format filters
    if (query.format && query.format.length > 0) {
      const hasFormat = query.format.some(format => 
        group.tags.includes(`format:${format}`)
      )
      if (!hasFormat) return false
    }
    
    return true
  })
}

function handleGroupSelect(group: MediaGroup) {
  emit('group-selected', group)
}

function handleSort(field: string) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
}

function addTag(tag: string) {
  if (!activeTags.value.includes(tag)) {
    activeTags.value.push(tag)
    updateFilters()
  }
}

function removeTag(tag: string) {
  const index = activeTags.value.indexOf(tag)
  if (index > -1) {
    activeTags.value.splice(index, 1)
    updateFilters()
  }
}

function updateFilters() {
  const query: TagQuery = {
    include: [
      ...activeFormatFilters.value.map(f => `format:${f}`),
      ...activeResolutionFilters.value.map(r => `resolution:${r}`),
      ...activeTypeFilters.value.map(t => `type:${t}`),
      ...activeTags.value
    ]
  }
  emit('query-changed', query)
}

function clearFilters() {
  activeFormatFilters.value = []
  activeResolutionFilters.value = []
  activeTypeFilters.value = []
  activeTags.value = []
  searchQuery.value = ''
  updateFilters()
}

// Reset pagination when filters change
watch([filteredGroups], () => {
  currentPage.value = 1
})
</script>