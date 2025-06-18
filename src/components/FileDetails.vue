<template>
  <div class="file-details h-full flex flex-col">
    <!-- Header -->
    <div v-if="!file" class="p-4 text-center text-muted-foreground">
      <div class="text-4xl mb-2">📁</div>
      <p>Select a file to view details</p>
    </div>
    
    <div v-else class="flex-1 min-h-0 flex flex-col">
      <!-- File Info Header -->
      <div class="p-4 border-b space-y-2">
        <div class="text-sm font-medium truncate" :title="file.name">{{ file.name }}</div>
        <div class="text-xs text-muted-foreground space-y-1">
          <div>Type: {{ file.type === 'file' ? getFileType(file.name) : 'Folder' }}</div>
          <div v-if="file.size">Size: {{ formatFileSize(file.size) }}</div>
          <div v-if="file.lastModified">Modified: {{ formatDate(file.lastModified) }}</div>
        </div>
        
        <!-- Action Buttons -->
        <div v-if="file.type === 'file'" class="flex gap-2 pt-2">
          <button
            @click="showMetadataInspector = true"
            class="flex-1 px-3 py-2 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            🔍 Inspect Metadata
          </button>
          <button
            @click="showRuleBuilder = true"
            class="px-3 py-2 text-xs border border-input rounded hover:bg-accent"
          >
            🔧 Create Rule
          </button>
        </div>
      </div>
      
      <!-- Tabs -->
      <div class="border-b">
        <div class="flex text-sm">
          <button
            @click="activeTab = 'path'"
            class="px-4 py-2 border-b-2 transition-colors"
            :class="activeTab === 'path' 
              ? 'border-primary text-primary font-medium' 
              : 'border-transparent text-muted-foreground hover:text-foreground'"
          >
            Path Analysis
          </button>
          <button
            v-if="file.type === 'file' && isMediaFile(file.name)"
            @click="activeTab = 'metadata'"
            class="px-4 py-2 border-b-2 transition-colors"
            :class="activeTab === 'metadata' 
              ? 'border-primary text-primary font-medium' 
              : 'border-transparent text-muted-foreground hover:text-foreground'"
          >
            Basic Metadata
          </button>
          <button
            v-if="extractedMetadata"
            @click="activeTab = 'advanced'"
            class="px-4 py-2 border-b-2 transition-colors"
            :class="activeTab === 'advanced' 
              ? 'border-primary text-primary font-medium' 
              : 'border-transparent text-muted-foreground hover:text-foreground'"
          >
            Advanced ({{ extractedMetadata.properties.length }})
          </button>
        </div>
      </div>
      
      <!-- Tab Content -->
      <div class="flex-1 min-h-0 overflow-auto">
        <!-- Path Analysis Tab -->
        <div v-if="activeTab === 'path'" class="p-4 space-y-4">
          <div class="space-y-2">
            <div class="text-sm font-medium">File Path</div>
            <div 
              class="text-xs font-mono p-3 bg-muted/20 rounded cursor-text select-text border break-all whitespace-pre-wrap leading-relaxed"
              @mouseup="handlePathSelection"
            >
{{ file.path }}</div>
          </div>
          
          <!-- Interactive Path Segments -->
          <div class="space-y-3">
            <div class="text-xs text-muted-foreground">Click any part below to create a rule:</div>
            <PathSegmentLabels 
              :file="file" 
              :potential-variables="potentialVariables"
              @create-rule="createVariableRule"
              @add-to-hierarchy="handleAddToHierarchy"
              @create-advanced-rule="handleCreateAdvancedRule"
            />
          </div>
        </div>
        
        <!-- Basic Metadata Tab -->
        <div v-if="activeTab === 'metadata'" class="p-4 space-y-4">
          <div class="space-y-2">
            <div class="text-sm font-medium">Basic Properties</div>
            <div class="text-xs space-y-2">
              <div v-if="mockMetadata.duration" class="flex justify-between">
                <span>Duration:</span>
                <span class="font-mono">{{ mockMetadata.duration }}s</span>
              </div>
              <div v-if="mockMetadata.resolution" class="flex justify-between">
                <span>Resolution:</span>
                <span class="font-mono">{{ mockMetadata.resolution }}</span>
              </div>
              <div v-if="mockMetadata.codec" class="flex justify-between">
                <span>Codec:</span>
                <span class="font-mono">{{ mockMetadata.codec }}</span>
              </div>
              <div v-if="mockMetadata.frameRate" class="flex justify-between">
                <span>Frame Rate:</span>
                <span class="font-mono">{{ mockMetadata.frameRate }} fps</span>
              </div>
            </div>
          </div>
          
          <div class="text-xs text-muted-foreground p-3 bg-muted/20 rounded">
            💡 Click "Inspect Metadata" above for comprehensive analysis using MediaInfo.js
          </div>
        </div>
        
        <!-- Advanced Metadata Tab -->
        <div v-if="activeTab === 'advanced' && extractedMetadata" class="p-4 space-y-4">
          <div class="space-y-2">
            <div class="text-sm font-medium">Extracted Properties</div>
            <div class="text-xs text-muted-foreground">
              {{ extractedMetadata.properties.length }} properties extracted
            </div>
          </div>
          
          <div class="space-y-2 max-h-64 overflow-auto">
            <div
              v-for="property in extractedMetadata.properties.slice(0, 10)"
              :key="property.id"
              class="p-2 bg-muted/20 rounded text-xs"
            >
              <div class="font-medium">{{ property.displayName }}</div>
              <div class="font-mono text-muted-foreground truncate">{{ property.value }}</div>
            </div>
          </div>
          
          <button
            @click="showMetadataInspector = true"
            class="w-full px-3 py-2 text-xs border border-input rounded hover:bg-accent"
          >
            View All {{ extractedMetadata.properties.length }} Properties
          </button>
        </div>
      </div>
    </div>

    <!-- Metadata Inspector Modal -->
    <div
      v-if="showMetadataInspector"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-background rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] overflow-hidden">
        <MetadataInspector
          :file="file"
          @close="showMetadataInspector = false"
          @create-rule="handleCreateMetadataRule"
          @export-metadata="handleExportMetadata"
        />
      </div>
    </div>

    <!-- Rule Builder Modal -->
    <div
      v-if="showRuleBuilder"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-background rounded-lg shadow-xl w-full max-w-5xl h-full max-h-[90vh] overflow-hidden">
        <MetadataRuleBuilder
          :preview-file="file"
          :initial-properties="selectedMetadataProperties"
          @close="showRuleBuilder = false"
          @save="handleSaveRule"
          @test="handleTestRule"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FileNode } from '@/types'
import type { MetadataProperty, ExtractedMetadata, InspectionRule } from '@/composables/useAdvancedMetadata'
import PathSegmentLabels from './PathSegmentLabels.vue'
import MetadataInspector from './MetadataInspector.vue'
import MetadataRuleBuilder from './MetadataRuleBuilder.vue'

interface Props {
  file?: FileNode | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'create-rule': [data: any]
  'path-selected': [text: string]
  'add-to-hierarchy': [segment: any, hierarchyData: any]
  'create-advanced-rule': [segment: any, context: any]
  'metadata-rule-created': [rule: InspectionRule]
  'metadata-exported': [metadata: ExtractedMetadata, file: FileNode]
}>()

// Component state
const activeTab = ref('path')
const showMetadataInspector = ref(false)
const showRuleBuilder = ref(false)
const extractedMetadata = ref<ExtractedMetadata | null>(null)
const selectedMetadataProperties = ref<MetadataProperty[]>([])

// Event handlers
function handleCreateMetadataRule(properties: MetadataProperty[], file: FileNode) {
  selectedMetadataProperties.value = properties
  showMetadataInspector.value = false
  showRuleBuilder.value = true
}

function handleExportMetadata(metadata: ExtractedMetadata, file: FileNode) {
  emit('metadata-exported', metadata, file)
}

function handleSaveRule(rule: InspectionRule) {
  emit('metadata-rule-created', rule)
  showRuleBuilder.value = false
  selectedMetadataProperties.value = []
}

function handleTestRule(rule: InspectionRule, file?: FileNode) {
  console.log('Testing rule:', rule, 'against file:', file)
  // This would trigger rule testing functionality
}

// Automatically switch to advanced tab when metadata is extracted
const handleMetadataExtracted = (metadata: ExtractedMetadata) => {
  extractedMetadata.value = metadata
  activeTab.value = 'advanced'
}

const mockMetadata = computed(() => {
  if (!props.file || !isMediaFile(props.file.name)) return {}
  
  return {
    duration: Math.floor(Math.random() * 300),
    resolution: '1920x1080',
    codec: 'H.264',
    frameRate: 29.97
  }
})

const potentialVariables = computed(() => {
  if (!props.file) return []
  
  const pathParts = props.file.path.split('/')
  const variables = []
  
  // Suggest variables based on path structure
  pathParts.forEach((part, index) => {
    if (part && index > 0) { // Skip root
      // Full path segment
      variables.push({
        name: `Level_${index}`,
        description: `Extract "${part}" from path level ${index}`,
        value: part,
        type: 'path-level'
      })
      
      // Check for separators and suggest breaking down the segment
      const separators = ['_', '-', '.', ' ']
      separators.forEach(separator => {
        if (part.includes(separator)) {
          const subParts = part.split(separator)
          if (subParts.length > 1) {
            subParts.forEach((subPart, subIndex) => {
              if (subPart.trim()) {
                variables.push({
                  name: `Level_${index}_${separator === ' ' ? 'Space' : separator}_${subIndex + 1}`,
                  description: `Extract "${subPart}" (part ${subIndex + 1} of "${part}" split by "${separator}")`,
                  value: subPart,
                  type: 'separator-split',
                  separator: separator,
                  parentSegment: part,
                  segmentIndex: subIndex
                })
              }
            })
          }
        }
      })
    }
  })
  
  // Add filename-based suggestions
  const filename = props.file.name
  const filenameParts = filename.split('.')
  const nameWithoutExt = filenameParts[0]
  
  // Check filename for separators
  const separators = ['_', '-', ' ']
  separators.forEach(separator => {
    if (nameWithoutExt.includes(separator)) {
      const parts = nameWithoutExt.split(separator)
      if (parts.length > 1) {
        parts.forEach((part, index) => {
          if (part.trim()) {
            variables.push({
              name: `Filename_${separator === ' ' ? 'Space' : separator}_${index + 1}`,
              description: `Extract "${part}" (part ${index + 1} of filename split by "${separator}")`,
              value: part,
              type: 'filename-split',
              separator: separator,
              parentSegment: nameWithoutExt,
              segmentIndex: index
            })
          }
        })
      }
    }
  })
  
  // Add date-based suggestions
  const dateMatch = filename.match(/(\d{4}[-_]\d{2}[-_]\d{2})/)
  if (dateMatch) {
    variables.push({
      name: 'Date',
      description: `Extract date "${dateMatch[1]}" from filename`,
      value: dateMatch[1],
      type: 'date-pattern'
    })
  }
  
  // Add time-based suggestions
  const timeMatch = filename.match(/(\d{2}[-_:]\d{2}[-_:]\d{2})/)
  if (timeMatch) {
    variables.push({
      name: 'Time',
      description: `Extract time "${timeMatch[1]}" from filename`,
      value: timeMatch[1],
      type: 'time-pattern'
    })
  }
  
  // Add sequence number suggestions
  const sequenceMatch = filename.match(/([A-Z]\d{3})/g)
  if (sequenceMatch) {
    sequenceMatch.forEach((match, index) => {
      variables.push({
        name: `Sequence_${index + 1}`,
        description: `Extract sequence "${match}" from filename`,
        value: match,
        type: 'sequence-pattern'
      })
    })
  }
  
  return variables
})

const pathLevelVariables = computed(() => 
  potentialVariables.value.filter(v => v.type === 'path-level')
)

const separatorVariables = computed(() => 
  potentialVariables.value.filter(v => v.type === 'separator-split' || v.type === 'filename-split')
)

const patternVariables = computed(() => 
  potentialVariables.value.filter(v => ['date-pattern', 'time-pattern', 'sequence-pattern'].includes(v.type))
)

function handlePathSelection() {
  const selection = window.getSelection()
  if (selection && selection.toString().trim()) {
    emit('create-rule', {
      text: selection.toString().trim(),
      source: 'path-selection',
      file: props.file
    })
  }
}

function createVariableRule(variable: any) {
  emit('create-rule', {
    text: variable.value,
    source: 'potential-variable',
    variable: variable,
    file: props.file
  })
}

function handleAddToHierarchy(segment: any, hierarchyData: any) {
  emit('add-to-hierarchy', segment, hierarchyData)
}

function handleCreateAdvancedRule(segment: any, context: any) {
  emit('create-advanced-rule', segment, context)
}

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  const types: Record<string, string> = {
    mp4: 'Video',
    mov: 'Video', 
    avi: 'Video',
    mkv: 'Video',
    mxf: 'Video',
    r3d: 'RED Video',
    braw: 'Blackmagic Video',
    jpg: 'Image',
    jpeg: 'Image',
    png: 'Image',
    tiff: 'Image',
    cr2: 'Canon RAW',
    arw: 'Sony RAW',
    dng: 'Adobe DNG',
    wav: 'Audio',
    mp3: 'Audio',
    aif: 'Audio'
  }
  
  return types[ext || ''] || 'Unknown'
}

function isMediaFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mediaExts = ['mp4', 'mov', 'avi', 'mkv', 'mxf', 'r3d', 'braw', 'jpg', 'jpeg', 'png', 'tiff', 'cr2', 'arw', 'dng']
  return mediaExts.includes(ext || '')
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>