<template>
  <div class="path-segment-labels space-y-3">
    <!-- Enhanced Path Structure with Drill-down -->
    <div class="space-y-2">
      <div class="text-xs font-medium text-muted-foreground">Path Structure</div>
      <div class="space-y-1">
        <!-- Hierarchical view with expand/collapse -->
        <div v-for="(level, levelIndex) in hierarchicalPath" :key="levelIndex" class="space-y-1">
          <!-- Level header -->
          <div class="flex items-center gap-2">
            <button
              @click="toggleLevelExpansion(levelIndex)"
              class="flex items-center gap-1 text-xs hover:bg-accent rounded px-1"
            >
              <span class="text-xs transition-transform" :class="{ 'rotate-90': level.expanded }">▶</span>
              <span class="font-medium">Level {{ levelIndex + 1 }}</span>
            </button>
            <div class="flex items-center gap-1">
              <button
                @click="handleSegmentClick(level.segment, levelIndex, 'path', $event)"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105"
                :class="getSegmentStyle('path-level', level.hasSmartPattern)"
                :title="`Path level ${levelIndex + 1}: ${level.segment}`"
              >
                <span class="w-2 h-2 rounded-full bg-current opacity-70"></span>
                {{ level.segment }}
              </button>
            </div>
          </div>
          
          <!-- Expanded split parts for this level -->
          <div v-if="level.expanded && level.splitParts.length > 0" class="ml-6 space-y-1">
            <div class="text-xs text-muted-foreground">Split Parts:</div>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="(part, partIndex) in level.splitParts"
                :key="partIndex"
                @click="handleSegmentClick(part, levelIndex, 'split', $event, partIndex)"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105"
                :class="getSegmentStyle('separator-split', part.hasSmartPattern)"
                :title="part.description"
              >
                <span class="w-2 h-2 rounded-full bg-current opacity-70"></span>
                {{ part.value }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filename breakdown with instant expansion -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <button
          @click="showFilenameParts = !showFilenameParts"
          class="flex items-center gap-1 text-xs hover:bg-accent rounded px-1"
        >
          <span class="text-xs transition-transform" :class="{ 'rotate-90': showFilenameParts }">▶</span>
          <span class="font-medium text-muted-foreground">Filename</span>
        </button>
        <button
          @click="handleSegmentClick({ value: filename, type: 'filename' }, -1, 'filename', $event)"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105"
          :class="getSegmentStyle('filename', hasFilenameSmartPattern)"
          :title="`Full filename: ${filename}`"
        >
          <span class="w-2 h-2 rounded-full bg-current opacity-70"></span>
          {{ filename }}
        </button>
      </div>
      
      <!-- Expanded filename parts -->
      <div v-if="showFilenameParts && filenameParts.length > 0" class="ml-6 space-y-1">
        <div class="text-xs text-muted-foreground">Split Parts:</div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="(part, partIndex) in filenameParts"
            :key="partIndex"
            @click="handleSegmentClick(part, -1, 'filename-split', $event, partIndex)"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105"
            :class="getSegmentStyle('filename-split', part.hasSmartPattern)"
            :title="part.description"
          >
            <span class="w-2 h-2 rounded-full bg-current opacity-70"></span>
            {{ part.value }}
          </button>
        </div>
      </div>
    </div>

    <!-- Smart Patterns (always visible) -->
    <div v-if="smartPatterns.length > 0" class="space-y-2">
      <div class="text-xs font-medium text-muted-foreground">🎯 Smart Patterns</div>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="pattern in smartPatterns"
          :key="pattern.id"
          @click="handleSegmentClick(pattern, -1, 'pattern', $event)"
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105"
          :class="getSegmentStyle(pattern.type, true)"
          :title="pattern.description"
        >
          <span>{{ getPatternIcon(pattern.type) }}</span>
          <span class="font-semibold">{{ pattern.name }}</span>
          <span class="opacity-75">{{ pattern.value }}</span>
        </button>
      </div>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        ref="contextMenuRef"
        class="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-2 min-w-48"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <div class="px-3 py-1 text-xs font-medium text-muted-foreground border-b mb-1">
          Create Ingest Rule for: {{ contextMenu.segment?.value }}
        </div>
        <button
          @click="createIngestRule('exact')"
          class="w-full text-left px-3 py-1 text-sm hover:bg-accent"
        >
          📌 Exact Match Rule
        </button>
        <button
          @click="createIngestRule('pattern')"
          class="w-full text-left px-3 py-1 text-sm hover:bg-accent"
        >
          🎯 Pattern-based Rule
        </button>
        <button
          @click="createIngestRule('hierarchy')"
          class="w-full text-left px-3 py-1 text-sm hover:bg-accent"
        >
          🏗️ Hierarchy Rule (affects siblings)
        </button>
        <div class="border-t my-1"></div>
        <button
          @click="createAdvancedIngestRule"
          class="w-full text-left px-3 py-1 text-sm hover:bg-accent text-primary font-medium"
        >
          ⚙️ Create Advanced Ingest Rule
        </button>
        <div class="border-t my-1"></div>
        <button
          @click="addToCustomHierarchy"
          class="w-full text-left px-3 py-1 text-sm hover:bg-accent text-primary"
        >
          Add to Custom Hierarchy
        </button>
      </div>
    </Teleport>

    <!-- Legend -->
    <div class="pt-2 border-t border-border/50">
      <div class="text-xs text-muted-foreground mb-2">Click segments to expand parts or create rules:</div>
      <div class="flex flex-wrap gap-2 text-xs">
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Path Levels</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          <span>Split Parts</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-purple-500"></span>
          <span>Smart Patterns</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-orange-500"></span>
          <span>Filename</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { FileNode } from '@/types'

interface Props {
  file: FileNode
  potentialVariables: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'create-rule': [variable: any]
  'add-to-hierarchy': [segment: any, hierarchyData: any]
  'create-advanced-rule': [segment: any, context: any]
}>()

// State for hierarchical view
const levelExpansions = ref<Record<number, boolean>>({})
const showFilenameParts = ref(false)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  segment: null as any,
  levelIndex: -1,
  segmentType: '',
  partIndex: -1
})
const contextMenuRef = ref<HTMLElement>()

// Smart pattern detection functions
function detectSmartPatterns(text: string) {
  const patterns = []
  
  // Date patterns
  if (/\d{4}[-_]\d{2}[-_]\d{2}/.test(text)) patterns.push('date')
  if (/\d{2}[-_]\d{2}[-_]\d{4}/.test(text)) patterns.push('date')
  
  // Time patterns  
  if (/\d{2}[-_:]\d{2}[-_:]\d{2}/.test(text)) patterns.push('time')
  
  // Sequence patterns
  if (/[A-Z]\d{3,}/.test(text)) patterns.push('sequence')
  if (/\d{3,}/.test(text)) patterns.push('sequence')
  
  // Version patterns
  if (/v\d+(\.\d+)*/.test(text.toLowerCase())) patterns.push('version')
  
  return patterns
}

interface SplitPart {
  value: string
  separator: string
  index: number
  hasSmartPattern: boolean
  smartPatterns: string[]
  description: string
}

function splitSegment(segment: string): SplitPart[] {
  const separators = ['_', '-', '.', ' ']
  const parts: SplitPart[] = []
  
  separators.forEach(separator => {
    if (segment.includes(separator)) {
      const splitParts = segment.split(separator)
      if (splitParts.length > 1) {
        splitParts.forEach((part, index) => {
          if (part.trim()) {
            parts.push({
              value: part,
              separator,
              index,
              hasSmartPattern: detectSmartPatterns(part).length > 0,
              smartPatterns: detectSmartPatterns(part),
              description: `Part ${index + 1} of "${segment}" split by "${separator}"`
            })
          }
        })
      }
    }
  })
  
  return parts
}

// Computed properties
const hierarchicalPath = computed(() => {
  const parts = props.file.path.split('/').filter(part => part)
  return parts.map((segment, index) => {
    const splitParts = splitSegment(segment)
    const hasSmartPattern = detectSmartPatterns(segment).length > 0
    
    return {
      segment,
      hasSmartPattern,
      smartPatterns: detectSmartPatterns(segment),
      splitParts,
      expanded: levelExpansions.value[index] || false
    }
  })
})

const filename = computed(() => props.file.name)

const filenameParts = computed(() => {
  const nameWithoutExt = props.file.name.split('.')[0]
  return splitSegment(nameWithoutExt)
})

const hasFilenameSmartPattern = computed(() => {
  return detectSmartPatterns(props.file.name).length > 0
})

interface SmartPattern {
  id: number
  name: string
  value: string
  type: string
  description: string
}

const smartPatterns = computed((): SmartPattern[] => {
  const patterns: SmartPattern[] = []
  let id = 0
  
  // Extract patterns from all segments
  const allText = [props.file.path, props.file.name].join(' ')
  
  // Date patterns
  const dateMatches = allText.match(/\d{4}[-_]\d{2}[-_]\d{2}/g)
  if (dateMatches) {
    dateMatches.forEach(match => {
      patterns.push({
        id: ++id,
        name: 'Date',
        value: match,
        type: 'date-pattern',
        description: `Date pattern: ${match}`
      })
    })
  }
  
  // Time patterns
  const timeMatches = allText.match(/\d{2}[-_:]\d{2}[-_:]\d{2}/g)
  if (timeMatches) {
    timeMatches.forEach(match => {
      patterns.push({
        id: ++id,
        name: 'Time',
        value: match,
        type: 'time-pattern',
        description: `Time pattern: ${match}`
      })
    })
  }
  
  // Sequence patterns
  const sequenceMatches = allText.match(/[A-Z]\d{3,}/g)
  if (sequenceMatches) {
    sequenceMatches.forEach(match => {
      patterns.push({
        id: ++id,
        name: 'Sequence',
        value: match,
        type: 'sequence-pattern',
        description: `Sequence pattern: ${match}`
      })
    })
  }
  
  return patterns
})

// Methods
function toggleLevelExpansion(levelIndex: number) {
  levelExpansions.value[levelIndex] = !levelExpansions.value[levelIndex]
}

function handleSegmentClick(segment: any, levelIndex: number, segmentType: string, event: MouseEvent, partIndex = -1) {
  event.preventDefault()
  event.stopPropagation()
  
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    segment,
    levelIndex,
    segmentType,
    partIndex
  }
}

function createIngestRule(ruleType: 'exact' | 'pattern' | 'hierarchy') {
  const { segment, levelIndex, segmentType, partIndex } = contextMenu.value
  
  const ruleData = {
    type: ruleType,
    segment,
    levelIndex,
    segmentType,
    partIndex,
    value: segment.value || segment,
    source: 'enhanced-path-labels'
  }
  
  emit('create-rule', ruleData)
  hideContextMenu()
}

function addToCustomHierarchy() {
  const { segment, levelIndex, segmentType, partIndex } = contextMenu.value
  
  const hierarchyData = {
    segment,
    levelIndex,
    segmentType,
    partIndex,
    path: props.file.path,
    filename: props.file.name
  }
  
  emit('add-to-hierarchy', segment, hierarchyData)
  hideContextMenu()
}

function createAdvancedIngestRule() {
  const { segment, levelIndex, segmentType, partIndex } = contextMenu.value
  
  const context = {
    segment,
    levelIndex,
    segmentType,
    partIndex,
    path: props.file.path,
    filename: props.file.name,
    hierarchicalPath: hierarchicalPath.value,
    smartPatterns: smartPatterns.value
  }
  
  emit('create-advanced-rule', segment, context)
  hideContextMenu()
}

function hideContextMenu() {
  contextMenu.value.visible = false
}

function getSegmentStyle(type: string, hasSmartPattern = false) {
  let baseClass = ''
  
  switch (type) {
    case 'path-level':
      baseClass = 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800'
      break
    case 'separator-split':
    case 'filename-split':
      baseClass = 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
      break
    case 'filename':
      baseClass = 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:hover:bg-orange-800'
      break
    case 'date-pattern':
    case 'time-pattern':
    case 'sequence-pattern':
      baseClass = 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800'
      break
    default:
      baseClass = 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
  }
  
  // Add purple tint for smart patterns
  if (hasSmartPattern && !['date-pattern', 'time-pattern', 'sequence-pattern'].includes(type)) {
    baseClass = baseClass.replace(/bg-(\w+)-100/, 'bg-purple-100').replace(/text-(\w+)-800/, 'text-purple-800')
      .replace(/hover:bg-(\w+)-200/, 'hover:bg-purple-200').replace(/dark:bg-(\w+)-900/, 'dark:bg-purple-900')
      .replace(/dark:text-(\w+)-200/, 'dark:text-purple-200').replace(/dark:hover:bg-(\w+)-800/, 'dark:hover:bg-purple-800')
  }
  
  return baseClass
}

function getPatternIcon(type: string) {
  switch (type) {
    case 'date-pattern': return '📅'
    case 'time-pattern': return '⏰'
    case 'sequence-pattern': return '🎬'
    case 'version-pattern': return '🔢'
    default: return '🔍'
  }
}

// Click outside handler
function handleClickOutside(event: MouseEvent) {
  if (contextMenuRef.value && !contextMenuRef.value.contains(event.target as Node)) {
    hideContextMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.path-segment-labels button:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>