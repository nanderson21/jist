<template>
  <div class="virtual-tree-view h-full relative">
    <!-- Tree Container with Virtual Scrolling -->
    <div 
      ref="scrollContainer"
      class="h-full overflow-auto"
      @scroll="handleScroll"
    >
      <!-- Virtual List Container -->
      <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
        <!-- Rendered Items -->
        <div
          v-for="item in visibleItems"
          :key="item.node.path"
          :style="{ 
            position: 'absolute',
            top: `${item.top}px`,
            left: '0',
            right: '0',
            height: `${itemHeight}px`
          }"
        >
          <TreeNode
            :node="item.node"
            :depth="item.depth"
            :is-expanded="expandedNodes.has(item.node.path)"
            :is-selected="selectedPath === item.node.path"
            :classification="item.classification"
            :is-loading="loadingNodes.has(item.node.path)"
            @toggle="handleToggle"
            @select="handleSelect"
            @load-children="handleLoadChildren"
          />
        </div>
      </div>
    </div>
    
    <!-- Loading Overlay -->
    <div v-if="isInitialLoading" class="absolute inset-0 bg-background/80 flex items-center justify-center">
      <div class="flex items-center gap-2 text-sm">
        <div class="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
        Analyzing project structure...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import type { FileNode } from '@/types'
import type { FolderClassification, UserFolderFlag } from '@/composables/useMediaFolderDetection'
import { useMediaFolderDetection } from '@/composables/useMediaFolderDetection'
import TreeNode from './TreeNode.vue'

interface Props {
  rootNode?: FileNode | null
  selectedPath?: string
  userFlags?: UserFolderFlag[]
}

interface TreeItem {
  node: FileNode
  depth: number
  top: number
  classification?: FolderClassification
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'node-selected': [node: FileNode]
  'children-loaded': [node: FileNode, children: FileNode[]]
}>()

const { classifyFolder } = useMediaFolderDetection()

// Refs
const scrollContainer = ref<HTMLElement>()
const expandedNodes = ref(new Set<string>())
const loadingNodes = ref(new Set<string>())
const loadedNodes = ref(new Set<string>())
const isInitialLoading = ref(false)

// Virtual scrolling config
const itemHeight = 32
const overscan = 5
const scrollTop = ref(0)

// Flattened tree for virtual scrolling
const flattenedItems = computed(() => {
  const items: TreeItem[] = []
  
  if (!props.rootNode) return items
  
  function flattenNode(node: FileNode, depth: number) {
    // Add current node
    const classification = node.type === 'directory' ? 
      classifyFolder(node, undefined, props.userFlags || []) : undefined
    
    items.push({
      node,
      depth,
      top: items.length * itemHeight,
      classification
    })
    
    // Add expanded children
    if (node.type === 'directory' && expandedNodes.value.has(node.path) && node.children) {
      node.children.forEach(child => flattenNode(child, depth + 1))
    }
  }
  
  flattenNode(props.rootNode, 0)
  return items
})

// Virtual scrolling calculations
const containerHeight = ref(0)
const totalHeight = computed(() => flattenedItems.value.length * itemHeight)

const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan)
  const end = Math.min(
    flattenedItems.value.length,
    Math.ceil((scrollTop.value + containerHeight.value) / itemHeight) + overscan
  )
  return { start, end }
})

const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return flattenedItems.value.slice(start, end)
})

// Event handlers
function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
}

function handleToggle(node: FileNode) {
  if (expandedNodes.value.has(node.path)) {
    expandedNodes.value.delete(node.path)
  } else {
    expandedNodes.value.add(node.path)
    
    // Lazy load children if needed
    if (node.type === 'directory' && !loadedNodes.value.has(node.path)) {
      handleLoadChildren(node)
    }
  }
}

function handleSelect(node: FileNode) {
  emit('node-selected', node)
}

async function handleLoadChildren(node: FileNode) {
  if (loadingNodes.value.has(node.path) || loadedNodes.value.has(node.path)) {
    return
  }
  
  loadingNodes.value.add(node.path)
  
  try {
    // Simulate loading children (replace with actual File System Access API calls)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Mark as loaded
    loadedNodes.value.add(node.path)
    loadingNodes.value.delete(node.path)
    
    // Emit children loaded event
    emit('children-loaded', node, node.children || [])
    
  } catch (error) {
    console.error('Error loading children for', node.path, error)
    loadingNodes.value.delete(node.path)
  }
}

// Auto-expand root on mount
onMounted(async () => {
  await nextTick()
  
  if (scrollContainer.value) {
    containerHeight.value = scrollContainer.value.clientHeight
  }
  
  if (props.rootNode) {
    expandedNodes.value.add(props.rootNode.path)
  }
})

// Watch for container resize
watch(() => scrollContainer.value, async (container) => {
  if (container) {
    containerHeight.value = container.clientHeight
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height
      }
    })
    
    resizeObserver.observe(container)
  }
})

// Public methods for external control
function expandPath(path: string) {
  const pathSegments = path.split('/').filter(Boolean)
  let currentPath = ''
  
  for (const segment of pathSegments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment
    expandedNodes.value.add(currentPath)
  }
}

function scrollToPath(path: string) {
  const itemIndex = flattenedItems.value.findIndex(item => item.node.path === path)
  if (itemIndex >= 0 && scrollContainer.value) {
    const targetScrollTop = itemIndex * itemHeight
    scrollContainer.value.scrollTop = targetScrollTop
  }
}

defineExpose({
  expandPath,
  scrollToPath,
  expandedNodes: expandedNodes.value,
  loadedNodes: loadedNodes.value
})
</script>

<style scoped>
.virtual-tree-view {
  --tree-line-color: #e5e7eb;
  --tree-hover-bg: #f8fafc;
  --tree-selected-bg: #e2e8f0;
}

.dark .virtual-tree-view {
  --tree-line-color: #374151;
  --tree-hover-bg: #1f2937;
  --tree-selected-bg: #374151;
}
</style>