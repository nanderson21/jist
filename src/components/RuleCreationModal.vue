<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-background border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-auto">
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Create Ingest Rule</h2>
          <Button @click="$emit('cancel')" variant="ghost" size="sm">✕</Button>
        </div>
        
        <!-- Selected Text -->
        <div class="space-y-2">
          <div class="text-sm font-medium">Selected Text</div>
          <div class="p-3 bg-primary/10 rounded border font-mono text-sm break-all">
            "{{ selectedText }}"
          </div>
        </div>
        
        <!-- Context -->
        <div v-if="fileContext" class="space-y-2">
          <div class="text-sm font-medium">File Context</div>
          <div class="text-xs text-muted-foreground font-mono break-all">
            {{ fileContext.path }}
          </div>
        </div>
        
        <!-- Separator Info -->
        <div v-if="isSeparatorRule" class="space-y-2">
          <div class="text-sm font-medium">Separator Rule</div>
          <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
            <div class="text-xs space-y-1">
              <div><strong>Parent segment:</strong> "{{ ruleData?.variable?.parentSegment }}"</div>
              <div><strong>Split by:</strong> "{{ ruleData?.variable?.separator }}"</div>
              <div><strong>Extract part:</strong> {{ ruleData?.variable?.segmentIndex + 1 }} → "{{ selectedText }}"</div>
            </div>
          </div>
        </div>
        
        <!-- Rule Configuration -->
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Rule Name</label>
            <input 
              v-model="ruleName" 
              type="text" 
              class="w-full p-2 border rounded"
              placeholder="e.g., 'Shoot Day Pattern'"
            />
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium">Description</label>
            <textarea 
              v-model="ruleDescription" 
              class="w-full p-2 border rounded h-20"
              placeholder="Describe what this rule does..."
            ></textarea>
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium">Variable Name</label>
            <input 
              v-model="variableName" 
              type="text" 
              class="w-full p-2 border rounded"
              placeholder="e.g., 'shootDay', 'captureRoll'"
            />
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium">Pattern Type</label>
            <select v-model="patternType" class="w-full p-2 border rounded">
              <option value="positional">Positional Variable (Recommended)</option>
              <option value="regex">Pattern Match</option>
              <option value="contains">Contains Text</option>
              <option value="exact">Exact Match</option>
            </select>
            
            <!-- Pattern explanation -->
            <div class="text-xs text-muted-foreground">
              <div v-if="patternType === 'positional'">
                Captures any value at this position in the path structure
              </div>
              <div v-else-if="patternType === 'regex'">
                Uses pattern matching to validate and capture values
              </div>
              <div v-else-if="patternType === 'contains'">
                Matches files whose paths contain this text
              </div>
              <div v-else>
                Matches files with exactly this text
              </div>
            </div>
          </div>
          
          <!-- Preview -->
          <div class="space-y-2">
            <div class="text-sm font-medium">Preview</div>
            <div class="p-3 bg-muted/20 rounded border text-sm">
              <div><strong>Pattern:</strong> {{ previewPattern }}</div>
              <div><strong>Variable:</strong> {{ variableName || '(unnamed)' }}</div>
              <div v-if="fileContext"><strong>Would extract:</strong> "{{ extractedValue }}"</div>
            </div>
          </div>
          
          <!-- Affected Files Preview -->
          <div class="space-y-2">
            <div class="text-sm font-medium">This rule would affect:</div>
            <div class="text-xs text-muted-foreground max-h-32 overflow-auto">
              <div v-for="example in affectedExamples" :key="example" class="font-mono">
                {{ example }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex gap-2 justify-end">
          <Button @click="$emit('cancel')" variant="outline">Cancel</Button>
          <Button @click="createRule" :disabled="!canCreateRule">Create Rule</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { FileNode, IngestRule, PathPattern, CustomVariable } from '@/types'
import Button from '@/components/ui/button.vue'

interface Props {
  selectedText: string
  fileContext?: FileNode | null
  ruleData?: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'rule-created': [rule: IngestRule]
  'cancel': []
}>()

const ruleName = ref('')
const ruleDescription = ref('')
const variableName = ref('')
const patternType = ref<'exact' | 'contains' | 'regex' | 'positional'>('positional')

// Initialize with smart defaults from rule data
onMounted(() => {
  if (props.ruleData?.variable) {
    variableName.value = props.ruleData.variable.suggestedName || ''
    ruleDescription.value = props.ruleData.variable.description || ''
    
    if (props.ruleData.variable.type === 'positional-pattern') {
      patternType.value = 'regex'
      ruleName.value = `${props.ruleData.variable.suggestedName} Pattern`
    } else {
      patternType.value = 'positional'
      ruleName.value = `${props.ruleData.variable.suggestedName} Variable`
    }
  }
})

const isSeparatorRule = computed(() => 
  props.ruleData?.variable?.type === 'separator-split' || props.ruleData?.variable?.type === 'filename-split'
)

const previewPattern = computed(() => {
  switch (patternType.value) {
    case 'positional':
      return createPositionalPattern()
    case 'regex':
      return props.ruleData?.variable?.pattern || 
             props.selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    case 'contains':
      return `*${props.selectedText}*`
    case 'exact':
      return props.selectedText
    default:
      return props.selectedText
  }
})

function createPositionalPattern(): string {
  if (!props.ruleData?.pathStructure) {
    return `{${variableName.value || 'variable'}}`
  }
  
  const { pathParts, segmentIndex } = props.ruleData.pathStructure
  const patternParts = [...pathParts]
  
  // Replace the selected segment with a variable placeholder
  patternParts[segmentIndex] = `{${variableName.value || 'variable'}}`
  
  return '/' + patternParts.join('/')
}

const extractedValue = computed(() => {
  if (!props.fileContext) return ''
  
  switch (patternType.value) {
    case 'positional':
      return props.selectedText // The selected text is the example value at this position
    case 'exact':
      return props.fileContext.path.includes(props.selectedText) ? props.selectedText : ''
    case 'regex':
      return props.selectedText
    default:
      return props.selectedText
  }
})

const affectedExamples = computed(() => {
  // Mock examples - in real app, this would scan the actual file tree
  const examples = [
    'project/2024-03-15_shoot/A001_C001.mp4',
    'project/2024-03-15_shoot/A002_C001.mp4',
    'project/2024-03-16_shoot/A001_C001.mp4'
  ]
  
  return examples.filter(path => 
    patternType.value === 'contains' ? 
      path.includes(props.selectedText) :
      path === props.selectedText
  ).slice(0, 5)
})

const canCreateRule = computed(() => 
  ruleName.value.trim() && variableName.value.trim() && props.selectedText
)

function createRule() {
  if (!canCreateRule.value) return
  
  // Create pattern based on type
  let pathPattern: PathPattern
  
  if (patternType.value === 'positional' && props.ruleData?.pathStructure) {
    pathPattern = {
      level: props.ruleData.pathStructure.segmentIndex,
      pattern: previewPattern.value,
      isRegex: false,
      flags: ['positional']
    }
  } else if (patternType.value === 'regex') {
    pathPattern = {
      level: 0,
      pattern: previewPattern.value,
      isRegex: true,
      flags: []
    }
  } else {
    pathPattern = {
      level: 0,
      pattern: previewPattern.value,
      isRegex: false,
      flags: []
    }
  }
  
  // Create variable extraction config
  const variable: CustomVariable = {
    name: variableName.value,
    source: 'path',
    extraction: patternType.value === 'positional' 
      ? `position:${props.ruleData?.pathStructure?.segmentIndex || 0}`
      : props.selectedText
  }
  
  const rule: IngestRule = {
    id: Date.now().toString(),
    name: ruleName.value,
    description: ruleDescription.value,
    pathPatterns: [pathPattern],
    variables: [variable],
    actions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  emit('rule-created', rule)
}
</script>