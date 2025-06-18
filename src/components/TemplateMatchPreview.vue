<template>
  <div class="template-match-preview">
    <!-- Template Info -->
    <div class="mb-6 p-4 bg-muted/20 rounded-lg">
      <div class="flex items-center gap-3 mb-3">
        <span class="text-3xl">{{ getIndustryIcon() }}</span>
        <div>
          <h4 class="text-lg font-semibold">{{ template?.name }}</h4>
          <p class="text-sm text-muted-foreground">{{ template?.description }}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
              {{ template?.industry }}
            </span>
            <span class="text-xs text-muted-foreground">
              {{ Math.round(match.confidence * 100) }}% confidence
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Extracted Variables -->
    <div class="mb-6">
      <h4 class="font-semibold mb-3">Extracted Variables</h4>
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="(value, key) in extractedVariables"
          :key="key"
          class="p-3 border rounded-lg"
        >
          <div class="flex items-center gap-2 mb-1">
            <span
              class="w-3 h-3 rounded-full"
              :style="{ backgroundColor: getVariableColor(key) }"
            ></span>
            <span class="font-medium text-sm">{{ getVariableName(key) }}</span>
          </div>
          <div class="text-lg font-mono">{{ value }}</div>
          <div class="text-xs text-muted-foreground mt-1">
            Pattern: <code>{{ getVariablePattern(key) }}</code>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Folder Structure Mapping -->
    <div class="mb-6">
      <h4 class="font-semibold mb-3">Folder Structure Mapping</h4>
      <div class="space-y-2">
        <div
          v-for="pathMatch in match.matchedPaths"
          :key="pathMatch.path"
          class="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm">{{ getNodeTypeIcon(pathMatch.node.type) }}</span>
            <div>
              <div class="font-mono text-sm">{{ pathMatch.path }}</div>
              <div class="text-xs text-muted-foreground">
                Maps to: {{ pathMatch.node.name }}
                <span v-if="pathMatch.node.type !== 'fixed'" class="text-primary">
                  ({{ pathMatch.node.type }})
                </span>
              </div>
            </div>
          </div>
          
          <!-- Context Tags -->
          <div v-if="pathMatch.node.context?.tags?.length" class="flex flex-wrap gap-1">
            <span
              v-for="tag in pathMatch.node.context.tags"
              :key="tag"
              class="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Template Structure Preview -->
    <div class="mb-6">
      <h4 class="font-semibold mb-3">Template Structure</h4>
      <div class="border rounded-lg p-4 bg-muted/5">
        <TemplateStructureTree
          v-if="template?.structure"
          :node="template.structure"
          :extracted-variables="extractedVariables"
          :depth="0"
        />
      </div>
    </div>
    
    <!-- Application Preview -->
    <div class="mb-6">
      <h4 class="font-semibold mb-3">What Will Happen</h4>
      <div class="space-y-3">
        <div class="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span class="text-blue-600">🏷️</span>
          <div>
            <div class="font-medium text-blue-900">Auto-tagging</div>
            <div class="text-sm text-blue-700">
              {{ contextMappingsCount }} folders will be automatically tagged with {{ totalTagsCount }} tags
            </div>
          </div>
        </div>
        
        <div class="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <span class="text-green-600">🗂️</span>
          <div>
            <div class="font-medium text-green-900">Context Assignment</div>
            <div class="text-sm text-green-700">
              Folders will be categorized by production stage, media type, and workflow
            </div>
          </div>
        </div>
        
        <div class="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <span class="text-purple-600">🔍</span>
          <div>
            <div class="font-medium text-purple-900">Smart Search</div>
            <div class="text-sm text-purple-700">
              Files will be searchable by extracted variables: {{ Object.keys(extractedVariables).join(', ') }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t">
      <button
        @click="$emit('close')"
        class="px-4 py-2 border border-input rounded-md hover:bg-accent"
      >
        Cancel
      </button>
      <button
        @click="$emit('apply')"
        class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        ✅ Apply Template
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTemplateStore, type TemplateMatch } from '@/stores/templateStore'
import TemplateStructureTree from './TemplateStructureTree.vue'

interface Props {
  match: TemplateMatch
  template: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'apply': []
  'close': []
}>()

const { variables } = useTemplateStore()

// Computed
const extractedVariables = computed(() => {
  const vars: Record<string, string> = {}
  props.match.matchedPaths.forEach(pathMatch => {
    Object.assign(vars, pathMatch.variables)
  })
  return vars
})

const contextMappingsCount = computed(() => {
  return props.match.matchedPaths.filter(p => p.node.context).length
})

const totalTagsCount = computed(() => {
  return props.match.matchedPaths.reduce((total, p) => {
    return total + (p.node.context?.tags?.length || 0)
  }, 0)
})

// Methods
function getIndustryIcon(): string {
  const industryIcons = {
    film: '🎬',
    broadcast: '📺',
    commercial: '📽️',
    documentary: '🎥',
    custom: '📁'
  }
  
  return industryIcons[props.template?.industry as keyof typeof industryIcons] || '📁'
}

function getVariableName(varId: string): string {
  const variable = variables.value.find(v => v.id === varId)
  return variable?.name || varId
}

function getVariableColor(varId: string): string {
  const variable = variables.value.find(v => v.id === varId)
  return variable?.color || '#6B7280'
}

function getVariablePattern(varId: string): string {
  const variable = variables.value.find(v => v.id === varId)
  return variable?.pattern || ''
}

function getNodeTypeIcon(type: string): string {
  const icons = {
    fixed: '📌',
    variable: '🔤',
    pattern: '🔍'
  }
  return icons[type as keyof typeof icons] || '📁'
}
</script>

<style scoped>
.template-match-preview {
  max-height: calc(90vh - 200px);
  overflow-y: auto;
}
</style>