<template>
  <div class="smart-folder-classifier">
    <!-- Classification Header -->
    <div v-if="classification" class="p-3 border-b">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium">Folder Classification</h3>
        <div class="flex items-center gap-2">
          <span 
            class="px-2 py-1 text-xs rounded-full font-medium"
            :class="getTypeColor(classification.type)"
          >
            {{ classification.type.toUpperCase() }}
          </span>
          <span class="text-xs text-muted-foreground">
            {{ Math.round(classification.confidence * 100) }}% confidence
          </span>
        </div>
      </div>
      
      <div class="text-sm text-muted-foreground mb-3">
        {{ classification.reasoning.join(', ') }}
      </div>
      
      <!-- User Actions -->
      <div class="flex gap-2">
        <button
          @click="flagFolder('media')"
          class="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded"
          :class="{ 'bg-green-200': userFlag?.type === 'media' }"
        >
          📁 Media Folder
        </button>
        
        <button
          @click="flagFolder('ignore')"
          class="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded"
          :class="{ 'bg-red-200': userFlag?.type === 'ignore' }"
        >
          🚫 Ignore Folder
        </button>
        
        <button
          @click="flagFolder('system')"
          class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
          :class="{ 'bg-gray-200': userFlag?.type === 'system' }"
        >
          ⚙️ System Folder
        </button>
      </div>
    </div>
    
    <!-- Scan Plan Overview -->
    <div v-if="scanPlan" class="p-3 border-b bg-muted/30">
      <h4 class="font-medium mb-2">Smart Scan Plan</h4>
      
      <div class="grid grid-cols-3 gap-3 mb-3 text-sm">
        <div class="text-center">
          <div class="font-medium text-green-600">{{ scanPlan.stats.media }}</div>
          <div class="text-xs text-muted-foreground">Media Folders</div>
        </div>
        <div class="text-center">
          <div class="font-medium text-red-600">{{ scanPlan.stats.cache }}</div>
          <div class="text-xs text-muted-foreground">Ignored</div>
        </div>
        <div class="text-center">
          <div class="font-medium text-yellow-600">{{ scanPlan.stats.unknown }}</div>
          <div class="text-xs text-muted-foreground">Unknown</div>
        </div>
      </div>
      
      <div class="flex gap-2">
        <button
          @click="$emit('start-smart-scan')"
          class="flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          :disabled="isScanning"
        >
          {{ isScanning ? 'Scanning...' : '🚀 Start Smart Scan' }}
        </button>
        
        <button
          @click="showPlanDetails = !showPlanDetails"
          class="px-3 py-2 text-sm border rounded hover:bg-accent"
        >
          {{ showPlanDetails ? '▲' : '▼' }} Details
        </button>
      </div>
    </div>
    
    <!-- Detailed Scan Plan -->
    <div v-if="showPlanDetails && scanPlan" class="max-h-64 overflow-auto">
      <!-- High Priority Folders -->
      <div v-if="highPriorityFolders.length > 0" class="p-3 border-b">
        <h5 class="font-medium text-sm mb-2 text-green-600">📁 Media Folders (Will Scan)</h5>
        <div class="space-y-1">
          <div 
            v-for="item in highPriorityFolders.slice(0, 10)"
            :key="item.node.path"
            class="flex items-center justify-between text-xs p-2 bg-green-50 dark:bg-green-900/20 rounded"
          >
            <span class="truncate flex-1">{{ item.node.path }}</span>
            <span class="ml-2 text-muted-foreground">
              {{ item.classification.pattern?.name || 'Unknown' }}
            </span>
          </div>
          <div v-if="highPriorityFolders.length > 10" class="text-xs text-muted-foreground">
            ...and {{ highPriorityFolders.length - 10 }} more
          </div>
        </div>
      </div>
      
      <!-- Ignored Folders -->
      <div v-if="ignoredFolders.length > 0" class="p-3 border-b">
        <h5 class="font-medium text-sm mb-2 text-red-600">🚫 Ignored Folders (Will Skip)</h5>
        <div class="space-y-1">
          <div 
            v-for="item in ignoredFolders.slice(0, 5)"
            :key="item.node.path"
            class="flex items-center justify-between text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded"
          >
            <span class="truncate flex-1">{{ item.node.path }}</span>
            <span class="ml-2 text-muted-foreground">
              {{ item.classification.reasoning[0] }}
            </span>
          </div>
          <div v-if="ignoredFolders.length > 5" class="text-xs text-muted-foreground">
            ...and {{ ignoredFolders.length - 5 }} more
          </div>
        </div>
      </div>
    </div>
    
    <!-- Pattern Learning -->
    <div v-if="suggestions.length > 0" class="p-3 border-b bg-blue-50 dark:bg-blue-900/20">
      <h5 class="font-medium text-sm mb-2">🧠 Pattern Learning</h5>
      <div class="space-y-2">
        <div v-for="suggestion in suggestions" :key="suggestion" class="text-xs">
          💡 {{ suggestion }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FileNode } from '@/types'
import type { FolderClassification, UserFolderFlag } from '@/composables/useMediaFolderDetection'
import { useMediaFolderDetection } from '@/composables/useMediaFolderDetection'

interface Props {
  selectedFolder?: FileNode | null
  userFlags: UserFolderFlag[]
  isScanning?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'folder-flagged': [path: string, type: 'media' | 'ignore' | 'system']
  'start-smart-scan': []
}>()

const { classifyFolder, generateScanPlan, learnFromUserAction, suggestPatternUpdates } = useMediaFolderDetection()

const showPlanDetails = ref(false)
const classification = ref<FolderClassification | null>(null)
const scanPlan = ref<any>(null)
const suggestions = ref<string[]>([])

// Compute classification for selected folder
watch(() => props.selectedFolder, (folder) => {
  if (folder && folder.type === 'directory') {
    classification.value = classifyFolder(folder, undefined, props.userFlags)
  } else {
    classification.value = null
  }
}, { immediate: true })

// Generate scan plan when folder tree changes
watch(() => props.selectedFolder, (folder) => {
  if (folder && folder.type === 'directory') {
    scanPlan.value = generateScanPlan(folder, props.userFlags)
    
    // Generate learning suggestions
    const { suggestions: newSuggestions } = suggestPatternUpdates(props.userFlags)
    suggestions.value = newSuggestions
  }
}, { immediate: true })

const userFlag = computed(() => 
  props.userFlags.find(flag => 
    props.selectedFolder && 
    (props.selectedFolder.path.includes(flag.path) || flag.path.includes(props.selectedFolder.path))
  )
)

const highPriorityFolders = computed(() => 
  scanPlan.value?.scanQueue.filter(item => item.classification.priority >= 5) || []
)

const ignoredFolders = computed(() => 
  scanPlan.value?.skipQueue || []
)

function flagFolder(type: 'media' | 'ignore' | 'system') {
  if (props.selectedFolder) {
    emit('folder-flagged', props.selectedFolder.path, type)
  }
}

function getTypeColor(type: string): string {
  const colors = {
    media: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    cache: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    system: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    unknown: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
  }
  return colors[type as keyof typeof colors] || colors.unknown
}
</script>