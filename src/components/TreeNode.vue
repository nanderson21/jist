<template>
  <div class="tree-node">
    <div 
      class="node-item flex items-center gap-2 py-1 px-2 hover:bg-accent rounded cursor-pointer"
      :style="{ paddingLeft: `${depth * 20}px` }"
      @click="toggle"
    >
      <span v-if="node.type === 'directory'" class="text-sm">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
      <span v-else class="w-4"></span>
      
      <input
        type="checkbox"
        :checked="node.selected"
        @click.stop
        @change="$emit('toggle-select', node)"
        class="mr-1"
      />
      
      <button
        @click.stop="$emit('toggle-flag', node)"
        class="p-1 hover:bg-secondary rounded"
        :class="{ 'text-yellow-500': node.flagged }"
      >
        🚩
      </button>
      
      <span class="flex-1 text-sm">
        {{ node.name }}
      </span>
      
      <span v-if="node.type === 'file'" class="text-xs text-muted-foreground">
        {{ formatFileSize(node.size || 0) }}
      </span>
    </div>
    
    <div v-if="isExpanded && node.children" class="children">
      <TreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        @toggle-select="$emit('toggle-select', $event)"
        @toggle-flag="$emit('toggle-flag', $event)"
        @file-click="$emit('file-click', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileNode } from '@/types'

interface Props {
  node: FileNode
  depth: number
}

const props = defineProps<Props>()
const isExpanded = ref(false)

const emit = defineEmits<{
  'toggle-select': [node: FileNode]
  'toggle-flag': [node: FileNode]
  'file-click': [node: FileNode]
}>()

function toggle() {
  if (props.node.type === 'directory') {
    isExpanded.value = !isExpanded.value
  } else {
    emit('file-click', props.node)
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>