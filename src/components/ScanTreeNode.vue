<template>
  <div class="scan-tree-node">
    <div 
      class="flex items-center gap-1"
      :style="{ paddingLeft: `${depth * 12}px` }"
      :class="{ 'scanning-indicator': isCurrentlyScanning }"
    >
      <span v-if="node.type === 'directory'" class="text-muted-foreground">
        {{ isExpanded ? '📂' : '📁' }}
      </span>
      <span v-else class="text-muted-foreground">
        📄
      </span>
      
      <span :class="{ 'text-primary font-semibold': isCurrentlyScanning }">
        {{ node.name }}
      </span>
      
      <span v-if="node.type === 'directory' && node.children" class="text-muted-foreground text-xs ml-1">
        ({{ node.children.length }})
      </span>
      
      <span v-if="isCurrentlyScanning" class="ml-2">
        <span class="inline-block animate-pulse text-primary">●</span>
      </span>
    </div>
    
    <div v-if="isExpanded && node.children">
      <ScanTreeNode
        v-for="(child, index) in displayChildren"
        :key="child.path || index"
        :node="child"
        :depth="depth + 1"
        :is-scanning="isScanning"
        :current-path="currentPath"
      />
      <div 
        v-if="node.children.length > maxChildren"
        :style="{ paddingLeft: `${(depth + 1) * 12}px` }"
        class="text-xs text-muted-foreground italic"
      >
        ... and {{ node.children.length - maxChildren }} more
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileNode } from '@/types'

interface Props {
  node: FileNode
  depth: number
  isScanning: boolean
  currentPath?: string
}

const props = defineProps<Props>()

const maxChildren = 10
const isExpanded = computed(() => props.node.type === 'directory' && props.depth < 3)
const displayChildren = computed(() => 
  props.node.children?.slice(0, maxChildren) || []
)

const isCurrentlyScanning = computed(() => 
  props.isScanning && props.currentPath === props.node.path
)
</script>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.scanning-indicator {
  animation: pulse 1s ease-in-out infinite;
}
</style>