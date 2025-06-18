<template>
  <div class="metadata-rule-builder bg-background border rounded-lg">
    <!-- Header -->
    <div class="p-4 border-b">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <h3 class="text-lg font-semibold">Metadata-Based Ingest Rule</h3>
          <p class="text-sm text-muted-foreground">
            Create rules that automatically extract metadata during file scans
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="loadPreset('media-production')"
            class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🎬 Media Preset
          </button>
          <button
            @click="$emit('close')"
            class="p-1 hover:bg-accent rounded"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <div class="p-4 space-y-6">
      <!-- Rule Basic Info -->
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium">Rule Name</label>
          <input
            v-model="rule.name"
            class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
            placeholder="e.g., Professional Video Metadata Extraction"
          />
        </div>
        
        <div>
          <label class="text-sm font-medium">Description</label>
          <textarea
            v-model="rule.description"
            class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm resize-none"
            rows="2"
            placeholder="Describe when and how this rule should be applied..."
          ></textarea>
        </div>
      </div>

      <!-- Trigger Conditions -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold">Trigger Conditions</h4>
          <button
            @click="addCondition"
            class="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            + Add Condition
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(condition, index) in rule.conditions"
            :key="index"
            class="p-3 border rounded-md space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Condition {{ index + 1 }}</span>
              <button
                @click="removeCondition(index)"
                class="p-1 text-destructive hover:bg-destructive/10 rounded"
              >
                🗑️
              </button>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-muted-foreground">Type</label>
                <select
                  v-model="condition.type"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                >
                  <option value="file_extension">File Extension</option>
                  <option value="file_path">File Path</option>
                  <option value="file_size">File Size</option>
                  <option value="metadata_property">Metadata Property</option>
                  <option value="metadata_exists">Metadata Exists</option>
                </select>
              </div>

              <div v-if="condition.type === 'metadata_property' || condition.type === 'metadata_exists'">
                <label class="text-xs text-muted-foreground">Property Key</label>
                <input
                  v-model="condition.property"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                  placeholder="e.g., codec, duration, camera_model"
                />
              </div>

              <div v-else>
                <label class="text-xs text-muted-foreground">Target</label>
                <input
                  v-model="condition.target"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                  :placeholder="getConditionTargetPlaceholder(condition.type)"
                />
              </div>

              <div>
                <label class="text-xs text-muted-foreground">Operator</label>
                <select
                  v-model="condition.operator"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="starts_with">Starts With</option>
                  <option value="ends_with">Ends With</option>
                  <option value="regex">Regex Match</option>
                  <option v-if="condition.type === 'file_size' || condition.type === 'metadata_property'" value="greater_than">Greater Than</option>
                  <option v-if="condition.type === 'file_size' || condition.type === 'metadata_property'" value="less_than">Less Than</option>
                  <option v-if="condition.type === 'metadata_exists'" value="exists">Exists</option>
                </select>
              </div>
            </div>

            <div v-if="condition.operator !== 'exists'">
              <label class="text-xs text-muted-foreground">Value</label>
              <input
                v-model="condition.value"
                class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                :placeholder="getConditionValuePlaceholder(condition)"
              />
            </div>

            <div class="flex items-center gap-4 text-xs">
              <label class="flex items-center gap-1">
                <input
                  v-model="condition.caseSensitive"
                  type="checkbox"
                  class="rounded"
                />
                Case Sensitive
              </label>
              <label class="flex items-center gap-1">
                <input
                  v-model="condition.required"
                  type="checkbox"
                  class="rounded"
                />
                Required
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Metadata Extraction Actions -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold">Metadata Extraction Actions</h4>
          <button
            @click="addAction"
            class="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            + Add Action
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(action, index) in rule.actions"
            :key="index"
            class="p-3 border rounded-md space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Action {{ index + 1 }}</span>
              <button
                @click="removeAction(index)"
                class="p-1 text-destructive hover:bg-destructive/10 rounded"
              >
                🗑️
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-muted-foreground">Action Type</label>
                <select
                  v-model="action.type"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                >
                  <option value="extract_metadata">Extract Metadata</option>
                  <option value="set_property">Set Property</option>
                  <option value="create_hierarchy">Create Hierarchy</option>
                  <option value="copy_property">Copy Property</option>
                  <option value="transform_property">Transform Property</option>
                </select>
              </div>

              <div>
                <label class="text-xs text-muted-foreground">Priority</label>
                <select
                  v-model="action.priority"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                >
                  <option value="1">High</option>
                  <option value="2">Medium</option>
                  <option value="3">Low</option>
                </select>
              </div>
            </div>

            <!-- Action-specific configuration -->
            <div v-if="action.type === 'set_property'" class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-muted-foreground">Property Name</label>
                <input
                  v-model="action.targetProperty"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                  placeholder="e.g., project_name, camera_type"
                />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Value/Source</label>
                <input
                  v-model="action.value"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                  placeholder="Static value or {property_name}"
                />
              </div>
            </div>

            <div v-if="action.type === 'copy_property'" class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-muted-foreground">Source Property</label>
                <input
                  v-model="action.sourceProperty"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                  placeholder="e.g., camera_model, duration"
                />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Target Property</label>
                <input
                  v-model="action.targetProperty"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                  placeholder="e.g., equipment_used"
                />
              </div>
            </div>

            <div v-if="action.type === 'transform_property'" class="space-y-2">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-muted-foreground">Source Property</label>
                  <input
                    v-model="action.sourceProperty"
                    class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                    placeholder="e.g., duration"
                  />
                </div>
                <div>
                  <label class="text-xs text-muted-foreground">Transform Type</label>
                  <select
                    v-model="action.transform"
                    class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                  >
                    <option value="format_duration">Format Duration</option>
                    <option value="format_size">Format File Size</option>
                    <option value="extract_date">Extract Date</option>
                    <option value="uppercase">Uppercase</option>
                    <option value="lowercase">Lowercase</option>
                    <option value="regex_extract">Regex Extract</option>
                  </select>
                </div>
              </div>
              <div v-if="action.transform === 'regex_extract'">
                <label class="text-xs text-muted-foreground">Regex Pattern</label>
                <input
                  v-model="action.transformPattern"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                  placeholder="e.g., (\\d{4}-\\d{2}-\\d{2})"
                />
              </div>
            </div>

            <div v-if="action.type === 'create_hierarchy'" class="space-y-2">
              <div>
                <label class="text-xs text-muted-foreground">Hierarchy Path</label>
                <input
                  v-model="action.hierarchyPath"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                  placeholder="e.g., {project_name}/{camera_model}/{shoot_date}"
                />
              </div>
              <div class="text-xs text-muted-foreground">
                Use {property_name} to reference metadata properties
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rule Settings -->
      <div class="space-y-4">
        <h4 class="text-sm font-semibold border-b pb-2">Rule Settings</h4>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium">Priority</label>
            <select
              v-model="rule.priority"
              class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="1">High Priority</option>
              <option value="2">Medium Priority</option>
              <option value="3">Low Priority</option>
            </select>
          </div>
          
          <div>
            <label class="text-sm font-medium">Triggers</label>
            <div class="mt-1 space-y-1 text-sm">
              <label class="flex items-center gap-2">
                <input
                  v-model="rule.triggers"
                  type="checkbox"
                  value="scan"
                  class="rounded border-input"
                />
                During file scan
              </label>
              <label class="flex items-center gap-2">
                <input
                  v-model="rule.triggers"
                  type="checkbox"
                  value="select"
                  class="rounded border-input"
                />
                When file selected
              </label>
              <label class="flex items-center gap-2">
                <input
                  v-model="rule.triggers"
                  type="checkbox"
                  value="manual"
                  class="rounded border-input"
                />
                Manual trigger only
              </label>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm">
            <input
              v-model="rule.enabled"
              type="checkbox"
              class="rounded border-input"
            />
            Enable this rule
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input
              v-model="rule.stopOnMatch"
              type="checkbox"
              class="rounded border-input"
            />
            Stop processing other rules after match
          </label>
        </div>
      </div>

      <!-- Preview -->
      <div v-if="previewFile" class="space-y-4">
        <h4 class="text-sm font-semibold border-b pb-2">Preview</h4>
        <div class="bg-muted/20 rounded-md p-3">
          <div class="text-xs text-muted-foreground mb-2">Testing rule against:</div>
          <div class="font-mono text-xs mb-3 text-foreground">{{ previewFile.name }}</div>
          
          <div class="space-y-2">
            <div class="text-xs font-medium">Conditions:</div>
            <div class="space-y-1 text-xs ml-4">
              <div
                v-for="(condition, index) in rule.conditions"
                :key="index"
                class="flex items-center gap-2"
              >
                <span class="w-2 h-2 rounded-full" :class="evaluateCondition(condition) ? 'bg-green-500' : 'bg-red-500'"></span>
                <span>{{ formatConditionPreview(condition) }}</span>
              </div>
            </div>
            
            <div class="text-xs font-medium mt-3">Actions:</div>
            <div class="space-y-1 text-xs ml-4">
              <div
                v-for="(action, index) in rule.actions"
                :key="index"
                class="text-muted-foreground"
              >
                {{ formatActionPreview(action) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="p-4 border-t bg-muted/20">
      <div class="flex justify-between">
        <div class="flex gap-2">
          <button
            @click="testRule"
            class="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent"
          >
            🧪 Test Rule
          </button>
          <button
            @click="exportRule"
            class="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent"
          >
            📤 Export
          </button>
        </div>
        
        <div class="flex gap-2">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent"
          >
            Cancel
          </button>
          <button
            @click="saveRule"
            class="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Save Rule
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { FileNode } from '@/types'
import type { InspectionRule, InspectionCondition, InspectionAction, MetadataProperty } from '@/composables/useAdvancedMetadata'

interface Props {
  previewFile?: FileNode | null
  initialProperties?: MetadataProperty[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'close': []
  'save': [rule: InspectionRule]
  'test': [rule: InspectionRule, file?: FileNode]
}>()

const rule = reactive<InspectionRule>({
  id: `metadata-rule-${Date.now()}`,
  name: '',
  description: '',
  enabled: true,
  conditions: [],
  actions: [],
  priority: 2,
  triggers: ['scan'],
  stopOnMatch: false
})

// Initialize with properties if provided
if (props.initialProperties && props.initialProperties.length > 0) {
  rule.name = `Rule from ${props.previewFile?.name || 'Selected Properties'}`
  rule.description = `Auto-generated rule based on ${props.initialProperties.length} selected metadata properties`
  
  // Create conditions based on selected properties
  props.initialProperties.forEach(prop => {
    if (prop.source === 'mediainfo' || prop.source === 'filename') {
      rule.conditions.push({
        type: 'metadata_property',
        property: prop.key,
        operator: prop.type === 'string' ? 'exists' : 'greater_than',
        value: prop.type === 'string' ? '' : 0,
        required: false,
        caseSensitive: false
      })
    }
  })
  
  // Create actions to extract the same properties
  props.initialProperties.forEach(prop => {
    rule.actions.push({
      type: 'copy_property',
      sourceProperty: prop.key,
      targetProperty: `extracted_${prop.key}`,
      priority: 2
    })
  })
}

function loadPreset(presetName: string) {
  if (presetName === 'media-production') {
    rule.name = 'Professional Media Metadata Extraction'
    rule.description = 'Automatically extract comprehensive metadata from professional video files during scanning'
    rule.enabled = true
    rule.priority = 1
    rule.triggers = ['scan', 'select']
    rule.stopOnMatch = false
    
    // Clear existing conditions and actions
    rule.conditions = []
    rule.actions = []
    
    // Add conditions for media files
    rule.conditions.push({
      type: 'file_extension',
      target: '',
      operator: 'equals',
      value: 'r3d,braw,mov,mp4,mxf',
      required: true,
      caseSensitive: false
    })
    
    rule.conditions.push({
      type: 'file_size',
      target: '',
      operator: 'greater_than',
      value: '10MB',
      required: false,
      caseSensitive: false
    })
    
    // Add extraction actions
    rule.actions.push({
      type: 'extract_metadata',
      priority: 1
    })
    
    rule.actions.push({
      type: 'set_property',
      targetProperty: 'media_type',
      value: 'professional_video',
      priority: 1
    })
    
    rule.actions.push({
      type: 'create_hierarchy',
      hierarchyPath: '{camera_system}/{shoot_date}/{camera_model}',
      priority: 2
    })
  }
}

function addCondition() {
  rule.conditions.push({
    type: 'file_extension',
    target: '',
    operator: 'equals',
    value: '',
    required: false,
    caseSensitive: false
  })
}

function removeCondition(index: number) {
  rule.conditions.splice(index, 1)
}

function addAction() {
  rule.actions.push({
    type: 'extract_metadata',
    priority: 2
  })
}

function removeAction(index: number) {
  rule.actions.splice(index, 1)
}

function getConditionTargetPlaceholder(type: string): string {
  switch (type) {
    case 'file_extension': return 'r3d, braw, mp4'
    case 'file_path': return '/Volumes/Media/**'
    case 'file_size': return '100MB'
    default: return ''
  }
}

function getConditionValuePlaceholder(condition: InspectionCondition): string {
  switch (condition.type) {
    case 'file_extension': return 'mp4'
    case 'file_path': return '/RED/**'
    case 'file_size': return '100MB'
    case 'metadata_property': 
      switch (condition.operator) {
        case 'equals': return 'expected value'
        case 'contains': return 'search text'
        case 'greater_than': return '1920'
        case 'less_than': return '3600'
        default: return 'value'
      }
    default: return 'value'
  }
}

function formatConditionPreview(condition: InspectionCondition): string {
  const type = condition.type.replace('_', ' ')
  const operator = condition.operator.replace('_', ' ')
  const target = condition.property || condition.target || 'target'
  const value = condition.value || 'value'
  
  return `${type} ${target} ${operator} ${value}`
}

function formatActionPreview(action: InspectionAction): string {
  switch (action.type) {
    case 'extract_metadata': return 'Extract all available metadata'
    case 'set_property': return `Set ${action.targetProperty} = ${action.value}`
    case 'copy_property': return `Copy ${action.sourceProperty} to ${action.targetProperty}`
    case 'transform_property': return `Transform ${action.sourceProperty} using ${action.transform}`
    case 'create_hierarchy': return `Create hierarchy: ${action.hierarchyPath}`
    default: return action.type
  }
}

function evaluateCondition(condition: InspectionCondition): boolean {
  if (!props.previewFile) return false
  
  // This is a simplified evaluation for preview purposes
  switch (condition.type) {
    case 'file_extension':
      const ext = props.previewFile.name.split('.').pop()?.toLowerCase()
      const extensions = condition.value?.toLowerCase().split(',').map((e: string) => e.trim())
      return extensions?.includes(ext || '') || false
    
    case 'file_path':
      const path = condition.caseSensitive ? props.previewFile.path : props.previewFile.path.toLowerCase()
      const value = condition.caseSensitive ? condition.value : condition.value?.toLowerCase()
      
      switch (condition.operator) {
        case 'contains': return path.includes(value || '')
        case 'starts_with': return path.startsWith(value || '')
        case 'ends_with': return path.endsWith(value || '')
        default: return path === value
      }
    
    case 'file_size':
      // This would need the actual file size to evaluate properly
      return true
    
    default:
      return false
  }
}

function testRule() {
  emit('test', rule, props.previewFile || undefined)
}

function exportRule() {
  const data = JSON.stringify(rule, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${rule.name.replace(/\s+/g, '_')}_metadata_rule.json`
  a.click()
  URL.revokeObjectURL(url)
}

function saveRule() {
  emit('save', rule)
}
</script>

<style scoped>
.metadata-rule-builder {
  max-width: 900px;
  margin: 0 auto;
  max-height: 90vh;
  overflow-y: auto;
}
</style>