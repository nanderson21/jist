<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">Create Auto-Tagging Rule</h2>
            <p class="text-sm text-muted-foreground mt-1">
              Define patterns to automatically tag files as they're scanned
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
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Rule Configuration -->
          <div class="space-y-6">
            <div>
              <h3 class="font-semibold mb-4">Rule Configuration</h3>
              
              <!-- Rule Name -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Rule Name</label>
                <input
                  v-model="rule.name"
                  class="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="e.g., Capture Roll Detection"
                />
              </div>
              
              <!-- Description -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Description</label>
                <textarea
                  v-model="rule.description"
                  class="w-full px-3 py-2 border border-input rounded-md h-20 resize-none"
                  placeholder="Describe what this rule does..."
                ></textarea>
              </div>
              
              <!-- Pattern Type -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Match Against</label>
                <select
                  v-model="rule.patternType"
                  class="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="filename">File Name</option>
                  <option value="path">File Path</option>
                  <option value="content">File Content</option>
                </select>
              </div>
              
              <!-- Pattern -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Pattern (Regex)</label>
                <div class="space-y-2">
                  <input
                    v-model="rule.pattern"
                    class="w-full px-3 py-2 border border-input rounded-md font-mono text-sm"
                    :class="{ 'border-destructive': !isValidRegex }"
                    placeholder="e.g., ([A-Z])(\d{3})"
                  />
                  <div v-if="!isValidRegex" class="text-xs text-destructive">
                    Invalid regular expression
                  </div>
                  <div v-else-if="rule.pattern" class="text-xs text-muted-foreground">
                    {{ regexExplanation }}
                  </div>
                </div>
              </div>
              
              <!-- Quick Pattern Templates -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Quick Templates</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="template in patternTemplates"
                    :key="template.id"
                    @click="applyTemplate(template)"
                    class="p-2 text-xs border border-input rounded hover:bg-accent text-left"
                  >
                    <div class="font-medium">{{ template.name }}</div>
                    <div class="text-muted-foreground">{{ template.example }}</div>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Target Category & Tag Template -->
            <div>
              <h3 class="font-semibold mb-4">Tagging Configuration</h3>
              
              <!-- Category -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Target Category</label>
                <select
                  v-model="rule.categoryId"
                  class="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="">Select category...</option>
                  <option
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.icon }} {{ category.name }}
                  </option>
                </select>
              </div>
              
              <!-- Tag Template -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Tag Value Template</label>
                <input
                  v-model="rule.tagTemplate"
                  class="w-full px-3 py-2 border border-input rounded-md font-mono text-sm"
                  placeholder="e.g., {1}{2} or {1} or static-value"
                />
                <div class="text-xs text-muted-foreground">
                  Use {1}, {2}, etc. to reference regex capture groups
                </div>
              </div>
              
              <!-- Priority -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Priority</label>
                <select
                  v-model="rule.priority"
                  class="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option :value="100">High (100)</option>
                  <option :value="50">Medium (50)</option>
                  <option :value="10">Low (10)</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- Preview & Testing -->
          <div class="space-y-6">
            <div>
              <h3 class="font-semibold mb-4">Pattern Testing</h3>
              
              <!-- Test Input -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Test Input</label>
                <input
                  v-model="testInput"
                  class="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="Enter a filename or path to test..."
                />
              </div>
              
              <!-- Test Results -->
              <div v-if="testInput" class="space-y-3">
                <div class="p-3 border rounded-md">
                  <div class="text-sm font-medium mb-2">Match Result:</div>
                  <div v-if="testMatch" class="space-y-2">
                    <div class="text-sm text-green-600">✅ Pattern matches!</div>
                    
                    <!-- Show capture groups -->
                    <div v-if="testMatch.length > 1">
                      <div class="text-xs font-medium text-muted-foreground mb-1">Capture Groups:</div>
                      <div class="space-y-1">
                        <div
                          v-for="(group, index) in testMatch.slice(1)"
                          :key="index"
                          class="text-xs font-mono bg-muted p-1 rounded"
                        >
                          {{ '{' + (index + 1) + '}' }}: "{{ group }}"
                        </div>
                      </div>
                    </div>
                    
                    <!-- Generated Tag -->
                    <div v-if="generatedTag">
                      <div class="text-xs font-medium text-muted-foreground mb-1">Generated Tag:</div>
                      <div class="text-sm font-medium text-primary">{{ generatedTag }}</div>
                    </div>
                  </div>
                  <div v-else class="text-sm text-muted-foreground">❌ No match</div>
                </div>
              </div>
              
              <!-- Sample Files Preview -->
              <div v-if="selectedNode && sampleFiles.length > 0">
                <div class="text-sm font-medium mb-2">Sample Files in Selected Folder:</div>
                <div class="max-h-40 overflow-auto space-y-1">
                  <div
                    v-for="file in sampleFiles.slice(0, 10)"
                    :key="file.name"
                    class="text-xs p-2 bg-muted/20 rounded flex items-center justify-between"
                  >
                    <span class="font-mono">{{ file.name }}</span>
                    <span
                      v-if="testPatternOnFile(file)"
                      class="text-green-600 text-xs"
                    >
                      ✅ Match
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Common Patterns Reference -->
            <div>
              <h3 class="font-semibold mb-4">Common Patterns</h3>
              <div class="space-y-2 text-xs">
                <div class="p-2 bg-muted/20 rounded">
                  <div class="font-mono">([A-Z])(\d{3})</div>
                  <div class="text-muted-foreground">Captures: A001, B002, C003</div>
                </div>
                <div class="p-2 bg-muted/20 rounded">
                  <div class="font-mono">(\d{4})[-_](\d{2})[-_](\d{2})</div>
                  <div class="text-muted-foreground">Captures: 2024-03-15, 2024_03_15</div>
                </div>
                <div class="p-2 bg-muted/20 rounded">
                  <div class="font-mono">\.(R3D|mov|mp4)$</div>
                  <div class="text-muted-foreground">Matches file extensions</div>
                </div>
                <div class="p-2 bg-muted/20 rounded">
                  <div class="font-mono">([A-Z]\d{3})_([A-Z]\d{3})</div>
                  <div class="text-muted-foreground">Captures: A001_C001, B002_C015</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-6 border-t flex items-center justify-between">
        <div class="flex items-center gap-2">
          <input
            v-model="rule.active"
            type="checkbox"
            id="active-rule"
            class="rounded"
          />
          <label for="active-rule" class="text-sm">
            Enable rule immediately
          </label>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="$emit('close')"
            class="px-4 py-2 border border-input rounded-md hover:bg-accent"
          >
            Cancel
          </button>
          <button
            @click="createRule"
            :disabled="!canCreateRule"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Create Rule
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  categories: any[]
  selectedNode?: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'rule-created': [rule: any]
  'close': []
}>()

// Rule state
const rule = ref({
  name: '',
  description: '',
  pattern: '',
  patternType: 'filename' as 'path' | 'filename' | 'content',
  categoryId: '',
  tagTemplate: '',
  priority: 50,
  active: true
})

// Testing state
const testInput = ref('')

// Pattern templates
const patternTemplates = [
  {
    id: 'capture-roll',
    name: 'Capture Roll',
    pattern: '([A-Z])(\d{3})',
    template: '{1}{2}',
    example: 'A001, B002'
  },
  {
    id: 'red-naming',
    name: 'RED Standard',
    pattern: '([A-Z]\\d{3})_([A-Z]\\d{3})_(\\d{8})_(\\d{3})',
    template: '{1}_{2}',
    example: 'A001_C001_20240315_001'
  },
  {
    id: 'date-pattern',
    name: 'Date Pattern',
    pattern: '(\\d{4})[-_](\\d{2})[-_](\\d{2})',
    template: '{1}-{2}-{3}',
    example: '2024-03-15'
  },
  {
    id: 'clip-sequence',
    name: 'Clip Sequence',
    pattern: '[A-Z]\\d{3}_([C])(\\d{3})',
    template: '{1}{2}',
    example: 'C001, C002'
  },
  {
    id: 'camera-unit',
    name: 'Camera Unit',
    pattern: '(cam|camera)[-_]?([A-Z]\\d*)',
    template: 'Camera {2}',
    example: 'cam-A, camera-1'
  },
  {
    id: 'resolution',
    name: 'Resolution',
    pattern: '(\\d+[kK]|HD|UHD|4K|8K)',
    template: '{1}',
    example: '4K, 8K, HD'
  }
]

// Computed properties
const isValidRegex = computed(() => {
  if (!rule.value.pattern) return true
  try {
    new RegExp(rule.value.pattern)
    return true
  } catch {
    return false
  }
})

const regexExplanation = computed(() => {
  if (!rule.value.pattern || !isValidRegex.value) return ''
  
  const pattern = rule.value.pattern
  let explanation = 'Matches: '
  
  if (pattern.includes('[A-Z]')) explanation += 'uppercase letters, '
  if (pattern.includes('\\d')) explanation += 'digits, '
  if (pattern.includes('(')) explanation += 'with capture groups'
  
  return explanation.replace(/, $/, '')
})

const testMatch = computed(() => {
  if (!testInput.value || !rule.value.pattern || !isValidRegex.value) return null
  
  try {
    const regex = new RegExp(rule.value.pattern, 'i')
    return testInput.value.match(regex)
  } catch {
    return null
  }
})

const generatedTag = computed(() => {
  if (!testMatch.value || !rule.value.tagTemplate) return ''
  
  return rule.value.tagTemplate.replace(/\{(\d+)\}/g, (_, group) => {
    const groupIndex = parseInt(group)
    return testMatch.value?.[groupIndex] || ''
  })
})

const sampleFiles = computed(() => {
  if (!props.selectedNode || !props.selectedNode.files) return []
  return props.selectedNode.files.slice(0, 20)
})

const canCreateRule = computed(() => {
  return rule.value.name &&
         rule.value.pattern &&
         isValidRegex.value &&
         rule.value.categoryId &&
         rule.value.tagTemplate
})

// Methods
function applyTemplate(template: any) {
  rule.value.pattern = template.pattern
  rule.value.tagTemplate = template.template
  if (!rule.value.name) {
    rule.value.name = `${template.name} Auto-Tagging`
  }
  if (!rule.value.description) {
    rule.value.description = `Automatically tags files matching ${template.name} pattern`
  }
}

function testPatternOnFile(file: any): boolean {
  if (!rule.value.pattern || !isValidRegex.value) return false
  
  try {
    const regex = new RegExp(rule.value.pattern, 'i')
    const testValue = rule.value.patternType === 'path' ? file.path : file.name
    return regex.test(testValue)
  } catch {
    return false
  }
}

function createRule() {
  if (!canCreateRule.value) return
  
  emit('rule-created', {
    ...rule.value,
    id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date()
  })
}

// Auto-populate rule name if using selected node
if (props.selectedNode && !rule.value.name) {
  rule.value.name = `${props.selectedNode.name} Pattern Rule`
}
</script>

<style scoped>
/* Add any specific styles here */
</style>