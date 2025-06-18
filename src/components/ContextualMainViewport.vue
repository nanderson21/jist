<template>
  <div class="contextual-viewport h-full flex flex-col bg-background">
    <!-- Header with View Controls -->
    <div class="border-b p-4">
      <!-- Breadcrumb Navigator -->
      <div class="mb-3">
        <nav class="flex items-center space-x-1 text-sm">
          <button
            @click="navigateToRoot"
            class="text-primary hover:text-primary/80 font-medium"
          >
            🏠 Project Root
          </button>
          <template v-for="(crumb, index) in breadcrumbs" :key="index">
            <span class="text-muted-foreground">›</span>
            <button
              @click="navigateToCrumb(crumb, index)"
              class="text-primary hover:text-primary/80"
              :class="{ 'font-medium': index === breadcrumbs.length - 1 }"
            >
              {{ crumb.icon }} {{ crumb.name }}
            </button>
          </template>
          <template v-if="selectedContext">
            <span class="text-muted-foreground">›</span>
            <span class="text-foreground font-medium">
              {{ getContextTypeIcon(selectedContext.type) }} {{ selectedContext.name }}
            </span>
          </template>
        </nav>
      </div>
      
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-foreground">
            {{ getCurrentViewTitle() }}
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            {{ filteredFiles.length }} files organized by {{ activeContexts.length }} discovered contexts
          </p>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- View Mode Selector -->
          <div class="flex bg-muted rounded-md p-1">
            <button
              v-for="mode in viewModes"
              :key="mode.id"
              @click="currentViewMode = mode.id"
              class="px-3 py-1 text-xs rounded transition-colors"
              :class="currentViewMode === mode.id ? 'bg-background shadow-sm' : 'hover:bg-background/50'"
            >
              {{ mode.icon }} {{ mode.name }}
            </button>
          </div>
          
          <!-- Context Filter -->
          <select
            v-model="selectedContextType"
            class="px-3 py-1 text-xs border border-input rounded-md"
          >
            <option value="">All Contexts</option>
            <option v-for="type in contextTypes" :key="type" :value="type">
              {{ formatContextType(type) }}
            </option>
          </select>
          
          <!-- Sort Options -->
          <select
            v-model="sortBy"
            class="px-3 py-1 text-xs border border-input rounded-md"
          >
            <option value="hierarchy">By Hierarchy</option>
            <option value="name">By Name</option>
            <option value="date">By Date</option>
            <option value="type">By Type</option>
            <option value="confidence">By Confidence</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- Main Content Area -->
    <div class="flex-1 overflow-auto">
      <!-- Hierarchical Context View -->
      <div v-if="currentViewMode === 'hierarchy'" class="p-4">
        <div class="space-y-6">
          <div
            v-for="contextGroup in organizedContexts"
            :key="contextGroup.type"
            class="context-group"
          >
            <!-- Context Type Header -->
            <div 
              class="flex items-center gap-3 p-3 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
              @click="toggleContextGroup(contextGroup.type)"
            >
              <span class="text-lg">{{ getContextTypeIcon(contextGroup.type) }}</span>
              <div class="flex-1">
                <h3 class="font-semibold text-foreground">{{ formatContextType(contextGroup.type) }}</h3>
                <p class="text-xs text-muted-foreground">
                  {{ contextGroup.contexts.length }} {{ contextGroup.contexts.length === 1 ? 'context' : 'contexts' }}, 
                  {{ contextGroup.totalFiles }} files
                </p>
              </div>
              <span 
                class="text-xs transition-transform" 
                :class="{ 'rotate-90': expandedGroups.has(contextGroup.type) }"
              >
                ▶
              </span>
            </div>
            
            <!-- Context Items -->
            <div v-if="expandedGroups.has(contextGroup.type)" class="mt-3 space-y-3">
              <div
                v-for="context in contextGroup.contexts"
                :key="context.id"
                class="context-section"
              >
                <!-- Context Header -->
                <div 
                  class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/20 transition-colors"
                  @click="toggleContext(context.id)"
                >
                  <div 
                    class="w-3 h-3 rounded-full"
                    :style="{ backgroundColor: getContextColor(context.type) }"
                  ></div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <h4 class="font-medium text-foreground">{{ context.name }}</h4>
                      <span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {{ Math.round(context.confidence * 100) }}% confidence
                      </span>
                    </div>
                    <p class="text-xs text-muted-foreground">{{ context.description }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs text-muted-foreground">{{ context.files.length }} files</span>
                      <div class="flex gap-1">
                        <span
                          v-for="tag in context.tags.slice(0, 3)"
                          :key="tag"
                          class="text-xs px-1 py-0.5 bg-muted text-muted-foreground rounded"
                        >
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span 
                    class="text-xs transition-transform" 
                    :class="{ 'rotate-90': expandedContexts.has(context.id) }"
                  >
                    ▶
                  </span>
                </div>
                
                <!-- Files in Context -->
                <div v-if="expandedContexts.has(context.id)" class="mt-3 ml-6 space-y-2">
                  <FileContextCard
                    v-for="file in context.files"
                    :key="file.path + '/' + file.name"
                    :file="file"
                    :context="context"
                    :profile="getFileProfile(file)"
                    @file-selected="$emit('file-selected', file)"
                    @context-action="handleContextAction"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Table View -->
      <div v-else-if="currentViewMode === 'table'" class="p-4">
        <div class="overflow-hidden border rounded-lg">
          <table class="w-full">
            <thead class="bg-muted/20 border-b">
              <tr>
                <th class="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                <th class="text-left p-3 text-xs font-medium text-muted-foreground">Context</th>
                <th class="text-left p-3 text-xs font-medium text-muted-foreground">Tags</th>
                <th class="text-left p-3 text-xs font-medium text-muted-foreground">Hierarchy</th>
                <th class="text-left p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="file in filteredFiles"
                :key="file.path + '/' + file.name"
                class="border-b hover:bg-accent/10 cursor-pointer"
                @click="$emit('file-selected', file)"
              >
                <td class="p-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">{{ getFileIcon(file) }}</span>
                    <div>
                      <div class="text-sm font-medium">{{ file.name }}</div>
                      <div class="text-xs text-muted-foreground">{{ formatFileSize(file.size || 0) }}</div>
                    </div>
                  </div>
                </td>
                <td class="p-3">
                  <div class="space-y-1">
                    <span
                      v-for="context in getFileContexts(file).slice(0, 2)"
                      :key="context.id"
                      class="inline-block text-xs px-2 py-1 rounded-full mr-1"
                      :style="{ 
                        backgroundColor: getContextColor(context.type) + '20',
                        color: getContextColor(context.type)
                      }"
                    >
                      {{ context.name }}
                    </span>
                  </div>
                </td>
                <td class="p-3">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="tag in getFileTags(file).slice(0, 3)"
                      :key="tag"
                      class="text-xs px-1 py-0.5 bg-muted text-muted-foreground rounded"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </td>
                <td class="p-3">
                  <div class="text-xs text-muted-foreground">
                    {{ getFileHierarchy(file).slice(-3).join(' > ') }}
                  </div>
                </td>
                <td class="p-3">
                  <div class="flex gap-1">
                    <button 
                      class="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20"
                      @click.stop="viewFile(file)"
                    >
                      View
                    </button>
                    <button 
                      class="text-xs px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80"
                      @click.stop="editFile(file)"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Grid View -->
      <div v-else-if="currentViewMode === 'grid'" class="p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <FileContextCard
            v-for="file in filteredFiles"
            :key="file.path + '/' + file.name"
            :file="file"
            :context="getPrimaryContext(file)"
            :profile="getFileProfile(file)"
            @file-selected="$emit('file-selected', file)"
            @context-action="handleContextAction"
            class="h-full"
          />
        </div>
      </div>
      
      <!-- Context Builder View -->
      <div v-else-if="currentViewMode === 'builder'" class="h-full">
        <HierarchyContextBuilder
          ref="contextBuilderRef"
          :all-files="filteredFiles"
          :is-scanning="props.isScanning || false"
          @context-assigned="handleContextAssigned"
          @pattern-applied="handlePatternApplied"
          @contexts-updated="handleContextsUpdated"
        />
      </div>
    </div>
    
    <!-- Context Actions Panel -->
    <div v-if="selectedContext" class="border-t p-4 bg-muted/10">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-medium">{{ selectedContext.name }}</h4>
          <p class="text-xs text-muted-foreground">{{ selectedContext.description }}</p>
        </div>
        <div class="flex gap-2">
          <button class="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
            Create Filter
          </button>
          <button class="px-3 py-1 text-xs border border-input rounded hover:bg-accent">
            Export List
          </button>
          <button class="px-3 py-1 text-xs border border-input rounded hover:bg-accent">
            Create Rule
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FileNode } from '@/types'
import type { DetectedContext, FileContextProfile } from '@/composables/useContextDetection'
import { useContextDetection } from '@/composables/useContextDetection'
import FileContextCard from './FileContextCard.vue'
import HierarchyContextBuilder from './HierarchyContextBuilder.vue'

interface Props {
  files: FileNode[]
  selectedFolder: FileNode | null
  isScanning?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'file-selected': [file: FileNode]
  'context-selected': [context: DetectedContext]
}>()

const { 
  detectedContexts, 
  contextsByType, 
  getFileProfile, 
  processFilesBatch 
} = useContextDetection()

// View state
const currentViewMode = ref<'hierarchy' | 'table' | 'grid' | 'builder'>('hierarchy')
const selectedContextType = ref<string>('')
const sortBy = ref<'hierarchy' | 'name' | 'date' | 'type' | 'confidence'>('hierarchy')
const expandedGroups = ref<Set<string>>(new Set(['project', 'status']))
const expandedContexts = ref<Set<string>>(new Set())
const selectedContext = ref<DetectedContext | null>(null)

// Breadcrumb navigation state
const breadcrumbs = ref<Array<{ name: string; icon: string; path?: string; context?: DetectedContext }>>([])
const currentHierarchyPath = ref<string[]>([])

// Context Builder integration
const builderContexts = ref<DetectedContext[]>([])
const contextBuilderRef = ref<InstanceType<typeof HierarchyContextBuilder>>()

const viewModes = [
  { id: 'hierarchy', name: 'Hierarchy', icon: '📁' },
  { id: 'table', name: 'Table', icon: '📊' },
  { id: 'grid', name: 'Grid', icon: '⊞' },
  { id: 'builder', name: 'Context Builder', icon: '🔧' }
]

// Process files when they change
watch(() => props.files, (newFiles) => {
  if (newFiles.length > 0) {
    processFilesBatch(newFiles)
  }
}, { immediate: true })

// Computed properties
const filteredFiles = computed(() => {
  let files = props.selectedFolder 
    ? props.files.filter(file => file.path.startsWith(props.selectedFolder!.path))
    : props.files

  if (selectedContextType.value) {
    files = files.filter(file => 
      getFileContexts(file).some(context => context.type === selectedContextType.value)
    )
  }

  return files.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'date':
        return (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0)
      case 'type':
        return getFileExtension(a.name).localeCompare(getFileExtension(b.name))
      case 'confidence':
        const aConf = getPrimaryContext(a)?.confidence || 0
        const bConf = getPrimaryContext(b)?.confidence || 0
        return bConf - aConf
      default:
        return 0
    }
  })
})

const activeContexts = computed(() => {
  // Combine contexts from both the auto-detection and the context builder
  const allContexts = [...detectedContexts.value, ...builderContexts.value]
  return allContexts.filter(context => 
    context.files.some(file => filteredFiles.value.includes(file))
  )
})

const contextTypes = computed(() => {
  return [...new Set(activeContexts.value.map(context => context.type))]
})

const organizedContexts = computed(() => {
  const groups = contextTypes.value.map(type => {
    const contexts = activeContexts.value.filter(context => context.type === type)
    const totalFiles = contexts.reduce((sum, context) => sum + context.files.length, 0)
    
    return {
      type,
      contexts: contexts.sort((a, b) => b.confidence - a.confidence),
      totalFiles
    }
  })
  
  return groups.sort((a, b) => b.totalFiles - a.totalFiles)
})

// Methods
function toggleContextGroup(type: string) {
  if (expandedGroups.value.has(type)) {
    expandedGroups.value.delete(type)
  } else {
    expandedGroups.value.add(type)
  }
}

function toggleContext(contextId: string) {
  if (expandedContexts.value.has(contextId)) {
    expandedContexts.value.delete(contextId)
  } else {
    expandedContexts.value.add(contextId)
  }
}

function getFileContexts(file: FileNode): DetectedContext[] {
  return activeContexts.value.filter(context => 
    context.files.some(f => f.path === file.path && f.name === file.name)
  )
}

function getPrimaryContext(file: FileNode): DetectedContext | null {
  const contexts = getFileContexts(file)
  return contexts.length > 0 ? contexts[0] : null
}

function getFileTags(file: FileNode): string[] {
  const profile = getFileProfile(file)
  return profile?.tags || []
}

function getFileHierarchy(file: FileNode): string[] {
  const profile = getFileProfile(file)
  return profile?.hierarchy || []
}

function handleContextAction(action: string, context: DetectedContext, file?: FileNode) {
  console.log('Context action:', { action, context: context.name, file: file?.name })
  
  switch (action) {
    case 'select-context':
      navigateToContext(context)
      break
    case 'filter-by-context':
      selectedContextType.value = context.type
      break
    case 'view-files':
      expandedContexts.value.add(context.id)
      break
    case 'navigate-to-context':
      navigateToContext(context)
      break
  }
}

function formatContextType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')
}

function getContextTypeIcon(type: string): string {
  const icons = {
    project: '🎯',
    status: '📋',
    category: '🏷️',
    format: '🎬',
    temporal: '📅',
    semantic: '💭',
    technical: '⚙️'
  }
  return icons[type] || '📄'
}

function getContextColor(type: string): string {
  const colors = {
    project: '#3b82f6',
    status: '#10b981',
    category: '#f59e0b',
    format: '#8b5cf6',
    temporal: '#ef4444',
    semantic: '#06b6d4',
    technical: '#6b7280'
  }
  return colors[type] || '#6b7280'
}

function getFileIcon(file: FileNode): string {
  const ext = getFileExtension(file.name).toLowerCase()
  const icons = {
    mp4: '🎬', mov: '🎬', avi: '🎬',
    wav: '🎵', mp3: '🎵', aif: '🎵',
    jpg: '🖼️', png: '🖼️', tiff: '🖼️',
    r3d: '📹', braw: '📹',
    pdf: '📄', txt: '📄', md: '📄'
  }
  return icons[ext] || '📄'
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop() || ''
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function viewFile(file: FileNode) {
  emit('file-selected', file)
}

function editFile(file: FileNode) {
  // Implement edit functionality
  console.log('Edit file:', file.name)
}

function handleContextAssigned(segment: any, context: string, contextType: string) {
  console.log('Context assigned in viewport:', { segment: segment.name, context, contextType })
  // Could update local context detection or emit to parent
}

function handlePatternApplied(pattern: any, segments: any[]) {
  console.log('Pattern applied in viewport:', { pattern: pattern.name, segments: segments.length })
  // Could trigger re-processing of contexts
}

function handleContextsUpdated(contexts: DetectedContext[]) {
  console.log('Contexts updated from Context Builder:', contexts.length)
  builderContexts.value = contexts
  
  // If we're in hierarchy view, we might want to refresh the display
  if (currentViewMode.value === 'hierarchy') {
    // The computed properties will automatically update
  }
}

// Breadcrumb navigation methods
function getCurrentViewTitle(): string {
  if (selectedContext.value) {
    return `${selectedContext.value.name} Context`
  }
  if (props.selectedFolder) {
    return `Files from ${props.selectedFolder.name}`
  }
  if (currentHierarchyPath.value.length > 0) {
    return currentHierarchyPath.value[currentHierarchyPath.value.length - 1]
  }
  return 'Unified Project Hierarchy'
}

function navigateToRoot() {
  breadcrumbs.value = []
  currentHierarchyPath.value = []
  selectedContext.value = null
  selectedContextType.value = ''
  emit('context-selected', null as any)
}

function navigateToCrumb(crumb: any, index: number) {
  // Remove breadcrumbs after the clicked one
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
  currentHierarchyPath.value = currentHierarchyPath.value.slice(0, index + 1)
  
  if (crumb.context) {
    selectedContext.value = crumb.context
    selectedContextType.value = crumb.context.type
    emit('context-selected', crumb.context)
  }
}

function navigateToContext(context: DetectedContext) {
  // Add context to breadcrumb trail
  const contextCrumb = {
    name: context.name,
    icon: getContextTypeIcon(context.type),
    context: context
  }
  
  // Check if this context is already in breadcrumbs
  const existingIndex = breadcrumbs.value.findIndex(crumb => 
    crumb.context?.id === context.id
  )
  
  if (existingIndex >= 0) {
    // Navigate back to existing context
    navigateToCrumb(contextCrumb, existingIndex)
  } else {
    // Add new context to breadcrumb trail
    breadcrumbs.value.push(contextCrumb)
    currentHierarchyPath.value.push(context.name)
    selectedContext.value = context
    selectedContextType.value = context.type
    emit('context-selected', context)
  }
}
</script>

<style scoped>
.context-group {
  @apply border border-border/20 rounded-lg p-3;
}

.context-section {
  @apply ml-4;
}

.contextual-viewport {
  min-height: 0;
}
</style>