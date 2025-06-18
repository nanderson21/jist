<template>
  <div class="hierarchy-explorer">
    <div
      v-for="node in nodes"
      :key="node.id"
      class="node-container"
    >
      <div
        class="node-item flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent"
        :class="{
          'bg-primary/10': selectedNode?.id === node.id,
          'ring-2 ring-primary': hasContext(node)
        }"
        @click="selectNode(node)"
        @contextmenu.prevent="showContextMenu($event, node)"
      >
        <!-- Expand/Collapse -->
        <button
          v-if="node.children && node.children.length > 0"
          @click.stop="toggleExpand(node)"
          class="w-4 h-4 flex items-center justify-center hover:bg-accent rounded"
        >
          <span
            class="text-xs transition-transform"
            :class="{ 'rotate-90': expandedNodes.has(node.id) }"
          >
            ▶
          </span>
        </button>
        <div v-else class="w-4"></div>
        
        <!-- Icon -->
        <span class="text-base">{{ getNodeIcon(node) }}</span>
        
        <!-- Name -->
        <span class="flex-1 text-sm truncate">{{ node.name }}</span>
        
        <!-- Context Indicators -->
        <div class="flex items-center gap-1">
          <!-- Context Badge -->
          <span
            v-if="nodeContext(node)"
            class="px-2 py-0.5 text-xs rounded-full"
            :style="{
              backgroundColor: getCategoryColor(nodeContext(node).categoryId) + '20',
              color: getCategoryColor(nodeContext(node).categoryId)
            }"
          >
            {{ nodeContext(node).contextValue }}
          </span>
          
          <!-- Tag Count -->
          <span
            v-if="getNodeTagCount(node) > 0"
            class="w-5 h-5 bg-primary/20 text-primary text-xs rounded-full flex items-center justify-center"
          >
            {{ getNodeTagCount(node) }}
          </span>
          
          <!-- File Count (for folders) -->
          <span
            v-if="node.type === 'folder' && node.stats"
            class="text-xs text-muted-foreground"
          >
            {{ node.stats.fileCount }}
          </span>
        </div>
      </div>
      
      <!-- Children -->
      <div
        v-if="node.children && expandedNodes.has(node.id)"
        class="ml-6 mt-1"
      >
        <HierarchyExplorer
          :nodes="node.children"
          :selected-node="selectedNode"
          :context-mappings="contextMappings"
          :file-tags="fileTags"
          :tag-categories="tagCategories"
          :expanded-nodes="expandedNodes"
          @node-selected="$emit('node-selected', $event)"
          @context-assigned="$emit('context-assigned', $event.node, $event.categoryId, $event.value)"
        />
      </div>
    </div>
    
    <!-- Context Menu -->
    <div
      v-if="contextMenu.show"
      class="fixed bg-background border rounded-lg shadow-lg py-2 z-50"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
        Quick Assign Context
      </div>
      
      <button
        v-for="category in quickAssignCategories"
        :key="category.id"
        @click="quickAssign(category)"
        class="w-full px-3 py-2 text-sm hover:bg-accent text-left flex items-center gap-2"
      >
        <span>{{ category.icon }}</span>
        <span>{{ category.name }}</span>
      </button>
      
      <div class="border-t mt-2 pt-2">
        <button
          @click="openFullAssignment"
          class="w-full px-3 py-2 text-sm hover:bg-accent text-left flex items-center gap-2"
        >
          <span>🎯</span>
          <span>More Options...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useContextStore } from '@/stores/contextStore'

interface HierarchyNode {
  id: string
  name: string
  path: string
  type: 'folder' | 'file'
  children?: HierarchyNode[]
  stats?: {
    fileCount: number
    totalSize: string
  }
  files?: any[]
}

interface Props {
  nodes: HierarchyNode[]
  selectedNode: HierarchyNode | null
  contextMappings: any[]
  fileTags: Map<string, any[]>
  tagCategories?: any[]
  expandedNodes?: Set<string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'node-selected': [node: HierarchyNode]
  'context-assigned': [event: { node: HierarchyNode; categoryId: string; value: string }]
}>()

const { tagCategories: storeCategories } = useContextStore()

// Use provided categories or fall back to store
const tagCategories = computed(() => props.tagCategories || storeCategories.value)

// Local state
const localExpandedNodes = props.expandedNodes || ref(new Set<string>())
const expandedNodes = computed(() => 
  props.expandedNodes || localExpandedNodes.value
)

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  node: null as HierarchyNode | null
})

// Quick assign categories (most used)
const quickAssignCategories = computed(() => {
  return tagCategories.value.slice(0, 5)
})

// Methods
function selectNode(node: HierarchyNode) {
  emit('node-selected', node)
}

function toggleExpand(node: HierarchyNode) {
  if (expandedNodes.value.has(node.id)) {
    expandedNodes.value.delete(node.id)
  } else {
    expandedNodes.value.add(node.id)
  }
}

function hasContext(node: HierarchyNode): boolean {
  return props.contextMappings.some(m => 
    m.path === node.path || m.path === `${node.path}/${node.name}`
  )
}

function nodeContext(node: HierarchyNode) {
  return props.contextMappings.find(m => 
    m.path === node.path || m.path === `${node.path}/${node.name}`
  )
}

function getNodeTagCount(node: HierarchyNode): number {
  if (node.type === 'file') {
    const fileId = `${node.path}/${node.name}`
    return props.fileTags.get(fileId)?.length || 0
  }
  
  // For folders, count tags on all files within
  let count = 0
  if (node.files) {
    node.files.forEach(file => {
      const fileId = `${file.path}/${file.name}`
      count += props.fileTags.get(fileId)?.length || 0
    })
  }
  return count
}

function getNodeIcon(node: HierarchyNode): string {
  if (node.type === 'file') {
    const ext = node.name.split('.').pop()?.toLowerCase()
    const icons: Record<string, string> = {
      r3d: '🎬', mov: '🎬', mp4: '🎬', avi: '🎬',
      jpg: '🖼️', png: '🖼️', tiff: '🖼️',
      wav: '🎵', mp3: '🎵', aif: '🎵'
    }
    return icons[ext || ''] || '📄'
  }
  
  // Check if folder has context
  const context = nodeContext(node)
  if (context) {
    const category = tagCategories.value.find(c => c.id === context.categoryId)
    return category?.icon || '📁'
  }
  
  return '📁'
}

function getCategoryColor(categoryId: string): string {
  const category = tagCategories.value.find(c => c.id === categoryId)
  return category?.color || '#6B7280'
}

function showContextMenu(event: MouseEvent, node: HierarchyNode) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    node
  }
  
  // Hide on click outside
  const hideMenu = () => {
    contextMenu.value.show = false
    document.removeEventListener('click', hideMenu)
  }
  document.addEventListener('click', hideMenu)
}

function quickAssign(category: any) {
  if (!contextMenu.value.node) return
  
  // Infer value from node name
  const value = inferValueForCategory(contextMenu.value.node.name, category.name)
  
  emit('context-assigned', {
    node: contextMenu.value.node,
    categoryId: category.id,
    value
  })
  
  contextMenu.value.show = false
}

function openFullAssignment() {
  if (!contextMenu.value.node) return
  
  emit('node-selected', contextMenu.value.node)
  contextMenu.value.show = false
}

function inferValueForCategory(nodeName: string, categoryName: string): string {
  // Simple inference based on category type
  const lowerName = nodeName.toLowerCase()
  const lowerCategory = categoryName.toLowerCase()
  
  // Extract patterns based on category
  if (lowerCategory.includes('capture') || lowerCategory.includes('roll')) {
    const match = nodeName.match(/[A-Z]\d{3}/i)
    if (match) return match[0].toUpperCase()
  }
  
  if (lowerCategory.includes('date')) {
    const match = nodeName.match(/\d{4}[-_]\d{2}[-_]\d{2}/)
    if (match) return match[0]
  }
  
  if (lowerCategory.includes('camera')) {
    const match = nodeName.match(/cam[a-z]?|camera[a-z]?/i)
    if (match) return match[0]
  }
  
  // Default to the node name
  return nodeName
}

// Expand first level by default
if (props.nodes.length > 0 && props.nodes[0].children) {
  expandedNodes.value.add(props.nodes[0].id)
}
</script>

<style scoped>
.hierarchy-explorer {
  user-select: none;
}

.node-item {
  transition: all 0.2s;
}

.node-item:hover {
  transform: translateX(2px);
}
</style>