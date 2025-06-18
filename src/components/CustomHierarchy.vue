<template>
  <div class="custom-hierarchy h-full flex flex-col bg-background border-t">
    <!-- Header -->
    <div class="p-3 border-b">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-foreground">Custom Hierarchy</h3>
        <div class="flex items-center gap-1">
          <button
            @click="createNewHierarchy"
            class="p-1 hover:bg-accent rounded text-xs"
            title="Create New Hierarchy"
          >
            ➕
          </button>
          <button
            @click="showSettings = !showSettings"
            class="p-1 hover:bg-accent rounded text-xs"
            title="Hierarchy Settings"
          >
            ⚙️
          </button>
        </div>
      </div>
      
      <!-- Hierarchy Builder Mode -->
      <div v-if="builderMode" class="mt-3 p-2 bg-primary/10 rounded text-xs">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-primary">Building: {{ currentHierarchy?.name }}</span>
          <button @click="exitBuilderMode" class="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div class="text-muted-foreground">
          Click segments in the file details panel to add them to this hierarchy.
        </div>
      </div>
    </div>
    
    <!-- Hierarchy List -->
    <div class="flex-1 overflow-auto">
      <div class="p-2 space-y-2">
        <!-- Pre-canned Smart Collections -->
        <div class="space-y-1">
          <div class="text-xs font-medium text-muted-foreground px-2">Smart Collections</div>
          <div
            v-for="collection in smartCollections"
            :key="collection.id"
            class="hierarchy-item"
            :class="{ active: selectedItem?.id === collection.id }"
            @click="selectItem(collection)"
          >
            <div class="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer">
              <span class="text-sm">{{ collection.icon }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{{ collection.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ collection.assets?.length || 0 }} items
                </div>
              </div>
              <div
                class="w-2 h-2 rounded-full"
                :style="{ backgroundColor: collection.color }"
              ></div>
            </div>
          </div>
        </div>
        
        <!-- Custom Hierarchies -->
        <div v-if="customHierarchies.length > 0" class="space-y-1">
          <div class="text-xs font-medium text-muted-foreground px-2">Custom Hierarchies</div>
          <div
            v-for="hierarchy in customHierarchies"
            :key="hierarchy.id"
            class="hierarchy-item"
          >
            <!-- Hierarchy Header -->
            <div 
              class="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
              :class="{ 'bg-primary/10': selectedItem?.id === hierarchy.id }"
              @click="toggleHierarchy(hierarchy.id)"
            >
              <span class="text-xs transition-transform" :class="{ 'rotate-90': hierarchy.expanded }">▶</span>
              <span class="text-sm">📁</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{{ hierarchy.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ hierarchy.segments.length }} segments, {{ hierarchy.matchCount || 0 }} matches
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button
                  @click.stop="editHierarchy(hierarchy)"
                  class="p-1 opacity-60 hover:opacity-100 hover:bg-accent rounded"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  @click.stop="deleteHierarchy(hierarchy.id)"
                  class="p-1 opacity-60 hover:opacity-100 hover:bg-destructive/20 rounded"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <!-- Hierarchy Children -->
            <div v-if="hierarchy.expanded" class="ml-6 space-y-1">
              <div
                v-for="segment in hierarchy.segments"
                :key="segment.id"
                class="flex items-center gap-2 p-1 rounded hover:bg-accent/50 cursor-pointer text-xs"
                @click="selectSegment(segment)"
              >
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getSegmentColor(segment.type) }"></span>
                <span class="font-medium">{{ segment.name }}</span>
                <span class="text-muted-foreground">{{ segment.value }}</span>
                <div class="flex-1"></div>
                <span class="text-muted-foreground">{{ segment.matches || 0 }}</span>
                <button
                  @click.stop="removeSegment(hierarchy.id, segment.id)"
                  class="opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
              
              <!-- Add Segment Button -->
              <button
                @click="startBuilding(hierarchy)"
                class="w-full p-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded border-2 border-dashed border-border"
              >
                + Add segments from file details
              </button>
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-if="customHierarchies.length === 0" class="text-center py-8 text-muted-foreground">
          <div class="text-2xl mb-2">📁</div>
          <div class="text-sm mb-2">No custom hierarchies yet</div>
          <button
            @click="createNewHierarchy"
            class="text-xs text-primary hover:underline"
          >
            Create your first hierarchy
          </button>
        </div>
      </div>
    </div>
    
    <!-- Actions Panel -->
    <div v-if="selectedItem" class="border-t p-3">
      <div class="text-xs font-medium mb-2">{{ selectedItem.name }}</div>
      <div class="grid grid-cols-2 gap-1">
        <button
          @click="applyFilter"
          class="p-2 bg-primary/10 text-primary rounded text-xs hover:bg-primary/20"
        >
          Apply Filter
        </button>
        <button
          @click="exportHierarchy"
          class="p-2 bg-muted hover:bg-muted/80 rounded text-xs"
        >
          Export
        </button>
      </div>
    </div>
  </div>
  
  <!-- Create Hierarchy Modal -->
  <Teleport to="body">
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="showCreateModal = false"
    >
      <div
        class="bg-popover border border-border rounded-lg p-4 w-96 max-w-[90vw]"
        @click.stop
      >
        <div class="text-lg font-semibold mb-4">Create New Hierarchy</div>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium">Name</label>
            <input
              v-model="newHierarchyName"
              class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
              placeholder="e.g., Project Shots, Client Work"
            />
          </div>
          <div>
            <label class="text-sm font-medium">Description</label>
            <textarea
              v-model="newHierarchyDescription"
              class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm resize-none"
              rows="2"
              placeholder="Optional description"
            ></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="showCreateModal = false"
            class="px-3 py-2 text-sm border border-input rounded-md hover:bg-accent"
          >
            Cancel
          </button>
          <button
            @click="confirmCreateHierarchy"
            :disabled="!newHierarchyName.trim()"
            class="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface SmartCollection {
  id: string
  name: string
  icon: string
  color: string
  assets?: any[]
}

interface HierarchySegment {
  id: string
  name: string
  value: string
  type: string
  levelIndex: number
  segmentType: string
  partIndex?: number
  matches?: number
  pattern?: string
}

interface CustomHierarchy {
  id: string
  name: string
  description?: string
  segments: HierarchySegment[]
  expanded: boolean
  matchCount?: number
  createdAt: Date
}

interface Props {
  smartCollections: SmartCollection[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'hierarchy-selected': [hierarchy: CustomHierarchy | SmartCollection]
  'filter-applied': [filter: any]
  'segment-filter': [segment: HierarchySegment]
}>()

// State
const customHierarchies = ref<CustomHierarchy[]>([])
const selectedItem = ref<CustomHierarchy | SmartCollection | null>(null)
const builderMode = ref(false)
const currentHierarchy = ref<CustomHierarchy | null>(null)
const showSettings = ref(false)
const showCreateModal = ref(false)
const newHierarchyName = ref('')
const newHierarchyDescription = ref('')

// Load saved hierarchies
onMounted(() => {
  const saved = localStorage.getItem('customHierarchies')
  if (saved) {
    try {
      customHierarchies.value = JSON.parse(saved).map((h: any) => ({
        ...h,
        createdAt: new Date(h.createdAt),
        expanded: false
      }))
    } catch (e) {
      console.warn('Failed to load custom hierarchies:', e)
    }
  }
})

// Methods
function saveHierarchies() {
  localStorage.setItem('customHierarchies', JSON.stringify(customHierarchies.value))
}

function createNewHierarchy() {
  newHierarchyName.value = ''
  newHierarchyDescription.value = ''
  showCreateModal.value = true
}

function confirmCreateHierarchy() {
  if (!newHierarchyName.value.trim()) return
  
  const hierarchy: CustomHierarchy = {
    id: `hierarchy-${Date.now()}`,
    name: newHierarchyName.value.trim(),
    description: newHierarchyDescription.value.trim() || undefined,
    segments: [],
    expanded: false,
    createdAt: new Date()
  }
  
  customHierarchies.value.push(hierarchy)
  saveHierarchies()
  showCreateModal.value = false
  
  // Start building mode
  startBuilding(hierarchy)
}

function startBuilding(hierarchy: CustomHierarchy) {
  builderMode.value = true
  currentHierarchy.value = hierarchy
}

function exitBuilderMode() {
  builderMode.value = false
  currentHierarchy.value = null
}

function addSegmentToHierarchy(segment: any, hierarchyData: any) {
  if (!currentHierarchy.value) return
  
  const hierarchySegment: HierarchySegment = {
    id: `segment-${Date.now()}-${Math.random()}`,
    name: segment.value || segment.name || segment,
    value: segment.value || segment,
    type: hierarchyData.segmentType || 'unknown',
    levelIndex: hierarchyData.levelIndex || -1,
    segmentType: hierarchyData.segmentType || 'path',
    partIndex: hierarchyData.partIndex
  }
  
  // Avoid duplicates
  const exists = currentHierarchy.value.segments.some(s => 
    s.value === hierarchySegment.value && s.type === hierarchySegment.type
  )
  
  if (!exists) {
    currentHierarchy.value.segments.push(hierarchySegment)
    saveHierarchies()
    updateMatchCounts()
  }
}

function removeSegment(hierarchyId: string, segmentId: string) {
  const hierarchy = customHierarchies.value.find(h => h.id === hierarchyId)
  if (hierarchy) {
    hierarchy.segments = hierarchy.segments.filter(s => s.id !== segmentId)
    saveHierarchies()
    updateMatchCounts()
  }
}

function toggleHierarchy(hierarchyId: string) {
  const hierarchy = customHierarchies.value.find(h => h.id === hierarchyId)
  if (hierarchy) {
    hierarchy.expanded = !hierarchy.expanded
    if (hierarchy.expanded) {
      selectedItem.value = hierarchy
      emit('hierarchy-selected', hierarchy)
    }
  }
}

function selectItem(item: CustomHierarchy | SmartCollection) {
  selectedItem.value = item
  emit('hierarchy-selected', item)
}

function selectSegment(segment: HierarchySegment) {
  emit('segment-filter', segment)
}

function editHierarchy(hierarchy: CustomHierarchy) {
  newHierarchyName.value = hierarchy.name
  newHierarchyDescription.value = hierarchy.description || ''
  showCreateModal.value = true
  
  // Update instead of create
  const updateHierarchy = () => {
    hierarchy.name = newHierarchyName.value.trim()
    hierarchy.description = newHierarchyDescription.value.trim() || undefined
    saveHierarchies()
    showCreateModal.value = false
  }
  
  // Replace confirm function temporarily
  const originalConfirm = confirmCreateHierarchy
  confirmCreateHierarchy = updateHierarchy
  
  // Restore after modal closes
  setTimeout(() => {
    confirmCreateHierarchy = originalConfirm
  }, 100)
}

function deleteHierarchy(hierarchyId: string) {
  if (confirm('Are you sure you want to delete this hierarchy?')) {
    customHierarchies.value = customHierarchies.value.filter(h => h.id !== hierarchyId)
    saveHierarchies()
    
    if (selectedItem.value?.id === hierarchyId) {
      selectedItem.value = null
    }
    
    if (currentHierarchy.value?.id === hierarchyId) {
      exitBuilderMode()
    }
  }
}

function getSegmentColor(type: string): string {
  switch (type) {
    case 'path-level': return '#3b82f6' // blue
    case 'separator-split':
    case 'filename-split': return '#10b981' // green
    case 'filename': return '#f59e0b' // orange
    case 'date-pattern':
    case 'time-pattern':
    case 'sequence-pattern': return '#8b5cf6' // purple
    default: return '#6b7280' // gray
  }
}

function updateMatchCounts() {
  // This would ideally connect to the actual file filtering system
  // For now, just simulate some match counts
  customHierarchies.value.forEach(hierarchy => {
    hierarchy.matchCount = hierarchy.segments.length * Math.floor(Math.random() * 50)
    hierarchy.segments.forEach(segment => {
      segment.matches = Math.floor(Math.random() * 20)
    })
  })
}

function applyFilter() {
  if (!selectedItem.value) return
  
  if ('segments' in selectedItem.value) {
    // Custom hierarchy
    const filter = {
      type: 'custom-hierarchy',
      hierarchy: selectedItem.value,
      segments: selectedItem.value.segments
    }
    emit('filter-applied', filter)
  } else {
    // Smart collection
    const filter = {
      type: 'smart-collection',
      collection: selectedItem.value
    }
    emit('filter-applied', filter)
  }
}

function exportHierarchy() {
  if (!selectedItem.value) return
  
  const data = JSON.stringify(selectedItem.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${selectedItem.value.name}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Expose method for parent components
defineExpose({
  addSegmentToHierarchy,
  builderMode: computed(() => builderMode.value),
  currentHierarchy: computed(() => currentHierarchy.value)
})
</script>

<style scoped>
.hierarchy-item.active {
  @apply bg-primary/10;
}

.hierarchy-item .active {
  @apply bg-primary text-primary-foreground;
}
</style>