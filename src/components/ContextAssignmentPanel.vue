<template>
  <div class="context-assignment-panel">
    <div class="flex items-center justify-between mb-3">
      <div>
        <h4 class="font-medium">Assign Context to "{{ segment.name }}"</h4>
        <p class="text-xs text-muted-foreground">
          {{ segment.files.length }} files • Level {{ segment.level }} • {{ segment.type }}
        </p>
      </div>
      
      <button
        @click="$emit('panel-closed')"
        class="p-1 text-muted-foreground hover:text-foreground rounded"
      >
        ✕
      </button>
    </div>
    
    <!-- Quick Suggestions -->
    <div v-if="suggestedContexts.length > 0" class="mb-4">
      <div class="text-xs font-medium text-muted-foreground mb-2">Suggested:</div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="suggestion in suggestedContexts"
          :key="suggestion"
          @click="assignContext(suggestion)"
          class="px-3 py-1 text-xs bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>
    
    <!-- Context Categories -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <button
        v-for="category in contextCategories"
        :key="category.name"
        @click="selectedCategory = category.name"
        class="p-2 text-xs border rounded text-center transition-colors"
        :class="selectedCategory === category.name ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'"
      >
        <div class="text-lg mb-1">{{ category.icon }}</div>
        <div>{{ category.name }}</div>
      </button>
    </div>
    
    <!-- Category Options -->
    <div v-if="selectedCategory" class="mb-4">
      <div class="text-xs font-medium text-muted-foreground mb-2">{{ selectedCategory }} Options:</div>
      <div class="grid grid-cols-2 gap-1">
        <button
          v-for="option in categoryOptions"
          :key="option"
          @click="assignContext(option)"
          class="px-2 py-1 text-xs border border-input rounded hover:bg-accent text-left"
        >
          {{ option }}
        </button>
      </div>
    </div>
    
    <!-- Custom Context Input -->
    <div class="mb-4">
      <div class="text-xs font-medium text-muted-foreground mb-2">Custom Context:</div>
      <div class="flex gap-2">
        <input
          v-model="customContext"
          @keyup.enter="assignCustomContext"
          class="flex-1 px-3 py-2 text-sm border border-input rounded"
          placeholder="Enter custom context name..."
        />
        <button
          @click="assignCustomContext"
          :disabled="!customContext.trim()"
          class="px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
    
    <!-- Advanced Options -->
    <div class="border-t pt-3">
      <div class="text-xs font-medium text-muted-foreground mb-2">Advanced:</div>
      <div class="flex gap-2">
        <button
          @click="applyToSimilar"
          class="px-3 py-1 text-xs border border-input rounded hover:bg-accent"
        >
          Apply to Similar ({{ similarSegments.length }})
        </button>
        
        <button
          @click="createIngestRule"
          class="px-3 py-1 text-xs border border-input rounded hover:bg-accent"
        >
          Create Ingest Rule
        </button>
        
        <button
          @click="addToHierarchy"
          class="px-3 py-1 text-xs border border-input rounded hover:bg-accent"
        >
          Add to Hierarchy
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface HierarchySegment {
  id: string
  name: string
  type: 'folder' | 'filename' | 'pattern'
  value: string
  level: number
  confidence: number
  files: any[]
  examples: string[]
  assignedContext?: string
  contextType?: string
  suggestedContexts: string[]
}

interface Props {
  segment: HierarchySegment
  suggestedContexts: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'context-assigned': [context: string, contextType: string]
  'panel-closed': []
  'apply-to-similar': [context: string, contextType: string]
  'create-rule': [segment: HierarchySegment, context: string]
  'add-to-hierarchy': [segment: HierarchySegment, context: string]
}>()

// State
const selectedCategory = ref<string>('')
const customContext = ref('')

// Context categories
const contextCategories = [
  {
    name: 'Project',
    icon: '🎯',
    options: ['project-name', 'show-name', 'event-name', 'client-name', 'production-title']
  },
  {
    name: 'Camera',
    icon: '📹',
    options: ['camera-unit', 'camera-angle', 'camera-operator', 'camera-id', 'lens-type']
  },
  {
    name: 'Time',
    icon: '📅',
    options: ['shoot-date', 'delivery-date', 'event-date', 'creation-date', 'time-code']
  },
  {
    name: 'Media',
    icon: '🎬',
    options: ['reel-id', 'card-id', 'roll-id', 'capture-roll', 'media-type']
  },
  {
    name: 'Sequence',
    icon: '🎞️',
    options: ['sequence-number', 'take-number', 'clip-number', 'shot-number', 'scene-id']
  },
  {
    name: 'Status',
    icon: '📋',
    options: ['production-status', 'approval-status', 'version-status', 'edit-status', 'delivery-status']
  },
  {
    name: 'Location',
    icon: '📍',
    options: ['shoot-location', 'venue', 'room', 'set', 'stage', 'studio']
  },
  {
    name: 'Technical',
    icon: '⚙️',
    options: ['resolution', 'frame-rate', 'codec', 'format', 'color-space', 'bit-depth']
  }
]

// Computed properties
const categoryOptions = computed(() => {
  const category = contextCategories.find(cat => cat.name === selectedCategory.value)
  return category?.options || []
})

const similarSegments = computed(() => {
  // This would find segments with similar patterns or names
  // For now, return a mock count
  return Array(Math.floor(Math.random() * 10) + 1)
})

// Methods
function assignContext(context: string) {
  const contextType = detectContextType(context)
  emit('context-assigned', context, contextType)
}

function assignCustomContext() {
  if (customContext.value.trim()) {
    assignContext(customContext.value.trim())
    customContext.value = ''
  }
}

function detectContextType(context: string): string {
  for (const category of contextCategories) {
    if (category.options.includes(context)) {
      return category.name.toLowerCase()
    }
  }
  
  // Guess based on context name
  if (context.includes('date') || context.includes('time')) return 'time'
  if (context.includes('camera') || context.includes('cam')) return 'camera'
  if (context.includes('project') || context.includes('show')) return 'project'
  if (context.includes('reel') || context.includes('roll')) return 'media'
  if (context.includes('clip') || context.includes('sequence')) return 'sequence'
  if (context.includes('status')) return 'status'
  if (context.includes('location') || context.includes('venue')) return 'location'
  if (context.includes('resolution') || context.includes('fps')) return 'technical'
  
  return 'project'
}

function applyToSimilar() {
  if (props.segment.assignedContext) {
    emit('apply-to-similar', props.segment.assignedContext, props.segment.contextType || 'project')
  }
}

function createIngestRule() {
  if (props.segment.assignedContext) {
    emit('create-rule', props.segment, props.segment.assignedContext)
  }
}

function addToHierarchy() {
  if (props.segment.assignedContext) {
    emit('add-to-hierarchy', props.segment, props.segment.assignedContext)
  }
}
</script>

<style scoped>
.context-assignment-panel {
  @apply max-w-2xl;
}
</style>