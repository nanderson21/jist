<template>
  <div class="observations-feed h-full flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-foreground">Context Observations</h3>
          <p class="text-xs text-muted-foreground mt-1">
            {{ observations.length }} discovered patterns and relationships
          </p>
        </div>
        
        <div class="flex items-center gap-2">
          <select
            v-model="filterType"
            class="px-2 py-1 text-xs border border-input rounded"
          >
            <option value="">All Types</option>
            <option value="relationship">Relationships</option>
            <option value="pattern">Patterns</option>
            <option value="anomaly">Anomalies</option>
            <option value="suggestion">Suggestions</option>
          </select>
          
          <button
            @click="deduplicateContexts"
            class="p-1 text-muted-foreground hover:text-foreground rounded"
            title="Remove duplicate contexts"
          >
            🧹
          </button>
          
          <button
            @click="refreshObservations"
            class="p-1 text-muted-foreground hover:text-foreground rounded"
            title="Refresh observations"
          >
            🔄
          </button>
        </div>
      </div>
    </div>
    
    <!-- Observations List -->
    <div class="flex-1 overflow-auto p-4 space-y-4">
      <div
        v-for="observation in filteredObservations"
        :key="observation.id"
        class="observation-card border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
        @click="selectObservation(observation)"
      >
        <!-- Observation Header -->
        <div class="flex items-start gap-3 mb-3">
          <div class="flex-shrink-0 mt-1">
            <span class="text-lg">{{ getObservationIcon(observation) }}</span>
          </div>
          
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-foreground mb-1">{{ observation.title }}</h4>
            <p class="text-sm text-muted-foreground">{{ observation.description }}</p>
          </div>
          
          <!-- Confidence Badge -->
          <div class="flex-shrink-0">
            <span 
              class="text-xs px-2 py-1 rounded-full"
              :class="getConfidenceStyle(observation.confidence)"
            >
              {{ Math.round(observation.confidence * 100) }}%
            </span>
          </div>
        </div>
        
        <!-- Context Information -->
        <div class="mb-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-medium text-muted-foreground">Primary Context:</span>
            <span 
              class="text-xs px-2 py-1 rounded-full"
              :style="{ 
                backgroundColor: getContextColor(observation.context.type) + '20',
                color: getContextColor(observation.context.type)
              }"
            >
              {{ observation.context.name }}
            </span>
          </div>
          
          <div v-if="observation.relatedContexts.length > 0" class="flex items-center gap-2">
            <span class="text-xs font-medium text-muted-foreground">Related:</span>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="context in observation.relatedContexts.slice(0, 3)"
                :key="context.id"
                class="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
              >
                {{ context.name }}
              </span>
              <span 
                v-if="observation.relatedContexts.length > 3"
                class="text-xs text-muted-foreground"
              >
                +{{ observation.relatedContexts.length - 3 }} more
              </span>
            </div>
          </div>
        </div>
        
        <!-- Suggested Actions -->
        <div v-if="observation.suggestedActions.length > 0" class="mb-3">
          <div class="text-xs font-medium text-muted-foreground mb-2">Suggested Actions:</div>
          <div class="space-y-1">
            <button
              v-for="action in observation.suggestedActions.slice(0, 2)"
              :key="action"
              @click.stop="executeAction(action, observation)"
              class="block w-full text-left text-xs p-2 bg-muted/50 hover:bg-muted rounded transition-colors"
            >
              {{ action }}
            </button>
          </div>
        </div>
        
        <!-- Metadata -->
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>{{ formatRelativeTime(observation.createdAt) }}</span>
          <div class="flex items-center gap-2">
            <span>{{ observation.context.files.length }} files affected</span>
            <button
              @click.stop="dismissObservation(observation.id)"
              class="hover:text-foreground"
              title="Dismiss observation"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-if="filteredObservations.length === 0" class="text-center py-8 text-muted-foreground">
        <div class="text-2xl mb-2">🔍</div>
        <div class="text-sm">{{ emptyStateMessage }}</div>
      </div>
    </div>
    
    <!-- Quick Insights Summary -->
    <div v-if="quickInsights.length > 0" class="border-t p-4 bg-muted/10">
      <div class="text-xs font-medium text-muted-foreground mb-2">Quick Insights</div>
      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="insight in quickInsights"
          :key="insight.type"
          class="text-xs p-2 bg-background rounded border"
        >
          <div class="font-medium">{{ insight.label }}</div>
          <div class="text-muted-foreground">{{ insight.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ContextObservation, DetectedContext } from '@/composables/useContextDetection'
import { useContextDetection } from '@/composables/useContextDetection'

interface Props {
  selectedFolder?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'observation-selected': [observation: ContextObservation]
  'action-executed': [action: string, observation: ContextObservation]
}>()

const { contextObservations, detectedContexts, deduplicateExistingContexts } = useContextDetection()

// State
const filterType = ref<string>('')
const dismissedObservations = ref<Set<string>>(new Set())

// Computed properties
const observations = computed(() => {
  return contextObservations.value.filter(obs => 
    !dismissedObservations.value.has(obs.id)
  )
})

const filteredObservations = computed(() => {
  let filtered = observations.value

  if (filterType.value) {
    filtered = filtered.filter(obs => 
      getObservationType(obs) === filterType.value
    )
  }

  if (props.selectedFolder) {
    filtered = filtered.filter(obs => 
      obs.context.files.some(file => 
        file.path.startsWith(props.selectedFolder!)
      )
    )
  }

  return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
})

const quickInsights = computed(() => {
  const insights = []
  const contexts = detectedContexts.value

  if (contexts.length > 0) {
    // Most common context type
    const typeCount = contexts.reduce((acc, context) => {
      acc[context.type] = (acc[context.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const mostCommonType = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)[0]
    
    insights.push({
      type: 'common-context',
      label: 'Most Common Context',
      value: `${formatContextType(mostCommonType[0])} (${mostCommonType[1]})`
    })

    // Average confidence
    const avgConfidence = contexts.reduce((sum, ctx) => sum + ctx.confidence, 0) / contexts.length
    insights.push({
      type: 'confidence',
      label: 'Avg. Confidence',
      value: `${Math.round(avgConfidence * 100)}%`
    })

    // Total files with contexts
    const filesWithContexts = new Set()
    contexts.forEach(ctx => ctx.files.forEach(file => 
      filesWithContexts.add(file.path + '/' + file.name)
    ))
    
    insights.push({
      type: 'coverage',
      label: 'Files with Context',
      value: `${filesWithContexts.size}`
    })

    // Most productive context
    const mostProductiveContext = contexts
      .sort((a, b) => b.files.length - a.files.length)[0]
    
    if (mostProductiveContext) {
      insights.push({
        type: 'productive',
        label: 'Most Files',
        value: `${mostProductiveContext.name} (${mostProductiveContext.files.length})`
      })
    }
  }

  return insights
})

const emptyStateMessage = computed(() => {
  if (filterType.value) {
    return `No ${filterType.value} observations found`
  }
  if (props.selectedFolder) {
    return 'No observations for this folder'
  }
  return 'No observations discovered yet. Scan some files to see patterns!'
})

// Watch for folder changes
watch(() => props.selectedFolder, () => {
  // Could trigger folder-specific analysis here
})

// Methods
function getObservationType(observation: ContextObservation): string {
  if (observation.title.includes('Pipeline') || observation.title.includes('Relationship')) {
    return 'relationship'
  }
  if (observation.title.includes('Pattern') || observation.title.includes('Standards')) {
    return 'pattern'
  }
  if (observation.title.includes('Anomaly') || observation.title.includes('Inconsistent')) {
    return 'anomaly'
  }
  return 'suggestion'
}

function getObservationIcon(observation: ContextObservation): string {
  const type = getObservationType(observation)
  const icons = {
    relationship: '🔗',
    pattern: '🎯',
    anomaly: '⚠️',
    suggestion: '💡'
  }
  return icons[type] || '📊'
}

function getConfidenceStyle(confidence: number): string {
  if (confidence >= 0.8) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
  } else if (confidence >= 0.6) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
  } else {
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
  }
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

function formatContextType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function selectObservation(observation: ContextObservation) {
  emit('observation-selected', observation)
}

function executeAction(action: string, observation: ContextObservation) {
  console.log('Executing action:', action, 'for observation:', observation.title)
  emit('action-executed', action, observation)
  
  // Handle common actions
  switch (action) {
    case 'Create production timeline view':
      // Create a timeline filter
      break
    case 'Set up approval workflow':
      // Create approval-based rules
      break
    case 'Create technical specification views':
      // Create tech spec filters
      break
    case 'Create thematic content views':
      // Create semantic filters
      break
  }
}

function dismissObservation(observationId: string) {
  dismissedObservations.value.add(observationId)
}

function refreshObservations() {
  // Clear dismissed observations and refresh
  dismissedObservations.value.clear()
  // Could trigger re-analysis here
}

function deduplicateContexts() {
  const result = deduplicateExistingContexts()
  console.log('Deduplication result:', result)
  
  if (result.removedContexts > 0 || result.removedObservations > 0) {
    alert(`Removed ${result.removedContexts} duplicate contexts and ${result.removedObservations} duplicate observations`)
  } else {
    alert('No duplicates found!')
  }
}
</script>

<style scoped>
.observation-card {
  @apply transition-all duration-200;
}

.observation-card:hover {
  @apply shadow-lg border-primary/20;
  transform: translateY(-1px);
}

.observations-feed {
  min-height: 0;
}
</style>