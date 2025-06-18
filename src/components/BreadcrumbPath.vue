<template>
  <div class="breadcrumb-path">
    <div v-if="currentFile" class="space-y-1">
      <div class="text-xs text-muted-foreground">Current File Path:</div>
      <div 
        class="font-mono text-sm p-2 bg-muted/20 rounded cursor-text select-text break-all whitespace-pre-wrap"
        @mouseup="handleTextSelection"
        ref="pathElement"
      >
{{ currentFile.path }}</div>
      <div class="text-xs text-muted-foreground">
        Select any part of the path above to create an ingest rule
      </div>
    </div>
    <div v-else class="text-muted-foreground text-sm">
      No file selected
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileNode } from '@/types'

interface Props {
  currentFile?: FileNode | null
}

const props = defineProps<Props>()
const pathElement = ref<HTMLElement>()

const emit = defineEmits<{
  'path-segment-clicked': [data: any]
}>()

function handleTextSelection() {
  const selection = window.getSelection()
  if (selection && selection.toString().trim()) {
    const selectedText = selection.toString().trim()
    console.log('Selected text:', selectedText)
    
    // Analyze path structure to determine position and create intelligent rule data
    const pathAnalysis = analyzePathSelection(selectedText)
    
    emit('path-segment-clicked', pathAnalysis)
  }
}

function analyzePathSelection(selectedText: string) {
  if (!props.currentFile?.path) {
    return { text: selectedText, source: 'breadcrumb', file: props.currentFile }
  }
  
  const fullPath = props.currentFile.path
  const pathParts = fullPath.split('/').filter(part => part.length > 0)
  
  // Find which path segment contains the selected text
  let segmentIndex = -1
  let matchingSegment = ''
  
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i].includes(selectedText)) {
      segmentIndex = i
      matchingSegment = pathParts[i]
      break
    }
  }
  
  if (segmentIndex === -1) {
    // Selected text spans across segments or is part of filename
    return {
      text: selectedText,
      source: 'breadcrumb',
      file: props.currentFile,
      type: 'custom'
    }
  }
  
  // Determine if this is a whole segment or part of a segment
  const isWholeSegment = matchingSegment === selectedText
  const isFilename = segmentIndex === pathParts.length - 1
  
  // Check if selected text appears to be a variable pattern
  const variablePatterns = [
    { pattern: /^DAY_\d+$/i, name: 'day', description: 'Shoot day identifier' },
    { pattern: /^[A-Z]\d{3}$/i, name: 'shot', description: 'Shot identifier (A001, B002, etc.)' },
    { pattern: /^C\d{3}$/i, name: 'camera', description: 'Camera identifier (C001, C002, etc.)' },
    { pattern: /^T\d{3}$/i, name: 'take', description: 'Take number (T001, T002, etc.)' },
    { pattern: /^\d{4}-\d{2}-\d{2}$/, name: 'date', description: 'Date (YYYY-MM-DD)' },
    { pattern: /^\d{6}$/, name: 'timestamp', description: 'Timestamp (HHMMSS)' }
  ]
  
  // Find matching pattern
  let detectedVariable = null
  for (const { pattern, name, description } of variablePatterns) {
    if (pattern.test(selectedText)) {
      detectedVariable = { name, description, pattern: pattern.source }
      break
    }
  }
  
  return {
    text: selectedText,
    source: 'breadcrumb',
    file: props.currentFile,
    pathStructure: {
      fullPath,
      pathParts,
      segmentIndex,
      matchingSegment,
      isWholeSegment,
      isFilename
    },
    variable: detectedVariable ? {
      type: 'positional-pattern',
      suggestedName: detectedVariable.name,
      description: detectedVariable.description,
      pattern: detectedVariable.pattern,
      position: segmentIndex,
      example: selectedText
    } : {
      type: 'positional-capture',
      position: segmentIndex,
      example: selectedText,
      suggestedName: isFilename ? 'filename' : `segment${segmentIndex}`
    }
  }
}
</script>

<style scoped>
.breadcrumb-path ::selection {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
</style>