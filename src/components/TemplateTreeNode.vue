<template>
  <div class="template-tree-node">
    <div
      class="node-item flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent"
      :class="{
        'bg-primary/10': isSelected,
        'bg-accent': isHovered
      }"
      :style="{ paddingLeft: `${depth * 20 + 8}px` }"
      @click="handleClick"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
      @contextmenu.prevent="handleRightClick"
    >
      <!-- Expand/Collapse -->
      <button
        v-if="node.children && node.children.length > 0"
        @click.stop="toggleExpand"
        class="w-4 h-4 flex items-center justify-center hover:bg-accent rounded"
      >
        <span
          class="text-xs transition-transform"
          :class="{ 'rotate-90': expanded }"
        >
          ▶
        </span>
      </button>
      <div v-else class="w-4"></div>
      
      <!-- Selection Checkbox -->
      <input
        type="checkbox"
        :checked="isSelected"
        @change="handleSelectionChange"
        @click.stop
        class="w-3 h-3 rounded"
      />
      
      <!-- Icon -->
      <span class="text-base">{{ getNodeIcon() }}</span>
      
      <!-- Editable Name with Variable Highlighting -->
      <div class="flex-1 text-sm">
        <span
          ref="nameElement"
          class="selectable-name"
          @mouseup="handleTextSelection"
        >
          {{ highlightedName }}
        </span>
      </div>
      
      <!-- Variable Indicators -->
      <div v-if="pathData?.variables.length" class="flex items-center gap-1">
        <span
          v-for="variable in pathData.variables"
          :key="`${variable.start}-${variable.end}`"
          class="px-1 py-0.5 text-xs rounded-full"
          :style="{
            backgroundColor: getVariableColor(variable.variableId) + '20',
            color: getVariableColor(variable.variableId)
          }"
        >
          {{ variable.variableName }}
        </span>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
        <button
          v-if="isSelected"
          @click.stop="showVariableMenu"
          class="w-6 h-6 flex items-center justify-center hover:bg-accent rounded"
          title="Add variable"
        >
          🔤
        </button>
      </div>
    </div>
    
    <!-- Children -->
    <div v-if="expanded && node.children" class="ml-0">
      <TemplateTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-paths="selectedPaths"
        :depth="depth + 1"
        @toggle-selection="$emit('toggle-selection', $event, $event.path)"
        @add-variable="$emit('add-variable', $event, child.path, $event.selection)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTemplateStore } from '@/stores/templateStore'

interface Props {
  node: any
  selectedPaths: Map<string, any>
  depth: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'toggle-selection': [node: any, path: string]
  'add-variable': [event: MouseEvent, path: string, selection: { start: number; end: number }]
}>()

const { variables } = useTemplateStore()

// State
const expanded = ref(props.depth < 2) // Auto-expand first 2 levels
const isHovered = ref(false)
const nameElement = ref<HTMLElement>()

// Computed
const nodePath = computed(() => {
  // Build path from root to this node
  return props.node.path || props.node.name
})

const isSelected = computed(() => {
  return props.selectedPaths.has(nodePath.value)
})

const pathData = computed(() => {
  return props.selectedPaths.get(nodePath.value)
})

const highlightedName = computed(() => {
  if (!pathData.value?.variables.length) {
    return props.node.name
  }
  
  // Highlight variables in the name
  let name = props.node.name
  const ranges = [...pathData.value.variables].sort((a, b) => b.start - a.start)
  
  ranges.forEach(variable => {
    const before = name.substring(0, variable.start)
    const highlighted = name.substring(variable.start, variable.end)
    const after = name.substring(variable.end)
    
    name = before + `<mark style="background-color: ${getVariableColor(variable.variableId)}20; color: ${getVariableColor(variable.variableId)}">${highlighted}</mark>` + after
  })
  
  return name
})

// Methods
function toggleExpand() {
  expanded.value = !expanded.value
}

function handleClick() {
  emit('toggle-selection', props.node, nodePath.value)
}

function handleSelectionChange() {
  emit('toggle-selection', props.node, nodePath.value)
}

function handleRightClick(event: MouseEvent) {
  if (isSelected.value) {
    showVariableMenu(event)
  }
}

function showVariableMenu(event?: MouseEvent) {
  if (event) {
    emit('add-variable', event, nodePath.value, { start: 0, end: props.node.name.length })
  }
}

function handleTextSelection(event: MouseEvent) {
  if (!isSelected.value) return
  
  const selection = window.getSelection()
  if (selection && selection.toString().trim()) {
    const range = selection.getRangeAt(0)
    const element = nameElement.value
    
    if (element && element.contains(range.commonAncestorContainer)) {
      const start = range.startOffset
      const end = range.endOffset
      
      emit('add-variable', event, nodePath.value, { start, end })
      selection.removeAllRanges()
    }
  }
}

function getNodeIcon(): string {
  if (props.node.type === 'file') {
    const ext = props.node.name.split('.').pop()?.toLowerCase()
    const icons: Record<string, string> = {
      r3d: '🎬', mov: '🎬', mp4: '🎬', avi: '🎬',
      jpg: '🖼️', png: '🖼️', tiff: '🖼️',
      wav: '🎵', mp3: '🎵', aif: '🎵'
    }
    return icons[ext || ''] || '📄'
  }
  
  // Folder icons based on common patterns
  const name = props.node.name.toLowerCase()
  if (name.includes('source') || name.includes('original')) return '📁'
  if (name.includes('camera') || name.includes('cam')) return '📹'
  if (name.includes('audio') || name.includes('sound')) return '🎵'
  if (name.includes('proxy') || name.includes('preview')) return '👁️'
  if (name.includes('edit') || name.includes('timeline')) return '✂️'
  if (name.includes('color') || name.includes('grade')) return '🎨'
  if (name.includes('vfx') || name.includes('effects')) return '✨'
  if (name.includes('delivery') || name.includes('final')) return '📦'
  if (name.match(/day[-_]?\d+|d\d+/i)) return '📅'
  if (name.match(/[a-z]\d{3}/i)) return '🎞️'
  
  return '📁'
}

function getVariableColor(variableId: string): string {
  const variable = variables.value.find(v => v.id === variableId)
  return variable?.color || '#6B7280'
}
</script>

<style scoped>
.selectable-name {
  user-select: text;
  cursor: text;
}

.selectable-name:hover {
  background-color: rgba(59, 130, 246, 0.1);
}

.template-tree-node .group:hover .group-hover\:opacity-100 {
  opacity: 1;
}

/* Variable highlighting */
.selectable-name mark {
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 500;
}
</style>