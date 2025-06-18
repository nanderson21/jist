<template>
  <div class="file-browser h-full overflow-auto">
    <div v-if="!rootNode" class="flex items-center justify-center h-full text-muted-foreground">
      <div class="text-center">
        <div class="text-lg mb-2">No project selected</div>
        <div class="text-sm">Select a project folder to begin</div>
      </div>
    </div>
    
    <div v-else class="h-full">
      <div v-if="isPartialScan" class="p-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
        <div class="text-xs text-black flex items-center gap-2">
          <div class="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
          Scanning in progress - folders become available as they complete
        </div>
      </div>
      <div class="p-2">
        <FileTreeItem
          :node="rootNode"
          :depth="0"
          :selected-file="selectedFile"
          :active-rules="activeRules"
          :is-partial-scan="isPartialScan"
          @file-selected="$emit('file-selected', $event)"
          @create-rule="$emit('create-rule', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import type { FileNode, IngestRule } from '@/types'
import FileTreeItem from './FileTreeItem.vue'

interface Props {
  rootNode?: FileNode | null
  selectedFile?: FileNode | null
  activeRules: IngestRule[]
  isPartialScan?: boolean
}

const props = defineProps<Props>()

// FileBrowser component working correctly

defineEmits<{
  'file-selected': [file: FileNode]
  'create-rule': [data: any]
}>()
</script>