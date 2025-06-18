<template>
  <div class="template-builder h-full flex flex-col bg-background">
    <!-- Header -->
    <div class="border-b p-4">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-xl font-semibold">Template Builder</h2>
          <p class="text-sm text-muted-foreground">
            Select folders and mark variables to create reusable project templates
          </p>
        </div>
        
        <div class="flex items-center gap-2">
          <select
            v-model="selectedTemplateId"
            class="px-3 py-1 text-sm border border-input rounded"
            @change="loadTemplate"
          >
            <option value="">New Template</option>
            <option
              v-for="template in templates"
              :key="template.id"
              :value="template.id"
            >
              {{ template.name }}
            </option>
          </select>
          
          <button
            @click="showVariableManager = true"
            class="px-3 py-1 text-sm border border-input rounded hover:bg-accent"
          >
            🔤 Variables
          </button>
          
          <button
            @click="saveTemplate"
            :disabled="!canSave"
            class="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            💾 Save Template
          </button>
        </div>
      </div>
      
      <!-- Template Info -->
      <div v-if="currentTemplate.name" class="grid grid-cols-3 gap-3">
        <div>
          <label class="text-xs font-medium text-muted-foreground">Template Name</label>
          <input
            v-model="currentTemplate.name"
            class="w-full mt-1 px-2 py-1 text-sm border border-input rounded"
            placeholder="e.g., RED Camera Production"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground">Industry</label>
          <select
            v-model="currentTemplate.industry"
            class="w-full mt-1 px-2 py-1 text-sm border border-input rounded"
          >
            <option value="film">Film</option>
            <option value="broadcast">Broadcast</option>
            <option value="commercial">Commercial</option>
            <option value="documentary">Documentary</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground">Description</label>
          <input
            v-model="currentTemplate.description"
            class="w-full mt-1 px-2 py-1 text-sm border border-input rounded"
            placeholder="Brief description..."
          />
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: File Browser with Selection -->
      <div class="w-1/2 border-r flex flex-col">
        <div class="p-3 border-b bg-muted/20">
          <h3 class="text-sm font-medium">Select Project Structure</h3>
          <p class="text-xs text-muted-foreground mt-1">
            Click folders to select them for the template
          </p>
        </div>
        
        <div class="flex-1 overflow-auto p-3">
          <TemplateTreeNode
            v-for="node in hierarchyNodes"
            :key="node.id"
            :node="node"
            :selected-paths="selectedPaths"
            :depth="0"
            @toggle-selection="togglePathSelection"
            @add-variable="showVariableSelector"
          />
        </div>
      </div>
      
      <!-- Right: Template Preview -->
      <div class="w-1/2 flex flex-col">
        <div class="p-3 border-b bg-muted/20">
          <h3 class="text-sm font-medium">Template Structure</h3>
          <p class="text-xs text-muted-foreground mt-1">
            Preview how your template will match folders
          </p>
        </div>
        
        <div class="flex-1 overflow-auto p-3">
          <div v-if="templateStructure" class="space-y-1">
            <TemplatePreviewNode
              :node="templateStructure"
              :variables="variables"
              :depth="0"
            />
          </div>
          
          <div v-else class="text-center text-muted-foreground py-8">
            Select folders to build your template
          </div>
        </div>
        
        <!-- Test Template -->
        <div class="border-t p-3">
          <h4 class="text-sm font-medium mb-2">Test Template</h4>
          <input
            v-model="testPath"
            class="w-full px-3 py-2 text-sm border border-input rounded"
            placeholder="Enter a path to test matching..."
            @input="testTemplateMatch"
          />
          
          <div v-if="testResult" class="mt-2 p-2 bg-muted rounded text-sm">
            <div v-if="testResult.matches" class="text-green-600">
              ✅ Matches! Extracted variables:
              <div class="mt-1 space-y-1">
                <div
                  v-for="(value, key) in testResult.variables"
                  :key="key"
                  class="text-xs"
                >
                  <span class="font-medium">{{ key }}:</span> {{ value }}
                </div>
              </div>
            </div>
            <div v-else class="text-red-600">
              ❌ No match
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Variable Manager Modal -->
    <VariableManagerModal
      v-if="showVariableManager"
      :variables="variables"
      @variable-created="handleVariableCreated"
      @variable-updated="handleVariableUpdated"
      @close="showVariableManager = false"
    />
    
    <!-- Variable Selector Popover -->
    <div
      v-if="variableSelector.show"
      class="fixed bg-background border rounded-lg shadow-lg p-3 z-50"
      :style="{ left: variableSelector.x + 'px', top: variableSelector.y + 'px' }"
    >
      <h4 class="text-sm font-medium mb-2">Select Variable</h4>
      <div class="space-y-1">
        <button
          v-for="variable in variables"
          :key="variable.id"
          @click="applyVariable(variable)"
          class="w-full text-left px-2 py-1 text-sm hover:bg-accent rounded flex items-center gap-2"
        >
          <span
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: variable.color }"
          ></span>
          <span>{{ variable.name }}</span>
          <span class="text-xs text-muted-foreground">{{ variable.pattern }}</span>
        </button>
      </div>
      
      <button
        @click="variableSelector.show = false"
        class="mt-2 w-full px-2 py-1 text-sm text-muted-foreground hover:bg-accent rounded"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTemplateStore } from '@/stores/templateStore'
import TemplateTreeNode from './TemplateTreeNode.vue'
import TemplatePreviewNode from './TemplatePreviewNode.vue'
import VariableManagerModal from './VariableManagerModal.vue'

interface Props {
  hierarchyNodes: any[]
}

const props = defineProps<Props>()

const {
  templates,
  variables,
  createTemplateFromSelection,
  updateTemplate,
  matchPath
} = useTemplateStore()

// State
const selectedTemplateId = ref('')
const currentTemplate = ref({
  name: '',
  description: '',
  industry: 'custom' as const
})

const selectedPaths = ref<Map<string, {
  path: string
  node: any
  variables: Array<{
    start: number
    end: number
    variableId: string
    variableName: string
  }>
}>>(new Map())

const showVariableManager = ref(false)
const variableSelector = ref({
  show: false,
  x: 0,
  y: 0,
  path: '',
  selection: { start: 0, end: 0 }
})

const testPath = ref('')
const testResult = ref<any>(null)

// Computed
const templateStructure = computed(() => {
  if (selectedPaths.value.size === 0) return null
  
  // Build template structure from selected paths
  return buildStructureFromPaths()
})

const canSave = computed(() => {
  return currentTemplate.value.name && selectedPaths.value.size > 0
})

// Methods
function togglePathSelection(node: any, path: string) {
  if (selectedPaths.value.has(path)) {
    selectedPaths.value.delete(path)
  } else {
    selectedPaths.value.set(path, {
      path,
      node,
      variables: []
    })
  }
}

function showVariableSelector(event: MouseEvent, path: string, selection: { start: number; end: number }) {
  variableSelector.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    path,
    selection
  }
}

function applyVariable(variable: any) {
  const pathData = selectedPaths.value.get(variableSelector.value.path)
  if (pathData) {
    pathData.variables.push({
      ...variableSelector.value.selection,
      variableId: variable.id,
      variableName: variable.name
    })
  }
  variableSelector.value.show = false
}

function buildStructureFromPaths() {
  // This is a simplified version - in reality, you'd build a proper tree
  const root: any = {
    id: 'root',
    name: 'Project Root',
    type: 'variable',
    variables: ['projectName'],
    children: []
  }
  
  // Group paths by hierarchy and build tree
  const pathArray = Array.from(selectedPaths.value.values())
  
  // TODO: Implement sophisticated tree building algorithm
  
  return root
}

function loadTemplate() {
  if (selectedTemplateId.value) {
    const template = templates.value.find(t => t.id === selectedTemplateId.value)
    if (template) {
      currentTemplate.value = {
        name: template.name,
        description: template.description,
        industry: template.industry
      }
      // TODO: Load template structure into selectedPaths
    }
  } else {
    // Reset for new template
    currentTemplate.value = {
      name: '',
      description: '',
      industry: 'custom'
    }
    selectedPaths.value.clear()
  }
}

function saveTemplate() {
  if (!canSave.value) return
  
  const pathsArray = Array.from(selectedPaths.value.values()).map(p => ({
    path: p.path,
    variables: p.variables
  }))
  
  if (selectedTemplateId.value) {
    // Update existing
    updateTemplate(selectedTemplateId.value, {
      ...currentTemplate.value,
      structure: templateStructure.value
    })
  } else {
    // Create new
    const newTemplate = createTemplateFromSelection(
      currentTemplate.value.name,
      currentTemplate.value.description,
      pathsArray,
      currentTemplate.value.industry
    )
    selectedTemplateId.value = newTemplate.id
  }
}

function testTemplateMatch() {
  if (!testPath.value || !templateStructure.value) {
    testResult.value = null
    return
  }
  
  const result = matchPath(testPath.value, templateStructure.value, variables.value)
  testResult.value = {
    matches: result.matches,
    variables: result.extracted
  }
}

function handleVariableCreated(variable: any) {
  // Variable will be added to store by the modal
}

function handleVariableUpdated(variable: any) {
  // Variable will be updated in store by the modal
}

// Initialize
onMounted(() => {
  useTemplateStore().initializeDefaults()
})
</script>

<style scoped>
.template-builder {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>