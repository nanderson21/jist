<template>
  <div class="hierarchy-context-builder h-full flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-foreground">Hierarchy Context Builder</h3>
          <p class="text-xs text-muted-foreground mt-1">
            {{ discoveredSegments.length }} unique segments discovered across {{ allFiles.length }} files
          </p>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click="autoDetectContexts"
            class="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            🤖 Auto-Detect
          </button>
          
          <button
            @click="exportContexts"
            class="px-3 py-1 text-xs border border-input rounded hover:bg-accent"
          >
            📤 Export
          </button>
        </div>
      </div>
    </div>
    
    <!-- Hierarchy Tree -->
    <div class="flex-1 overflow-auto p-4">
      <div class="space-y-4">
        <!-- Folder Hierarchy Segments -->
        <div
          v-for="level in hierarchyLevels"
          :key="`level-${level.depth}`"
          class="hierarchy-level"
        >
          <div class="flex items-center gap-2 mb-3">
            <span class="text-sm font-medium text-muted-foreground">
              Level {{ level.depth + 1 }} ({{ level.segments.length }} unique)
            </span>
            <div class="flex-1 h-px bg-border"></div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <HierarchySegmentCard
              v-for="segment in level.segments"
              :key="segment.id"
              :segment="segment"
              :is-scanning="isScanning"
              @context-assigned="handleContextAssigned"
              @segment-clicked="handleSegmentClicked"
            />
          </div>
        </div>
        
        <!-- Filename Segments -->
        <div class="mt-8">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-sm font-medium text-muted-foreground">
              Filename Patterns ({{ filenameSegments.length }} detected)
            </span>
            <div class="flex-1 h-px bg-border"></div>
          </div>
          
          <div class="space-y-3">
            <div
              v-for="pattern in filenamePatterns"
              :key="pattern.id"
              class="pattern-group border rounded-lg p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h4 class="font-medium">{{ pattern.name }}</h4>
                  <p class="text-xs text-muted-foreground">{{ pattern.description }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {{ Math.round(pattern.confidence * 100) }}% confidence
                    </span>
                    <span class="text-xs text-muted-foreground">
                      {{ pattern.matchedFiles.length }} files
                    </span>
                  </div>
                </div>
                
                <button
                  @click="applyPatternToAll(pattern)"
                  class="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                >
                  Apply to {{ pattern.matchedFiles.length }} files
                </button>
              </div>
              
              <!-- Pattern Segments -->
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <HierarchySegmentCard
                  v-for="(segment, index) in pattern.segments"
                  :key="`${pattern.id}-${index}`"
                  :segment="segment"
                  :is-scanning="isScanning"
                  :show-examples="true"
                  @context-assigned="handlePatternSegmentAssigned(pattern, index, $event)"
                  @segment-clicked="handleSegmentClicked"
                />
              </div>
              
              <!-- Examples -->
              <div class="mt-3 pt-3 border-t">
                <div class="text-xs text-muted-foreground mb-2">Examples:</div>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="example in pattern.examples.slice(0, 3)"
                    :key="example"
                    class="text-xs px-2 py-1 bg-muted rounded font-mono"
                  >
                    {{ example }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Advanced Relationship Analysis -->
        <div class="mt-8">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-sm font-medium text-muted-foreground">
              🎬 Advanced Pattern Analysis
            </span>
            <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              NLP Enhanced
            </span>
            <div class="flex-1 h-px bg-border"></div>
          </div>
          
          <!-- Capture Rolls and Clip Sequences -->
          <div v-if="relationshipAnalysis.captureRolls.size > 0" class="mb-4">
            <h5 class="font-medium text-sm mb-2">📼 Capture Rolls & Clip Sequences</h5>
            <div class="space-y-2">
              <div
                v-for="[rollId, rollData] in relationshipAnalysis.captureRolls"
                :key="rollId"
                class="p-3 border border-purple-200 rounded-lg bg-purple-50/50"
              >
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <span class="font-mono font-medium">{{ rollId }}</span>
                    <span class="text-xs text-muted-foreground ml-2">
                      {{ rollData.files.length }} files
                    </span>
                    <span v-if="rollData.clips.size > 0" class="text-xs text-purple-700 ml-2">
                      {{ rollData.clips.size }} clip sequences
                    </span>
                  </div>
                  <button
                    @click="assignRollContext(rollId, rollData)"
                    class="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                  >
                    Assign as Capture Roll
                  </button>
                </div>
                
                <!-- Clip Sequences within Roll -->
                <div v-if="rollData.clips.size > 0" class="mt-2 ml-4 space-y-1">
                  <div
                    v-for="[clipId, clipFiles] in rollData.clips"
                    :key="clipId"
                    class="flex items-center justify-between text-xs p-2 bg-purple-100/50 rounded"
                  >
                    <span class="font-mono">{{ clipId }}</span>
                    <span class="text-muted-foreground">{{ clipFiles.length }} files</span>
                    <button
                      @click="assignClipContext(clipId, clipFiles, rollId)"
                      class="px-2 py-1 bg-purple-200 text-purple-800 rounded hover:bg-purple-300"
                    >
                      Assign Sequence
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Format Groups -->
          <div v-if="relationshipAnalysis.formatGroups.size > 0" class="mb-4">
            <h5 class="font-medium text-sm mb-2">🎨 Format Groups</h5>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="[formatKey, formatData] in relationshipAnalysis.formatGroups"
                :key="formatKey"
                class="p-2 border border-green-200 rounded bg-green-50/50"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium">{{ formatData.format }}</span>
                  <span class="text-xs text-muted-foreground">{{ formatData.files.length }} files</span>
                </div>
                <button
                  @click="assignFormatContext(formatKey, formatData)"
                  class="mt-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 w-full"
                >
                  Assign Format Context
                </button>
              </div>
            </div>
          </div>

          <!-- Temporal Groups -->
          <div v-if="relationshipAnalysis.temporalGroups.size > 0" class="mb-4">
            <h5 class="font-medium text-sm mb-2">📅 Temporal Groups</h5>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="[timeKey, timeData] in relationshipAnalysis.temporalGroups"
                :key="timeKey"
                class="p-2 border border-orange-200 rounded bg-orange-50/50"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium">{{ timeData.timeContext }}</span>
                  <span class="text-xs text-muted-foreground">{{ timeData.files.length }} files</span>
                </div>
                <button
                  @click="assignTemporalContext(timeKey, timeData)"
                  class="mt-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded hover:bg-orange-200 w-full"
                >
                  Assign Time Context
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Variable Occurrences -->
        <div class="mt-8">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-sm font-medium text-muted-foreground">
              Multi-Location Variables
            </span>
            <div class="flex-1 h-px bg-border"></div>
          </div>
          
          <div class="space-y-2">
            <div
              v-for="variable in multiLocationVariables"
              :key="variable.name"
              class="variable-occurrence border rounded-lg p-3"
            >
              <div class="flex items-center justify-between mb-2">
                <div>
                  <h4 class="font-medium">{{ variable.name }}</h4>
                  <p class="text-xs text-muted-foreground">
                    Found in {{ variable.locations.length }} different locations
                  </p>
                </div>
                
                <button
                  @click="unifyVariable(variable)"
                  class="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                >
                  Unify as {{ variable.suggestedType }}
                </button>
              </div>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  v-for="location in variable.locations"
                  :key="location.id"
                  class="text-xs p-2 bg-muted/50 rounded"
                >
                  <div class="font-medium">{{ location.type }} - Level {{ location.level }}</div>
                  <div class="text-muted-foreground">{{ location.files.length }} files</div>
                  <div class="font-mono">{{ location.examples[0] }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Context Assignment Panel -->
    <div v-if="selectedSegment" class="border-t p-4 bg-muted/10">
      <ContextAssignmentPanel
        :segment="selectedSegment"
        :suggested-contexts="suggestedContexts"
        @context-assigned="handleQuickContextAssign"
        @panel-closed="selectedSegment = null"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FileNode } from '@/types'
import { redNamingPatterns, analyzeFilename, analyzeFolderPath, commonSegmentTypes, analyzeFileRelationships, inferContextFromPatterns } from '@/data/redNamingConventions'
import HierarchySegmentCard from './HierarchySegmentCard.vue'
import ContextAssignmentPanel from './ContextAssignmentPanel.vue'

interface Props {
  allFiles: FileNode[]
  isScanning?: boolean
}

interface HierarchySegment {
  id: string
  name: string
  type: 'folder' | 'filename' | 'pattern'
  value: string
  level: number
  confidence: number
  files: FileNode[]
  examples: string[]
  assignedContext?: string
  contextType?: string
  suggestedContexts: string[]
}

interface PatternMatch {
  id: string
  name: string
  description: string
  confidence: number
  matchedFiles: FileNode[]
  segments: HierarchySegment[]
  examples: string[]
}

interface MultiLocationVariable {
  name: string
  suggestedType: string
  confidence: number
  locations: {
    id: string
    type: 'folder' | 'filename'
    level: number
    files: FileNode[]
    examples: string[]
  }[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'context-assigned': [segment: HierarchySegment, context: string, contextType: string]
  'pattern-applied': [pattern: PatternMatch, segments: HierarchySegment[]]
  'contexts-updated': [contexts: any[]]
}>()

// State
const selectedSegment = ref<HierarchySegment | null>(null)
const assignedContexts = ref<Map<string, { context: string; type: string }>>(new Map())

// Process all files and extract hierarchy segments
const hierarchyLevels = computed(() => {
  const levelMap = new Map<number, Map<string, HierarchySegment>>()
  
  props.allFiles.forEach(file => {
    const pathSegments = file.path.split('/').filter(Boolean)
    
    pathSegments.forEach((segment, level) => {
      if (!levelMap.has(level)) {
        levelMap.set(level, new Map())
      }
      
      const levelSegments = levelMap.get(level)!
      const existing = levelSegments.get(segment.toLowerCase())
      
      if (existing) {
        if (!existing.files.some(f => f.path === file.path && f.name === file.name)) {
          existing.files.push(file)
        }
        if (!existing.examples.includes(file.path)) {
          existing.examples.push(file.path)
        }
      } else {
        const folderAnalysis = analyzeFolderPath(segment)
        const segmentInfo = folderAnalysis.segments.find(s => s.name === segment) || {
          name: segment,
          type: 'folder',
          confidence: 0.5,
          level
        }
        
        levelSegments.set(segment.toLowerCase(), {
          id: `folder-${level}-${segment.toLowerCase()}`,
          name: segment,
          type: 'folder',
          value: segment,
          level,
          confidence: segmentInfo.confidence,
          files: [file],
          examples: [file.path],
          suggestedContexts: getSuggestedContexts(segment, 'folder')
        })
      }
    })
  })
  
  return Array.from(levelMap.entries())
    .map(([depth, segmentMap]) => ({
      depth,
      segments: Array.from(segmentMap.values()).sort((a, b) => b.files.length - a.files.length)
    }))
    .sort((a, b) => a.depth - b.depth)
})

const filenamePatterns = computed((): PatternMatch[] => {
  const patterns: PatternMatch[] = []
  
  redNamingPatterns.forEach(pattern => {
    const matchedFiles: FileNode[] = []
    const examples: string[] = []
    
    props.allFiles.forEach(file => {
      if (pattern.pattern.test(file.name)) {
        matchedFiles.push(file)
        if (examples.length < 5) {
          examples.push(file.name)
        }
      }
    })
    
    if (matchedFiles.length > 0) {
      // Create segments for this pattern
      const segments: HierarchySegment[] = pattern.segments.map(segment => ({
        id: `pattern-${pattern.id}-${segment.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: segment.name,
        type: 'pattern',
        value: segment.pattern,
        level: segment.position,
        confidence: pattern.confidence,
        files: matchedFiles,
        examples: examples,
        suggestedContexts: getSuggestedContexts(segment.name, segment.type)
      }))
      
      patterns.push({
        id: pattern.id,
        name: pattern.name,
        description: pattern.description,
        confidence: pattern.confidence,
        matchedFiles,
        segments,
        examples
      })
    }
  })
  
  return patterns.sort((a, b) => b.matchedFiles.length - a.matchedFiles.length)
})

const filenameSegments = computed(() => {
  return filenamePatterns.value.reduce((acc, pattern) => acc + pattern.segments.length, 0)
})

const discoveredSegments = computed(() => {
  const folderSegments = hierarchyLevels.value.reduce((acc, level) => acc + level.segments.length, 0)
  return folderSegments + filenameSegments.value
})

const multiLocationVariables = computed((): MultiLocationVariable[] => {
  const variableMap = new Map<string, MultiLocationVariable>()
  
  // Look for same values appearing in different contexts
  const allSegments = [
    ...hierarchyLevels.value.flatMap(level => level.segments),
    ...filenamePatterns.value.flatMap(pattern => pattern.segments)
  ]
  
  allSegments.forEach(segment => {
    // Extract potential variable values (numbers, short codes, etc.)
    const matches = segment.value.match(/([A-Z]\d{3}|\d{3,4}|[A-Z]{2,4})/g)
    
    if (matches) {
      matches.forEach(match => {
        const key = match.toLowerCase()
        const existing = variableMap.get(key)
        
        if (existing) {
          const locationExists = existing.locations.some(loc => 
            loc.type === segment.type && loc.level === segment.level
          )
          
          if (!locationExists) {
            existing.locations.push({
              id: segment.id,
              type: segment.type,
              level: segment.level,
              files: segment.files,
              examples: segment.examples.slice(0, 3)
            })
          }
        } else {
          const suggestedType = detectVariableType(match, segment)
          
          variableMap.set(key, {
            name: match,
            suggestedType,
            confidence: 0.8,
            locations: [{
              id: segment.id,
              type: segment.type,
              level: segment.level,
              files: segment.files,
              examples: segment.examples.slice(0, 3)
            }]
          })
        }
      })
    }
  })
  
  // Only return variables that appear in multiple locations
  return Array.from(variableMap.values())
    .filter(variable => variable.locations.length > 1)
    .sort((a, b) => b.locations.length - a.locations.length)
})

const suggestedContexts = computed(() => {
  if (!selectedSegment.value) return []
  return selectedSegment.value.suggestedContexts
})

// Advanced relationship analysis using NLP
const relationshipAnalysis = computed(() => {
  return analyzeFileRelationships(props.allFiles)
})

// Enhanced NLP-based context suggestion
function getSuggestedContexts(value: string, type: string): string[] {
  // Use the advanced NLP analysis to get intelligent suggestions
  const analysisResult = inferContextFromPatterns(value, type as any, props.allFiles)
  const suggestions: string[] = [analysisResult.suggestedContext]
  
  // Add context type as a suggestion
  suggestions.push(analysisResult.contextType)
  
  // Add specific suggestions based on detected patterns
  if (analysisResult.contextType === 'captureRoll') {
    suggestions.push('capture-roll', 'media-card', 'reel-id', 'roll-sequence')
  }
  
  if (analysisResult.contextType === 'clipSequence') {
    suggestions.push('clip-sequence', 'take-number', 'shot-number')
  }
  
  if (analysisResult.contextType === 'format') {
    suggestions.push('codec', 'resolution', 'color-space', 'media-format')
  }
  
  if (analysisResult.contextType === 'temporal') {
    suggestions.push('shoot-date', 'time-of-day', 'event-timeline')
  }
  
  // Legacy pattern detection for compatibility
  const lowerValue = value.toLowerCase()
  
  // Enhanced capture roll detection (A001, B002, C003...)
  if (/[A-Z]\d{3}/.test(value)) {
    const rollAnalysis = analyzeFileRelationships(props.allFiles)
    if (rollAnalysis.captureRolls.has(value)) {
      const roll = rollAnalysis.captureRolls.get(value)
      suggestions.push('capture-roll')
      if (roll.clips.size > 0) {
        suggestions.push('clip-master', 'sequence-parent')
      }
    }
  }
  
  // Enhanced clip sequence detection (C001, C002...)
  if (/[C]\d{3}/i.test(value)) {
    suggestions.push('clip-sequence', 'clip-number', 'take-sequence')
  }
  
  // Format and technical pattern detection
  if (/r3d|braw|prores|4k|8k|log|rec709/i.test(lowerValue)) {
    suggestions.push('media-format', 'codec', 'color-space')
  }
  
  if (/\d+fps|iso\d+|f\d+\.?\d*/i.test(value)) {
    suggestions.push('technical-specs', 'camera-settings', 'shooting-params')
  }
  
  // Camera and equipment detection
  if (/red|arri|canon|sony|blackmagic|helium|monstro|komodo/i.test(lowerValue)) {
    suggestions.push('camera-model', 'equipment-type', 'camera-system')
  }
  
  // Project and content detection
  if (/easter|christmas|wedding|concert|sunday|service|commercial|documentary/i.test(lowerValue)) {
    suggestions.push('project-name', 'event-type', 'content-category')
  }
  
  // Production status and workflow
  if (/final|approved|ready|draft|wip|review|raw|edited|color|graded/i.test(lowerValue)) {
    suggestions.push('production-status', 'workflow-stage', 'approval-status')
  }
  
  // Location and venue detection
  if (/sanctuary|lobby|stage|exterior|interior|room|studio|backstage/i.test(lowerValue)) {
    suggestions.push('shooting-location', 'venue', 'set-location')
  }
  
  return [...new Set(suggestions)]
}

function detectVariableType(value: string, segment: HierarchySegment): string {
  if (/[A-Z]\d{3}/.test(value)) {
    if (segment.type === 'pattern' || /reel|roll/i.test(segment.name)) {
      return 'reel-id'
    }
    if (/cam|camera/i.test(segment.name)) {
      return 'camera-id'
    }
    return 'identifier'
  }
  
  if (/\d{3,4}/.test(value)) {
    if (/clip|take|shot/i.test(segment.name)) {
      return 'sequence-number'
    }
    return 'number'
  }
  
  if (/\d{8}/.test(value)) {
    return 'date'
  }
  
  return 'variable'
}

function handleContextAssigned(segment: HierarchySegment, context: string, contextType: string) {
  assignedContexts.value.set(segment.id, { context, type: contextType })
  segment.assignedContext = context
  segment.contextType = contextType
  
  emit('context-assigned', segment, context, contextType)
}

function handlePatternSegmentAssigned(pattern: PatternMatch, segmentIndex: number, assignment: { context: string; type: string }) {
  const segment = pattern.segments[segmentIndex]
  handleContextAssigned(segment, assignment.context, assignment.type)
}

function handleSegmentClicked(segment: HierarchySegment) {
  selectedSegment.value = selectedSegment.value?.id === segment.id ? null : segment
}

function handleQuickContextAssign(context: string, contextType: string) {
  if (selectedSegment.value) {
    handleContextAssigned(selectedSegment.value, context, contextType)
    selectedSegment.value = null
  }
}

function applyPatternToAll(pattern: PatternMatch) {
  pattern.segments.forEach(segment => {
    if (!segment.assignedContext) {
      const defaultContext = segment.suggestedContexts[0]
      if (defaultContext) {
        handleContextAssigned(segment, defaultContext, segment.type)
      }
    }
  })
  
  emit('pattern-applied', pattern, pattern.segments)
}

function unifyVariable(variable: MultiLocationVariable) {
  // Create a unified context for this variable across all locations
  variable.locations.forEach(location => {
    const segment = hierarchyLevels.value
      .flatMap(level => level.segments)
      .find(s => s.id === location.id)
    
    if (segment) {
      handleContextAssigned(segment, variable.name, variable.suggestedType)
    }
  })
}

function autoDetectContexts() {
  let assignedCount = 0
  
  // Auto-assign high-confidence patterns
  filenamePatterns.value.forEach(pattern => {
    if (pattern.confidence >= 0.9) {
      pattern.segments.forEach(segment => {
        if (!segment.assignedContext && segment.suggestedContexts.length > 0) {
          handleContextAssigned(segment, segment.suggestedContexts[0], segment.type)
          assignedCount++
        }
      })
    }
  })
  
  // Auto-assign clear folder patterns
  hierarchyLevels.value.forEach(level => {
    level.segments.forEach(segment => {
      if (!segment.assignedContext && segment.confidence >= 0.8 && segment.suggestedContexts.length > 0) {
        handleContextAssigned(segment, segment.suggestedContexts[0], segment.suggestedContexts[0])
        assignedCount++
      }
    })
  })
  
  alert(`Auto-assigned contexts to ${assignedCount} segments`)
}

function exportContexts() {
  const contexts = Array.from(assignedContexts.value.entries()).map(([segmentId, assignment]) => ({
    segmentId,
    ...assignment
  }))
  
  const data = JSON.stringify({ contexts, patterns: filenamePatterns.value }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hierarchy-contexts.json'
  a.click()
  URL.revokeObjectURL(url)
}

// Watch for new files during scanning
watch(() => props.allFiles.length, () => {
  // Re-analysis happens automatically through computed properties
})

// New handler methods for advanced relationship analysis
function assignRollContext(rollId: string, rollData: any) {
  console.log('Assigning capture roll context:', rollId, rollData.files.length, 'files')
  
  // Create a virtual segment for this capture roll
  rollData.files.forEach((file: any) => {
    const segmentId = `capture-roll-${rollId}`
    assignedContexts.value.set(segmentId, {
      context: `capture-roll-${rollId}`,
      type: 'captureRoll'
    })
  })
  
  emit('context-assigned', {
    id: `capture-roll-${rollId}`,
    name: rollId,
    type: 'pattern',
    value: rollId,
    level: 0,
    confidence: 0.90,
    files: rollData.files,
    examples: rollData.files.slice(0, 3).map((f: any) => f.name),
    suggestedContexts: ['capture-roll', 'media-card', 'reel-id']
  }, `capture-roll-${rollId}`, 'captureRoll')
  
  updateContexts()
}

function assignClipContext(clipId: string, clipFiles: any[], rollId: string) {
  console.log('Assigning clip sequence context:', clipId, clipFiles.length, 'files in roll', rollId)
  
  clipFiles.forEach((file: any) => {
    const segmentId = `clip-sequence-${rollId}-${clipId}`
    assignedContexts.value.set(segmentId, {
      context: `${rollId}-${clipId}`,
      type: 'clipSequence'
    })
  })
  
  emit('context-assigned', {
    id: `clip-sequence-${rollId}-${clipId}`,
    name: `${rollId}_${clipId}`,
    type: 'pattern',
    value: clipId,
    level: 1,
    confidence: 0.92,
    files: clipFiles,
    examples: clipFiles.slice(0, 3).map((f: any) => f.name),
    suggestedContexts: ['clip-sequence', 'take-number', 'shot-number']
  }, `${rollId}-${clipId}`, 'clipSequence')
  
  updateContexts()
}

function assignFormatContext(formatKey: string, formatData: any) {
  console.log('Assigning format context:', formatKey, formatData.files.length, 'files')
  
  formatData.files.forEach((file: any) => {
    const segmentId = `format-${formatKey}`
    assignedContexts.value.set(segmentId, {
      context: formatData.format,
      type: 'format'
    })
  })
  
  emit('context-assigned', {
    id: `format-${formatKey}`,
    name: formatData.format,
    type: 'pattern',
    value: formatData.format,
    level: 0,
    confidence: 0.88,
    files: formatData.files,
    examples: formatData.files.slice(0, 3).map((f: any) => f.name),
    suggestedContexts: ['media-format', 'codec', 'color-space']
  }, formatData.format, 'format')
  
  updateContexts()
}

function assignTemporalContext(timeKey: string, timeData: any) {
  console.log('Assigning temporal context:', timeKey, timeData.files.length, 'files')
  
  timeData.files.forEach((file: any) => {
    const segmentId = `temporal-${timeKey}`
    assignedContexts.value.set(segmentId, {
      context: timeData.timeContext,
      type: 'temporal'
    })
  })
  
  emit('context-assigned', {
    id: `temporal-${timeKey}`,
    name: timeData.timeContext,
    type: 'pattern',
    value: timeData.timeContext,
    level: 0,
    confidence: 0.85,
    files: timeData.files,
    examples: timeData.files.slice(0, 3).map((f: any) => f.name),
    suggestedContexts: ['shoot-date', 'time-of-day', 'event-timeline']
  }, timeData.timeContext, 'temporal')
  
  updateContexts()
}

function updateContexts() {
  // Convert assigned contexts to DetectedContext format and emit
  const contexts = Array.from(assignedContexts.value.entries()).map(([segmentId, assignment]) => ({
    id: segmentId,
    name: assignment.context,
    type: assignment.type,
    description: `Auto-detected ${assignment.type} context`,
    confidence: 0.85,
    tags: [assignment.type],
    files: props.allFiles.filter(file => 
      file.name.includes(assignment.context) || 
      file.path.includes(assignment.context)
    )
  }))
  
  emit('contexts-updated', contexts)
}
</script>

<style scoped>
.hierarchy-level {
  @apply pb-4;
}

.pattern-group {
  @apply transition-all duration-200 hover:shadow-md;
}

.variable-occurrence {
  @apply transition-all duration-200 hover:shadow-sm;
}
</style>