<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">Variable Manager</h2>
            <p class="text-sm text-muted-foreground mt-1">
              Define variables for pattern matching in folder names
            </p>
          </div>
          <button
            @click="$emit('close')"
            class="p-2 hover:bg-accent rounded-full"
          >
            ✕
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="p-6 overflow-auto max-h-[calc(90vh-180px)]">
        <!-- New Variable Form -->
        <div class="border rounded-lg p-4 mb-6">
          <h3 class="font-semibold mb-4">{{ editingVariable ? 'Edit' : 'Create New' }} Variable</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium">Name</label>
              <input
                v-model="newVariable.name"
                class="w-full mt-1 px-3 py-2 border border-input rounded-md"
                placeholder="e.g., Capture Roll"
              />
            </div>
            
            <div>
              <label class="text-sm font-medium">Color</label>
              <div class="flex mt-1 gap-2">
                <input
                  v-model="newVariable.color"
                  type="color"
                  class="w-12 h-10 border border-input rounded-md"
                />
                <select
                  v-model="newVariable.color"
                  class="flex-1 px-3 py-2 border border-input rounded-md"
                >
                  <option v-for="color in predefinedColors" :key="color.value" :value="color.value">
                    {{ color.name }}
                  </option>
                </select>
              </div>
            </div>
            
            <div class="col-span-2">
              <label class="text-sm font-medium">Description</label>
              <input
                v-model="newVariable.description"
                class="w-full mt-1 px-3 py-2 border border-input rounded-md"
                placeholder="What this variable represents..."
              />
            </div>
            
            <div class="col-span-2">
              <label class="text-sm font-medium">Pattern (Regex)</label>
              <input
                v-model="newVariable.pattern"
                class="w-full mt-1 px-3 py-2 border border-input rounded-md font-mono text-sm"
                :class="{ 'border-destructive': !isValidPattern }"
                placeholder="e.g., [A-Z]\\d{3}"
              />
              <div v-if="!isValidPattern" class="text-xs text-destructive mt-1">
                Invalid regular expression
              </div>
            </div>
            
            <div class="col-span-2">
              <label class="text-sm font-medium">Examples</label>
              <div class="mt-1">
                <div class="flex flex-wrap gap-2 mb-2">
                  <span
                    v-for="(example, index) in newVariable.examples"
                    :key="index"
                    class="px-2 py-1 bg-muted rounded text-sm flex items-center gap-1"
                  >
                    {{ example }}
                    <button
                      @click="removeExample(index)"
                      class="w-4 h-4 hover:bg-destructive/20 rounded text-destructive"
                    >
                      ×
                    </button>
                  </span>
                </div>
                <div class="flex gap-2">
                  <input
                    v-model="newExample"
                    class="flex-1 px-3 py-2 border border-input rounded-md"
                    placeholder="Add example..."
                    @keyup.enter="addExample"
                  />
                  <button
                    @click="addExample"
                    class="px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Pattern Testing -->
          <div class="mt-4 p-3 bg-muted/20 rounded-lg">
            <h4 class="text-sm font-medium mb-2">Test Pattern</h4>
            <input
              v-model="testInput"
              class="w-full px-3 py-2 border border-input rounded-md"
              placeholder="Enter text to test the pattern..."
            />
            
            <div v-if="testInput" class="mt-2">
              <div v-if="patternMatches" class="text-sm text-green-600">
                ✅ Pattern matches: "{{ patternMatches[0] }}"
                <div v-if="patternMatches.length > 1" class="text-xs mt-1">
                  Capture groups: {{ patternMatches.slice(1).join(', ') }}
                </div>
              </div>
              <div v-else class="text-sm text-red-600">
                ❌ Pattern does not match
              </div>
            </div>
          </div>
          
          <div class="mt-4 flex justify-end gap-3">
            <button
              v-if="editingVariable"
              @click="cancelEdit"
              class="px-4 py-2 border border-input rounded-md hover:bg-accent"
            >
              Cancel
            </button>
            <button
              @click="saveVariable"
              :disabled="!canSave"
              class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {{ editingVariable ? 'Update' : 'Create' }} Variable
            </button>
          </div>
        </div>
        
        <!-- Existing Variables -->
        <div>
          <h3 class="font-semibold mb-4">Existing Variables</h3>
          
          <div class="grid grid-cols-1 gap-3">
            <div
              v-for="variable in variables"
              :key="variable.id"
              class="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span
                    class="w-4 h-4 rounded-full"
                    :style="{ backgroundColor: variable.color }"
                  ></span>
                  <div>
                    <div class="font-medium">{{ variable.name }}</div>
                    <div class="text-sm text-muted-foreground">{{ variable.description }}</div>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <button
                    @click="editVariable(variable)"
                    class="p-2 hover:bg-accent rounded"
                    title="Edit variable"
                  >
                    ✏️
                  </button>
                  <button
                    @click="deleteVariable(variable.id)"
                    class="p-2 hover:bg-destructive/20 rounded text-destructive"
                    title="Delete variable"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div class="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-muted-foreground">Pattern:</span>
                  <code class="ml-2 px-2 py-1 bg-muted rounded font-mono text-xs">{{ variable.pattern }}</code>
                </div>
                <div>
                  <span class="text-muted-foreground">Examples:</span>
                  <span class="ml-2">{{ variable.examples.slice(0, 3).join(', ') }}</span>
                  <span v-if="variable.examples.length > 3" class="text-muted-foreground">...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTemplateStore } from '@/stores/templateStore'

interface Props {
  variables: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'variable-created': [variable: any]
  'variable-updated': [variable: any]
  'close': []
}>()

const { createVariable, updateVariable } = useTemplateStore()

// State
const editingVariable = ref<any>(null)
const newVariable = ref({
  name: '',
  pattern: '',
  description: '',
  examples: [] as string[],
  color: '#3B82F6'
})
const newExample = ref('')
const testInput = ref('')

// Predefined colors
const predefinedColors = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Gray', value: '#6B7280' }
]

// Computed
const isValidPattern = computed(() => {
  if (!newVariable.value.pattern) return true
  try {
    new RegExp(newVariable.value.pattern)
    return true
  } catch {
    return false
  }
})

const patternMatches = computed(() => {
  if (!testInput.value || !newVariable.value.pattern || !isValidPattern.value) return null
  
  try {
    const regex = new RegExp(newVariable.value.pattern, 'g')
    const matches = testInput.value.match(regex)
    return matches
  } catch {
    return null
  }
})

const canSave = computed(() => {
  return newVariable.value.name.trim() && 
         newVariable.value.pattern.trim() && 
         isValidPattern.value
})

// Methods
function addExample() {
  if (newExample.value.trim()) {
    newVariable.value.examples.push(newExample.value.trim())
    newExample.value = ''
  }
}

function removeExample(index: number) {
  newVariable.value.examples.splice(index, 1)
}

function editVariable(variable: any) {
  editingVariable.value = variable
  newVariable.value = {
    name: variable.name,
    pattern: variable.pattern,
    description: variable.description,
    examples: [...variable.examples],
    color: variable.color
  }
}

function cancelEdit() {
  editingVariable.value = null
  resetForm()
}

function saveVariable() {
  if (!canSave.value) return
  
  const variableData = {
    name: newVariable.value.name.trim(),
    pattern: newVariable.value.pattern.trim(),
    description: newVariable.value.description.trim(),
    examples: newVariable.value.examples,
    color: newVariable.value.color
  }
  
  if (editingVariable.value) {
    // Update existing
    updateVariable(editingVariable.value.id, variableData)
    emit('variable-updated', { ...editingVariable.value, ...variableData })
    editingVariable.value = null
  } else {
    // Create new
    const newVar = createVariable(variableData)
    emit('variable-created', newVar)
  }
  
  resetForm()
}

function deleteVariable(id: string) {
  if (confirm('Delete this variable? This cannot be undone.')) {
    // TODO: Implement delete in store
    console.log('Delete variable:', id)
  }
}

function resetForm() {
  newVariable.value = {
    name: '',
    pattern: '',
    description: '',
    examples: [],
    color: '#3B82F6'
  }
  testInput.value = ''
}
</script>

<style scoped>
/* Add any specific styles here */
</style>