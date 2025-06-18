<template>
  <div class="smart-template-matcher bg-background border rounded-lg">
    <!-- Header -->
    <div class="p-4 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <span>🎯</span>
            <span>Smart Template Detection</span>
          </h3>
          <p class="text-sm text-muted-foreground mt-1">
            Automatically detected {{ matches.length }} potential template{{ matches.length !== 1 ? 's' : '' }}
          </p>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click="refreshMatches"
            :disabled="isAnalyzing"
            class="px-3 py-1 text-sm border border-input rounded hover:bg-accent disabled:opacity-50"
          >
            {{ isAnalyzing ? '🔄' : '🔍' }} {{ isAnalyzing ? 'Analyzing...' : 'Scan Again' }}
          </button>
          
          <button
            v-if="bestMatch"
            @click="applyBestMatch"
            class="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            ✨ Apply Best Match
          </button>
        </div>
      </div>
    </div>
    
    <!-- Analysis Results -->
    <div class="p-4">
      <div v-if="isAnalyzing" class="text-center py-8">
        <div class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-sm text-muted-foreground">Analyzing folder structure...</p>
      </div>
      
      <div v-else-if="matches.length === 0" class="text-center py-8">
        <div class="text-4xl mb-4">🤷‍♂️</div>
        <p class="text-muted-foreground">No matching templates found</p>
        <p class="text-sm text-muted-foreground mt-2">
          This folder structure doesn't match any known templates. 
          <button @click="$emit('create-template')" class="text-primary hover:underline">
            Create a new template?
          </button>
        </p>
      </div>
      
      <div v-else class="space-y-4">
        <!-- Template Matches -->
        <div
          v-for="match in matches"
          :key="match.templateId"
          class="border rounded-lg p-4 hover:bg-accent/20 transition-colors"
          :class="{
            'border-primary bg-primary/5': match === bestMatch,
            'border-muted': match !== bestMatch
          }"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="relative">
                <span class="text-2xl">{{ getTemplateIcon(match.templateId) }}</span>
                <span
                  v-if="match === bestMatch"
                  class="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center"
                >
                  ⭐
                </span>
              </div>
              
              <div>
                <h4 class="font-medium">{{ getTemplateName(match.templateId) }}</h4>
                <p class="text-sm text-muted-foreground">{{ getTemplateDescription(match.templateId) }}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <!-- Confidence Score -->
              <div class="text-right">
                <div class="text-sm font-medium">
                  {{ Math.round(match.confidence * 100) }}% match
                </div>
                <div class="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full bg-primary transition-all"
                    :style="{ width: `${match.confidence * 100}%` }"
                  ></div>
                </div>
              </div>
              
              <!-- Actions -->
              <div class="flex gap-2">
                <button
                  @click="previewMatch(match)"
                  class="px-3 py-1 text-sm border border-input rounded hover:bg-accent"
                >
                  👁️ Preview
                </button>
                <button
                  @click="applyMatch(match)"
                  class="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                >
                  ✅ Apply
                </button>
              </div>
            </div>
          </div>
          
          <!-- Matched Paths Preview -->
          <div class="bg-muted/20 rounded p-3">
            <h5 class="text-xs font-medium text-muted-foreground mb-2">
              MATCHED PATHS ({{ match.matchedPaths.length }})
            </h5>
            <div class="space-y-1 max-h-32 overflow-auto">
              <div
                v-for="pathMatch in match.matchedPaths.slice(0, 8)"
                :key="pathMatch.path"
                class="flex items-center gap-2 text-sm"
              >
                <span class="text-xs text-muted-foreground">{{ getNodeTypeIcon(pathMatch.node.type) }}</span>
                <span class="font-mono">{{ pathMatch.path }}</span>
                
                <!-- Extracted Variables -->
                <div v-if="Object.keys(pathMatch.variables).length > 0" class="flex gap-1 ml-auto">
                  <span
                    v-for="(value, key) in pathMatch.variables"
                    :key="key"
                    class="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
                  >
                    {{ key }}: {{ value }}
                  </span>
                </div>
              </div>
              
              <div v-if="match.matchedPaths.length > 8" class="text-xs text-muted-foreground text-center pt-2">
                ... and {{ match.matchedPaths.length - 8 }} more paths
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Template Preview Modal -->
    <div
      v-if="previewingMatch"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div class="p-6 border-b">
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-semibold">
              Template Preview: {{ getTemplateName(previewingMatch.templateId) }}
            </h3>
            <button
              @click="previewingMatch = null"
              class="p-2 hover:bg-accent rounded-full"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div class="p-6 overflow-auto max-h-[calc(90vh-140px)]">
          <TemplateMatchPreview
            :match="previewingMatch"
            :template="getTemplate(previewingMatch.templateId)"
            @apply="applyMatch(previewingMatch)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTemplateStore, type TemplateMatch } from '@/stores/templateStore'
import TemplateMatchPreview from './TemplateMatchPreview.vue'

interface Props {
  rootPath: string
  projectStructure: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'template-applied': [templateId: string, extractedVariables: Record<string, string>]
  'create-template': []
}>()

const {
  templates,
  findMatchingTemplates,
  applyTemplate,
  initializeDefaults
} = useTemplateStore()

// State
const matches = ref<TemplateMatch[]>([])
const isAnalyzing = ref(false)
const previewingMatch = ref<TemplateMatch | null>(null)

// Computed
const bestMatch = computed(() => {
  return matches.value.length > 0 ? matches.value[0] : null
})

// Watch for structure changes
watch(() => props.projectStructure, () => {
  if (props.projectStructure.length > 0) {
    analyzeStructure()
  }
}, { immediate: true })

// Methods
async function analyzeStructure() {
  if (!props.projectStructure.length) return
  
  isAnalyzing.value = true
  
  try {
    // Simulate analysis delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const foundMatches = findMatchingTemplates(props.rootPath, props.projectStructure)
    matches.value = foundMatches
    
  } finally {
    isAnalyzing.value = false
  }
}

function refreshMatches() {
  analyzeStructure()
}

function previewMatch(match: TemplateMatch) {
  previewingMatch.value = match
}

function applyMatch(match: TemplateMatch) {
  // Extract all variables from matched paths
  const extractedVariables: Record<string, string> = {}
  
  match.matchedPaths.forEach(pathMatch => {
    Object.assign(extractedVariables, pathMatch.variables)
  })
  
  // Apply template to generate context mappings
  const appliedContexts = applyTemplate(match.templateId, props.rootPath, extractedVariables)
  
  emit('template-applied', match.templateId, extractedVariables)
  
  // Close preview if open
  previewingMatch.value = null
}

function applyBestMatch() {
  if (bestMatch.value) {
    applyMatch(bestMatch.value)
  }
}

function getTemplate(templateId: string) {
  return templates.value.find(t => t.id === templateId)
}

function getTemplateName(templateId: string): string {
  const template = getTemplate(templateId)
  return template?.name || 'Unknown Template'
}

function getTemplateDescription(templateId: string): string {
  const template = getTemplate(templateId)
  return template?.description || ''
}

function getTemplateIcon(templateId: string): string {
  const template = getTemplate(templateId)
  if (!template) return '📁'
  
  const industryIcons = {
    film: '🎬',
    broadcast: '📺',
    commercial: '📽️',
    documentary: '🎥',
    custom: '📁'
  }
  
  return industryIcons[template.industry] || '📁'
}

function getNodeTypeIcon(type: string): string {
  const icons = {
    fixed: '📌',
    variable: '🔤',
    pattern: '🔍'
  }
  return icons[type as keyof typeof icons] || '📁'
}

// Initialize
onMounted(() => {
  initializeDefaults()
})
</script>

<style scoped>
.smart-template-matcher {
  min-height: 200px;
}

/* Confidence bar animation */
.transition-all {
  transition: width 0.5s ease-in-out;
}
</style>