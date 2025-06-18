<template>
  <div class="template-structure-tree">
    <div
      class="flex items-center gap-2 py-1"
      :style="{ marginLeft: `${depth * 20}px` }"
    >
      <!-- Type Icon -->
      <span class="text-sm">{{ getTypeIcon() }}</span>
      
      <!-- Name with Variables -->
      <span class="font-mono text-sm">{{ displayName }}</span>
      
      <!-- Type Badge -->
      <span
        class="px-2 py-0.5 text-xs rounded-full"
        :class="{
          'bg-blue-100 text-blue-700': node.type === 'variable',
          'bg-green-100 text-green-700': node.type === 'fixed',
          'bg-purple-100 text-purple-700': node.type === 'pattern'
        }"
      >
        {{ node.type }}
      </span>
      
      <!-- Context Tags -->
      <div v-if="node.context?.tags?.length" class="flex gap-1 ml-2">
        <span
          v-for="tag in node.context.tags.slice(0, 3)"
          :key="tag"
          class="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
        >
          {{ tag }}
        </span>
        <span v-if="node.context.tags.length > 3" class="text-xs text-muted-foreground">
          +{{ node.context.tags.length - 3 }}
        </span>
      </div>
    </div>
    
    <!-- Children -->
    <div v-if="node.children?.length">
      <TemplateStructureTree
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :extracted-variables="extractedVariables"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  node: any
  extractedVariables: Record<string, string>
  depth: number
}

const props = defineProps<Props>()

// Computed
const displayName = computed(() => {
  let name = props.node.name
  
  // Replace variables with actual values
  if (props.node.variables) {
    props.node.variables.forEach((varId: string) => {
      const value = props.extractedVariables[varId]
      if (value) {
        name = name.replace(`{${varId}}`, value)
      }
    })
  }
  
  return name
})

// Methods
function getTypeIcon(): string {
  switch (props.node.type) {
    case 'fixed': return '📌'
    case 'variable': return '🔤'
    case 'pattern': return '🔍'
    default: return '📁'
  }
}
</script>

<style scoped>
.template-structure-tree {
  user-select: none;
}
</style>