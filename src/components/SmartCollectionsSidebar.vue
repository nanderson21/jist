<template>
  <div class="smart-collections-sidebar h-full flex flex-col bg-background border-t">
    <!-- Header with Tabs -->
    <div class="p-3 border-b">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold text-foreground">Collections & Hierarchy</h3>
        <button
          @click="showTagManager = !showTagManager"
          class="p-1 hover:bg-accent rounded"
          title="Manage Tags"
        >
          <span class="text-xs">🏷️</span>
        </button>
      </div>
      
      <!-- Tab Navigation -->
      <div class="flex bg-muted rounded-md p-1">
        <button
          @click="activeTab = 'collections'"
          class="flex-1 px-2 py-1 text-xs rounded transition-colors"
          :class="activeTab === 'collections' ? 'bg-background shadow-sm' : 'hover:bg-background/50'"
        >
          Smart Collections
        </button>
        <button
          @click="activeTab = 'hierarchy'"
          class="flex-1 px-2 py-1 text-xs rounded transition-colors"
          :class="activeTab === 'hierarchy' ? 'bg-background shadow-sm' : 'hover:bg-background/50'"
        >
          Custom Hierarchy
        </button>
      </div>
      
      <!-- Tag Manager -->
      <div v-if="showTagManager" class="mt-3 p-2 bg-muted rounded text-xs">
        <div class="space-y-2">
          <div v-for="[category, values] in tagCategories" :key="category" class="space-y-1">
            <div class="font-medium text-muted-foreground">{{ category }}:</div>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="value in values.slice(0, 5)"
                :key="value"
                class="px-2 py-1 bg-primary/10 text-primary rounded text-xs cursor-pointer hover:bg-primary/20"
                @click="addFilterTag(`${category}:${value}`)"
              >
                {{ value }}
              </span>
              <span v-if="values.length > 5" class="text-muted-foreground">+{{ values.length - 5 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Active Filters -->
    <div v-if="activeFilters.length > 0" class="p-3 border-b bg-accent/30">
      <div class="text-xs font-medium text-muted-foreground mb-2">Active Filters:</div>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="filter in activeFilters"
          :key="filter"
          class="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-xs"
        >
          {{ filter }}
          <button @click="removeFilter(filter)" class="hover:bg-primary/80 rounded">
            ×
          </button>
        </span>
      </div>
      <button
        @click="clearAllFilters"
        class="mt-2 text-xs text-muted-foreground hover:text-foreground"
      >
        Clear All
      </button>
    </div>
    
    <!-- Tab Content -->
    <div class="flex-1 overflow-auto">
      <!-- Smart Collections Tab -->
      <div v-if="activeTab === 'collections'" class="p-2 space-y-1">
        <div
          v-for="collection in smartCollections"
          :key="collection.id"
          class="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer group"
          :class="{ 'bg-primary/10 text-primary': selectedCollection?.id === collection.id }"
          @click="selectCollection(collection)"
        >
          <span class="text-sm">{{ collection.icon }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ collection.name }}</div>
            <div class="text-xs text-muted-foreground">
              {{ collection.assets.length }} {{ collection.assets.length === 1 ? 'item' : 'items' }}
            </div>
          </div>
          <div
            class="w-2 h-2 rounded-full opacity-60"
            :style="{ backgroundColor: collection.color }"
          ></div>
        </div>
        
        <!-- Custom Queries -->
        <div v-if="customQueries.length > 0" class="border-t mt-2 pt-2">
          <div class="px-3 py-1 text-xs font-medium text-muted-foreground">Custom Queries</div>
          <div class="space-y-1">
            <div
              v-for="query in customQueries"
              :key="query.id"
              class="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer group"
              @click="selectCustomQuery(query)"
            >
              <span class="text-sm">📊</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{{ query.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ getQueryResultCount(query) }} items
                </div>
              </div>
              <button
                @click.stop="removeCustomQuery(query.id)"
                class="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded text-xs"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Custom Hierarchy Tab -->
      <div v-if="activeTab === 'hierarchy'" class="h-full">
        <CustomHierarchy
          ref="customHierarchyRef"
          :smart-collections="smartCollections"
          @hierarchy-selected="handleHierarchySelected"
          @filter-applied="handleFilterApplied"
          @segment-filter="handleSegmentFilter"
        />
      </div>
      
    </div>
    
    <!-- Quick Filters -->
    <div class="border-t p-3">
      <div class="text-xs font-medium text-muted-foreground mb-2">Quick Filters</div>
      <div class="grid grid-cols-2 gap-1 text-xs">
        <button
          @click="applyQuickFilter('type:online')"
          class="p-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/30"
        >
          Online Only
        </button>
        <button
          @click="applyQuickFilter('format:red')"
          class="p-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/30"
        >
          RED Clips
        </button>
        <button
          @click="applyQuickFilter('fps:highspeed')"
          class="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/30"
        >
          High Speed
        </button>
        <button
          @click="applyQuickFilter('size:large')"
          class="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/30"
        >
          Large Files
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SmartCollection, TagQuery, MediaGroup } from '@/composables/useMediaRepresentations'
import CustomHierarchy from './CustomHierarchy.vue'

interface Props {
  smartCollections: SmartCollection[]
  tagCategories: Map<string, string[]>
  mediaGroups: MediaGroup[]
  allFiles: any[]
  isScanning?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'collection-selected': [collection: SmartCollection]
  'query-applied': [query: TagQuery]
  'filters-changed': [filters: string[]]
  'hierarchy-selected': [hierarchy: any]
  'add-to-hierarchy': [segment: any, hierarchyData: any]
  'context-assigned': [segment: any, context: string, contextType: string]
  'pattern-applied': [pattern: any, segments: any[]]
}>()

const selectedCollection = ref<SmartCollection | null>(null)
const showTagManager = ref(false)
const activeFilters = ref<string[]>([])
const customQueries = ref<{ id: string; name: string; query: TagQuery }[]>([])
const activeTab = ref<'collections' | 'hierarchy'>('collections')
const customHierarchyRef = ref<InstanceType<typeof CustomHierarchy>>()

function selectCollection(collection: SmartCollection) {
  selectedCollection.value = collection
  emit('collection-selected', collection)
}

function selectCustomQuery(query: { id: string; name: string; query: TagQuery }) {
  emit('query-applied', query.query)
}

function addFilterTag(tag: string) {
  if (!activeFilters.value.includes(tag)) {
    activeFilters.value.push(tag)
    emitFiltersChanged()
  }
}

function removeFilter(filter: string) {
  const index = activeFilters.value.indexOf(filter)
  if (index > -1) {
    activeFilters.value.splice(index, 1)
    emitFiltersChanged()
  }
}

function clearAllFilters() {
  activeFilters.value = []
  emitFiltersChanged()
}

function applyQuickFilter(filter: string) {
  activeFilters.value = [filter] // Replace all filters with this one
  emitFiltersChanged()
}

function emitFiltersChanged() {
  // Convert active filters to a query
  const query: TagQuery = {
    include: activeFilters.value
  }
  emit('query-applied', query)
  emit('filters-changed', activeFilters.value)
}

function getQueryResultCount(query: { query: TagQuery }): number {
  // This would ideally use the filterGroupsByQuery function
  // For now, return a placeholder
  return 0
}

function removeCustomQuery(queryId: string) {
  const index = customQueries.value.findIndex(q => q.id === queryId)
  if (index > -1) {
    customQueries.value.splice(index, 1)
  }
}

function handleHierarchySelected(hierarchy: any) {
  emit('hierarchy-selected', hierarchy)
}

function handleFilterApplied(filter: any) {
  const query: TagQuery = {
    include: [filter.type]
  }
  emit('query-applied', query)
}

function handleSegmentFilter(segment: any) {
  const query: TagQuery = {
    include: [`segment:${segment.value}`]
  }
  emit('query-applied', query)
}

function handleAddToHierarchy(segment: any, hierarchyData: any) {
  // Switch to hierarchy tab and pass the data
  activeTab.value = 'hierarchy'
  emit('add-to-hierarchy', segment, hierarchyData)
  
  // If there's a custom hierarchy component, call its method
  if (customHierarchyRef.value?.addSegmentToHierarchy) {
    customHierarchyRef.value.addSegmentToHierarchy(segment, hierarchyData)
  }
}


// Expose methods for parent components
defineExpose({
  handleAddToHierarchy,
  switchToHierarchyTab: () => { activeTab.value = 'hierarchy' }
})

// Auto-select "All Clips" by default
if (props.smartCollections.length > 0 && !selectedCollection.value) {
  selectedCollection.value = props.smartCollections[0]
}
</script>

<style scoped>
.smart-collections-sidebar {
  min-height: 200px;
}
</style>