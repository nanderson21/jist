<template>
  <div 
    class="segment-card border rounded-lg p-3 cursor-pointer transition-all"
    :class="cardClasses"
    @click="$emit('segment-clicked', segment)"
  >
    <!-- Segment Header -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <span class="text-lg">{{ getSegmentIcon() }}</span>
        <div class="min-w-0 flex-1">
          <h4 class="font-medium text-sm truncate">{{ segment.name }}</h4>
          <p class="text-xs text-muted-foreground">{{ segment.type }}</p>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="flex items-center gap-1">
        <button
          v-if="!segment.assignedContext"
          @click.stop="showQuickAssign = !showQuickAssign"
          class="p-1 text-muted-foreground hover:text-foreground rounded"
          title="Quick assign context"
        >
          ⚡
        </button>
        
        <span 
          class="text-xs px-2 py-1 rounded-full"
          :class="getConfidenceStyle()"
        >
          {{ Math.round(segment.confidence * 100) }}%
        </span>
      </div>
    </div>
    
    <!-- Assigned Context -->
    <div v-if="segment.assignedContext" class="mb-2">
      <div 
        class="text-xs px-2 py-1 rounded-full inline-flex items-center gap-1"
        :class="getContextStyle()"
      >
        <span>✓</span>
        <span>{{ segment.assignedContext }}</span>
      </div>
    </div>
    
    <!-- Suggested Contexts -->
    <div v-else-if="segment.suggestedContexts.length > 0" class="mb-2">
      <div class="flex flex-wrap gap-1">
        <button
          v-for="suggestion in segment.suggestedContexts.slice(0, 2)"
          :key="suggestion"
          @click.stop="assignContext(suggestion)"
          class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>
    
    <!-- Quick Assignment Dropdown -->
    <div v-if="showQuickAssign" class="mb-2 p-2 bg-muted/20 rounded border" @click.stop>
      <div class="text-xs font-medium mb-2">Assign Context:</div>
      <div class="space-y-1">
        <button
          v-for="context in allContextOptions"
          :key="context"
          @click="assignContext(context)"
          class="block w-full text-left text-xs p-1 hover:bg-accent rounded"
        >
          {{ context }}
        </button>
      </div>
      <div class="mt-2 pt-2 border-t">
        <input
          v-model="customContext"
          @keyup.enter="assignCustomContext"
          class="w-full text-xs p-1 border border-input rounded"
          placeholder="Custom context..."
        />
      </div>
    </div>
    
    <!-- File Count and Examples -->
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs text-muted-foreground">
        <span>{{ segment.files.length }} {{ segment.files.length === 1 ? 'file' : 'files' }}</span>
        <span v-if="isScanning" class="animate-pulse">🔄</span>
      </div>
      
      <!-- Examples -->
      <div v-if="showExamples && segment.examples.length > 0" class="space-y-1">
        <div class="text-xs text-muted-foreground">Examples:</div>
        <div class="space-y-0.5">
          <div
            v-for="example in segment.examples.slice(0, 2)"
            :key="example"
            class="text-xs font-mono bg-muted/50 px-2 py-1 rounded truncate"
            :title="example"
          >
            {{ example }}
          </div>
        </div>
      </div>
      
      <!-- Value Pattern -->
      <div v-if="segment.type === 'pattern'" class="mt-1">
        <div class="text-xs text-muted-foreground">Pattern:</div>
        <div class="text-xs font-mono bg-muted/50 px-2 py-1 rounded break-all">
          {{ segment.value }}
        </div>
      </div>
    </div>
    
    <!-- RED Detection Badge -->
    <div v-if="isREDPattern" class="mt-2 pt-2 border-t">
      <span class="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
        🎬 RED Pattern
      </span>
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
  isScanning?: boolean
  showExamples?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'context-assigned': [context: string, contextType: string]
  'segment-clicked': [segment: HierarchySegment]
}>()

// State
const showQuickAssign = ref(false)
const customContext = ref('')

// Context options
const contextOptions = {
  project: ['project-name', 'show-name', 'event-name', 'client-name'],
  camera: ['camera-unit', 'camera-angle', 'camera-operator', 'camera-id'],
  date: ['shoot-date', 'delivery-date', 'event-date', 'creation-date'],
  reel: ['reel-id', 'card-id', 'roll-id', 'capture-roll'],
  clip: ['sequence-number', 'take-number', 'clip-number', 'shot-number'],
  scene: ['scene-number', 'sequence-id', 'act-number'],
  status: ['production-status', 'approval-status', 'version-status'],
  location: ['shoot-location', 'venue', 'room', 'set'],
  technical: ['resolution', 'frame-rate', 'codec', 'format'],
  content: ['content-type', 'genre', 'category', 'theme']
}

// Computed properties
const cardClasses = computed(() => ({
  'bg-green-50 border-green-200': props.segment.assignedContext,
  'bg-blue-50 border-blue-200': !props.segment.assignedContext && props.segment.suggestedContexts.length > 0,
  'hover:shadow-md': true,
  'ring-2 ring-primary/20': showQuickAssign.value
}))

const isREDPattern = computed(() => {
  return props.segment.type === 'pattern' && 
         (props.segment.value.includes('R3D') || 
          /[A-Z]\d{3}_[A-Z]\d{3}_\d{8}_\d{3}/.test(props.segment.value))
})

const allContextOptions = computed(() => {
  const baseOptions = [...props.segment.suggestedContexts]
  
  // Add type-specific options
  Object.values(contextOptions).forEach(options => {
    options.forEach(option => {
      if (!baseOptions.includes(option)) {
        baseOptions.push(option)
      }
    })
  })
  
  return baseOptions.sort()
})

// Methods
function getSegmentIcon(): string {
  if (props.segment.assignedContext) return '✅'
  
  switch (props.segment.type) {
    case 'folder': return '📁'
    case 'pattern': return '🎯'
    case 'filename': return '📄'
    default: return '📋'
  }
}

function getConfidenceStyle(): string {
  const confidence = props.segment.confidence
  if (confidence >= 0.8) {
    return 'bg-green-100 text-green-800'
  } else if (confidence >= 0.6) {
    return 'bg-yellow-100 text-yellow-800'
  } else {
    return 'bg-red-100 text-red-800'
  }
}

function getContextStyle(): string {
  if (!props.segment.contextType) {
    return 'bg-green-100 text-green-800'
  }
  
  const colors = {
    project: 'bg-blue-100 text-blue-800',
    camera: 'bg-purple-100 text-purple-800',
    date: 'bg-orange-100 text-orange-800',
    reel: 'bg-red-100 text-red-800',
    clip: 'bg-cyan-100 text-cyan-800',
    status: 'bg-green-100 text-green-800',
    location: 'bg-pink-100 text-pink-800',
    technical: 'bg-gray-100 text-gray-800'
  }
  
  return colors[props.segment.contextType] || 'bg-green-100 text-green-800'
}

function assignContext(context: string) {
  const contextType = detectContextType(context)
  props.segment.assignedContext = context
  props.segment.contextType = contextType
  
  emit('context-assigned', context, contextType)
  showQuickAssign.value = false
}

function assignCustomContext() {
  if (customContext.value.trim()) {
    assignContext(customContext.value.trim())
    customContext.value = ''
  }
}

function detectContextType(context: string): string {
  for (const [type, options] of Object.entries(contextOptions)) {
    if (options.includes(context)) {
      return type
    }
  }
  
  // Guess based on context name
  if (context.includes('date')) return 'date'
  if (context.includes('camera') || context.includes('cam')) return 'camera'
  if (context.includes('project') || context.includes('show')) return 'project'
  if (context.includes('reel') || context.includes('roll')) return 'reel'
  if (context.includes('clip') || context.includes('sequence')) return 'clip'
  if (context.includes('status')) return 'status'
  if (context.includes('location') || context.includes('venue')) return 'location'
  
  return 'content'
}
</script>

<style scoped>
.segment-card {
  @apply transition-all duration-200;
}

.segment-card:hover {
  transform: translateY(-1px);
}
</style>