<template>
  <div class="file-tree-item">
    <div 
      class="flex items-center gap-1 py-1 px-1 rounded hover:bg-accent cursor-pointer group"
      :class="{
        'bg-primary/10 border border-primary/20': isSelected,
        'bg-accent/50': isAffectedByRule
      }"
      :style="{ paddingLeft: `${depth * 16 + 4}px` }"
      @click="handleClick"
    >
      <!-- Expand/Collapse Icon -->
      <span v-if="node.type === 'directory'" class="text-sm w-4 flex-shrink-0">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
      <span v-else class="w-4 flex-shrink-0"></span>
      
      <!-- File/Folder Icon -->
      <span class="text-lg flex-shrink-0">
        {{ getNodeIcon() }}
      </span>
      
      <!-- File Name -->
      <span class="flex-1 text-sm truncate" :class="{ 'font-medium': isSelected }">
        {{ node.name }}
      </span>
      
      <!-- File Size -->
      <span v-if="node.type === 'file'" class="text-xs text-muted-foreground flex-shrink-0">
        {{ formatFileSize(node.size || 0) }}
      </span>
      
      <!-- Rule Indicators -->
      <div v-if="matchingRules.length > 0" class="flex gap-1 flex-shrink-0">
        <span 
          v-for="rule in matchingRules.slice(0, 3)" 
          :key="rule.id"
          class="w-2 h-2 rounded-full bg-primary"
          :title="rule.name"
        ></span>
        <span v-if="matchingRules.length > 3" class="text-xs text-muted-foreground">
          +{{ matchingRules.length - 3 }}
        </span>
      </div>
    </div>
    
    <!-- Children -->
    <div v-if="isExpanded && node.children">
      <FileTreeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :selected-file="selectedFile"
        :active-rules="activeRules"
        :is-partial-scan="isPartialScan"
        @file-selected="$emit('file-selected', $event)"
        @create-rule="$emit('create-rule', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { FileNode, IngestRule } from '@/types'

interface Props {
  node: FileNode
  depth: number
  selectedFile?: FileNode | null
  activeRules: IngestRule[]
  isPartialScan?: boolean
}

const props = defineProps<Props>()
const isExpanded = ref(false)

// Component is working correctly now, removed debug logging

// Auto-expand directories during partial scan to show progressive content
// But only if not manually controlled by user
const hasBeenManuallyToggled = ref(false)

watch(
  () => [props.isPartialScan, props.node.children?.length],
  ([partialScan, childrenLength]) => {
    // Only auto-expand if:
    // 1. We're in a partial scan
    // 2. This is a directory with children
    // 3. User hasn't manually toggled this folder
    // 4. Folder is not already expanded
    if (partialScan && 
        props.node.type === 'directory' && 
        childrenLength && childrenLength > 0 && 
        !hasBeenManuallyToggled.value && 
        !isExpanded.value) {
      isExpanded.value = true
    }
  },
  { immediate: true }
)

// Don't reset manual toggle state when scanning stops - preserve user choices
// Only reset if this is a completely new root node
let lastRootPath = ''
watch(
  () => props.node.path.split('/')[0], // Watch root path changes
  (newRootPath) => {
    if (newRootPath !== lastRootPath && lastRootPath !== '') {
      // Only reset when switching to a different project root
      hasBeenManuallyToggled.value = false
      isExpanded.value = false
    }
    lastRootPath = newRootPath
  }
)

const emit = defineEmits<{
  'file-selected': [file: FileNode]
  'create-rule': [data: any]
}>()

const isSelected = computed(() => 
  props.selectedFile?.path === props.node.path
)

const matchingRules = computed(() => 
  props.activeRules.filter(rule => 
    rule.pathPatterns.some(pattern => 
      props.node.path.includes(pattern.pattern)
    )
  )
)

const isAffectedByRule = computed(() => matchingRules.value.length > 0)

function handleClick(event: Event) {
  // Prevent any potential event bubbling issues
  event.stopPropagation()
  
  if (props.node.type === 'directory') {
    // Mark as manually toggled so auto-expand won't override user choice
    hasBeenManuallyToggled.value = true
    isExpanded.value = !isExpanded.value
  } else {
    emit('file-selected', props.node)
  }
}

function getNodeIcon(): string {
  if (props.node.type === 'directory') {
    return isExpanded.value ? '📂' : '📁'
  }
  
  // File icons based on extension
  const ext = props.node.name.split('.').pop()?.toLowerCase()
  
  // Video files
  if (['mp4', 'mov', 'avi', 'mkv', 'mxf', 'prores'].includes(ext || '')) return '🎬'
  
  // Camera RAW files
  if (['r3d', 'rdc', 'braw', 'raw', 'arw', 'cr2', 'dng'].includes(ext || '')) return '📷'
  
  // Audio files
  if (['wav', 'mp3', 'aif', 'aiff', 'flac'].includes(ext || '')) return '🎵'
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'tiff', 'tif', 'psd'].includes(ext || '')) return '🖼️'
  
  // Metadata files
  if (['xml', 'json', 'mhl', 'edl', 'fcpxml'].includes(ext || '')) return '📋'
  
  // Default file
  return '📄'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
</script>