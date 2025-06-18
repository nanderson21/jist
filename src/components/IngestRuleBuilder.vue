<template>
  <div class="ingest-rule-builder bg-background border rounded-lg">
    <!-- Header -->
    <div class="p-4 border-b">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Ingest Rule Builder</h3>
        <div class="flex items-center gap-2">
          <button
            @click="loadPreset('red-camera')"
            class="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            🎬 RED Camera Preset
          </button>
          <button
            @click="showAdvanced = !showAdvanced"
            class="px-3 py-1 text-xs border rounded hover:bg-accent"
            :class="{ 'bg-accent': showAdvanced }"
          >
            Advanced
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
            placeholder="e.g., RED R3D Production Workflow"
          />
        </div>
        
        <div>
          <label class="text-sm font-medium">Description</label>
          <textarea
            v-model="rule.description"
            class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm resize-none"
            rows="2"
            placeholder="Describe what this rule does..."
          ></textarea>
        </div>
      </div>
      
      <!-- Source Pattern Matching -->
      <div class="space-y-4">
        <h4 class="text-sm font-semibold border-b pb-2">Source Pattern Matching</h4>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium">File Extensions</label>
            <input
              v-model="rule.fileExtensions"
              class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
              placeholder="r3d, mov, braw"
            />
          </div>
          
          <div>
            <label class="text-sm font-medium">Folder Pattern</label>
            <input
              v-model="rule.folderPattern"
              class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
              placeholder="**/DCIM/**, **/Clips/**"
            />
          </div>
        </div>
      </div>
      
      <!-- Segment Mapping -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold">Segment Mappings</h4>
          <button
            @click="addSegmentMapping"
            class="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            + Add Mapping
          </button>
        </div>
        
        <div class="space-y-3">
          <div
            v-for="(mapping, index) in rule.segmentMappings"
            :key="index"
            class="p-3 border rounded-md space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Mapping {{ index + 1 }}</span>
              <button
                @click="removeSegmentMapping(index)"
                class="p-1 text-destructive hover:bg-destructive/10 rounded"
              >
                🗑️
              </button>
            </div>
            
            <!-- Source Definition -->
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-muted-foreground">Source Level</label>
                <select
                  v-model="mapping.sourceLevel"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                >
                  <option value="-1">Filename</option>
                  <option v-for="i in 10" :key="i" :value="i-1">Level {{ i }}</option>
                </select>
              </div>
              
              <div>
                <label class="text-xs text-muted-foreground">Source Type</label>
                <select
                  v-model="mapping.sourceType"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                >
                  <option value="exact">Exact Match</option>
                  <option value="pattern">Smart Pattern</option>
                  <option value="split">Split Part</option>
                  <option value="parent">Parent Level</option>
                </select>
              </div>
              
              <div>
                <label class="text-xs text-muted-foreground">Pattern/Value</label>
                <input
                  v-model="mapping.sourcePattern"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                  :placeholder="getSourcePatternPlaceholder(mapping.sourceType)"
                />
              </div>
            </div>
            
            <!-- Target Definition -->
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-muted-foreground">Target Hierarchy</label>
                <select
                  v-model="mapping.targetHierarchy"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                >
                  <option value="rooms">Rooms</option>
                  <option value="custom">Custom Hierarchy</option>
                  <option value="metadata">Metadata Field</option>
                </select>
              </div>
              
              <div>
                <label class="text-xs text-muted-foreground">Target Level</label>
                <select
                  v-model="mapping.targetLevel"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                >
                  <option value="project">Project</option>
                  <option value="shoot">Shoot Day</option>
                  <option value="camera">Camera</option>
                  <option value="roll">Roll</option>
                  <option value="clip">Clip Name</option>
                </select>
              </div>
              
              <div>
                <label class="text-xs text-muted-foreground">Transform</label>
                <select
                  v-model="mapping.transform"
                  class="w-full mt-1 px-2 py-1 border border-input rounded text-xs"
                >
                  <option value="none">No Transform</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                  <option value="camelCase">camelCase</option>
                  <option value="kebab-case">kebab-case</option>
                  <option value="date-format">Date Format</option>
                </select>
              </div>
            </div>
            
            <!-- Dependencies (Advanced) -->
            <div v-if="showAdvanced" class="border-t pt-3">
              <label class="text-xs font-medium text-muted-foreground">Dependencies</label>
              <div class="mt-2 space-y-2">
                <div
                  v-for="(dep, depIndex) in mapping.dependencies"
                  :key="depIndex"
                  class="flex items-center gap-2 text-xs"
                >
                  <select
                    v-model="dep.type"
                    class="px-2 py-1 border border-input rounded"
                  >
                    <option value="parent-level">Parent Level</option>
                    <option value="smart-pattern">Smart Pattern</option>
                    <option value="fixed-value">Fixed Value</option>
                  </select>
                  
                  <input
                    v-model="dep.condition"
                    class="flex-1 px-2 py-1 border border-input rounded"
                    :placeholder="getDependencyPlaceholder(dep.type)"
                  />
                  
                  <button
                    @click="removeDependency(index, depIndex)"
                    class="p-1 text-destructive hover:bg-destructive/10 rounded"
                  >
                    ✕
                  </button>
                </div>
                
                <button
                  @click="addDependency(index)"
                  class="w-full p-1 text-xs text-muted-foreground hover:text-foreground border-2 border-dashed border-border rounded"
                >
                  + Add Dependency
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Inheritance Settings -->
      <div v-if="showAdvanced" class="space-y-4">
        <h4 class="text-sm font-semibold border-b pb-2">Inheritance & Propagation</h4>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="rule.inheritFromParent"
                type="checkbox"
                class="rounded border-input"
              />
              Inherit from parent folders
            </label>
            
            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="rule.propagateToChildren"
                type="checkbox"
                class="rounded border-input"
              />
              Apply to child folders
            </label>
          </div>
          
          <div>
            <label class="text-sm font-medium">Inheritance Depth</label>
            <select
              v-model="rule.inheritanceDepth"
              class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="1">1 Level Up</option>
              <option value="2">2 Levels Up</option>
              <option value="3">3 Levels Up</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Preview -->
      <div class="space-y-4">
        <h4 class="text-sm font-semibold border-b pb-2">Preview</h4>
        <div class="bg-muted/20 rounded-md p-3">
          <div class="text-xs text-muted-foreground mb-2">Example mapping for:</div>
          <div class="font-mono text-xs mb-3 text-foreground">
            /Volumes/SSD1/2024-01-15_ProjectName/Camera_A/001_TAKE_001/A001_C001_20240115_001.R3D
          </div>
          
          <div class="space-y-1 text-xs">
            <div v-for="mapping in rule.segmentMappings" :key="mapping.id" class="flex items-center gap-2">
              <span class="w-20 text-muted-foreground">{{ mapping.targetLevel }}:</span>
              <span class="font-medium">{{ generatePreview(mapping) }}</span>
              <span class="text-muted-foreground">({{ mapping.sourceType }})</span>
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

interface SegmentDependency {
  type: 'parent-level' | 'smart-pattern' | 'fixed-value'
  condition: string
}

interface SegmentMapping {
  id: string
  sourceLevel: number
  sourceType: 'exact' | 'pattern' | 'split' | 'parent'
  sourcePattern: string
  targetHierarchy: 'rooms' | 'custom' | 'metadata'
  targetLevel: string
  transform: string
  dependencies: SegmentDependency[]
}

interface IngestRule {
  id: string
  name: string
  description: string
  fileExtensions: string
  folderPattern: string
  segmentMappings: SegmentMapping[]
  inheritFromParent: boolean
  propagateToChildren: boolean
  inheritanceDepth: string
  active: boolean
  createdAt: Date
}

const emit = defineEmits<{
  'close': []
  'save': [rule: IngestRule]
}>()

const showAdvanced = ref(false)

const rule = reactive<IngestRule>({
  id: `rule-${Date.now()}`,
  name: '',
  description: '',
  fileExtensions: '',
  folderPattern: '',
  segmentMappings: [],
  inheritFromParent: false,
  propagateToChildren: false,
  inheritanceDepth: '1',
  active: true,
  createdAt: new Date()
})

function loadPreset(presetName: string) {
  if (presetName === 'red-camera') {
    rule.name = 'RED Camera R3D Production Workflow'
    rule.description = 'Maps RED R3D files from shoot structure to Rooms hierarchy with shoot day, camera, and roll organization'
    rule.fileExtensions = 'r3d'
    rule.folderPattern = '**/DCIM/**, **/Clips/**, **/RED/**'
    rule.inheritFromParent = true
    rule.propagateToChildren = true
    rule.inheritanceDepth = '3'
    
    // Clear existing mappings
    rule.segmentMappings = []
    
    // Add preset mappings
    addSegmentMapping()
    const projectMapping = rule.segmentMappings[0]
    projectMapping.sourceLevel = 1
    projectMapping.sourceType = 'exact'
    projectMapping.sourcePattern = ''
    projectMapping.targetHierarchy = 'rooms'
    projectMapping.targetLevel = 'project'
    projectMapping.transform = 'none'
    
    addSegmentMapping()
    const shootMapping = rule.segmentMappings[1]
    shootMapping.sourceLevel = 2
    shootMapping.sourceType = 'pattern'
    shootMapping.sourcePattern = '\\d{4}-\\d{2}-\\d{2}'
    shootMapping.targetHierarchy = 'rooms'
    shootMapping.targetLevel = 'shoot'
    shootMapping.transform = 'date-format'
    
    addSegmentMapping()
    const cameraMapping = rule.segmentMappings[2]
    cameraMapping.sourceLevel = 3
    cameraMapping.sourceType = 'split'
    cameraMapping.sourcePattern = '_'
    cameraMapping.targetHierarchy = 'rooms'
    cameraMapping.targetLevel = 'camera'
    cameraMapping.transform = 'uppercase'
    
    addSegmentMapping()
    const rollMapping = rule.segmentMappings[3]
    rollMapping.sourceLevel = 4
    rollMapping.sourceType = 'exact'
    rollMapping.sourcePattern = ''
    rollMapping.targetHierarchy = 'rooms'
    rollMapping.targetLevel = 'roll'
    rollMapping.transform = 'none'
    
    addSegmentMapping()
    const clipMapping = rule.segmentMappings[4]
    clipMapping.sourceLevel = -1
    clipMapping.sourceType = 'pattern'
    clipMapping.sourcePattern = '[A-Z]\\d{3}_[A-Z]\\d{3}_\\d{8}_\\d{3}'
    clipMapping.targetHierarchy = 'rooms'
    clipMapping.targetLevel = 'clip'
    clipMapping.transform = 'none'
    
    // Add dependencies
    addDependency(1)
    shootMapping.dependencies[0].type = 'smart-pattern'
    shootMapping.dependencies[0].condition = 'date'
    
    addDependency(2)
    cameraMapping.dependencies[0].type = 'parent-level'
    cameraMapping.dependencies[0].condition = '1'
  }
}

function addSegmentMapping() {
  rule.segmentMappings.push({
    id: `mapping-${Date.now()}-${Math.random()}`,
    sourceLevel: 0,
    sourceType: 'exact',
    sourcePattern: '',
    targetHierarchy: 'rooms',
    targetLevel: 'project',
    transform: 'none',
    dependencies: []
  })
}

function removeSegmentMapping(index: number) {
  rule.segmentMappings.splice(index, 1)
}

function addDependency(mappingIndex: number) {
  rule.segmentMappings[mappingIndex].dependencies.push({
    type: 'parent-level',
    condition: ''
  })
}

function removeDependency(mappingIndex: number, depIndex: number) {
  rule.segmentMappings[mappingIndex].dependencies.splice(depIndex, 1)
}

function getSourcePatternPlaceholder(sourceType: string): string {
  switch (sourceType) {
    case 'exact': return 'exact text to match'
    case 'pattern': return '\\d{4}-\\d{2}-\\d{2}'
    case 'split': return '_ or - or .'
    case 'parent': return 'levels up (1, 2, 3)'
    default: return ''
  }
}

function getDependencyPlaceholder(depType: string): string {
  switch (depType) {
    case 'parent-level': return 'levels up (1, 2, 3)'
    case 'smart-pattern': return 'date, time, sequence'
    case 'fixed-value': return 'exact value'
    default: return ''
  }
}

function generatePreview(mapping: SegmentMapping): string {
  const examplePath = '/Volumes/SSD1/2024-01-15_ProjectName/Camera_A/001_TAKE_001/A001_C001_20240115_001.R3D'
  const segments = examplePath.split('/')
  
  let value = ''
  
  if (mapping.sourceLevel === -1) {
    // Filename
    const filename = segments[segments.length - 1]
    if (mapping.sourceType === 'pattern' && mapping.sourcePattern) {
      const match = filename.match(new RegExp(mapping.sourcePattern))
      value = match ? match[0] : filename
    } else {
      value = filename.split('.')[0]
    }
  } else if (mapping.sourceLevel < segments.length) {
    const segment = segments[mapping.sourceLevel + 1] || ''
    
    if (mapping.sourceType === 'split' && mapping.sourcePattern) {
      const parts = segment.split(mapping.sourcePattern)
      value = parts[0] || segment
    } else if (mapping.sourceType === 'pattern' && mapping.sourcePattern) {
      const match = segment.match(new RegExp(mapping.sourcePattern))
      value = match ? match[0] : segment
    } else {
      value = segment
    }
  }
  
  // Apply transform
  switch (mapping.transform) {
    case 'uppercase': return value.toUpperCase()
    case 'lowercase': return value.toLowerCase()
    case 'camelCase': return value.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    case 'kebab-case': return value.toLowerCase().replace(/[_\s]+/g, '-')
    case 'date-format': return value.replace(/(\d{4})[-_](\d{2})[-_](\d{2})/, '$1-$2-$3')
    default: return value
  }
}

function testRule() {
  // This would test the rule against actual files
  console.log('Testing rule:', rule)
}

function exportRule() {
  const data = JSON.stringify(rule, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${rule.name.replace(/\s+/g, '_')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function saveRule() {
  emit('save', rule)
}
</script>

<style scoped>
.ingest-rule-builder {
  max-width: 800px;
  margin: 0 auto;
  max-height: 90vh;
  overflow-y: auto;
}
</style>