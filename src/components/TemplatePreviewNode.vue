<template>
  <div class="template-preview-node">
    <div
      class="preview-item flex items-center gap-2 px-2 py-1.5 rounded"
      :class="{
        'bg-blue-50 border border-blue-200': node.type === 'variable',
        'bg-green-50 border border-green-200': node.type === 'fixed',
        'bg-purple-50 border border-purple-200': node.type === 'pattern'
      }"
      :style="{ marginLeft: `${depth * 16}px` }"
    >
      <!-- Type Icon -->
      <span class="text-sm">{{ getTypeIcon() }}</span>
      
      <!-- Name with Variable Highlighting -->
      <div class="flex-1">
        <div class="text-sm font-medium">
          {{ formatNodeName() }}
        </div>
        
        <!-- Variables Used -->
        <div v-if="node.variables?.length" class="text-xs text-muted-foreground mt-1">
          Variables: 
          <span
            v-for="(varId, index) in node.variables"
            :key="varId"
            class="inline-flex items-center gap-1 ml-1"
          >
            <span
              class="w-2 h-2 rounded-full"
              :style="{ backgroundColor: getVariableColor(varId) }"
            ></span>
            <span>{{ getVariableName(varId) }}</span>
            <span v-if="index < node.variables.length - 1">,</span>
          </span>
        </div>
        
        <!-- Pattern -->
        <div v-if="node.pattern" class="text-xs text-muted-foreground mt-1 font-mono">
          Pattern: {{ node.pattern }}
        </div>
        
        <!-- Context Tags -->
        <div v-if="node.context?.tags?.length" class="flex flex-wrap gap-1 mt-1">
          <span
            v-for="tag in node.context.tags"
            :key="tag"
            class="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
          >
            {{ tag }}
          </span>
        </div>
      </div>
      
      <!-- Type Badge -->
      <span
        class="px-2 py-0.5 text-xs rounded-full font-medium"
        :class="{
          'bg-blue-100 text-blue-700': node.type === 'variable',
          'bg-green-100 text-green-700': node.type === 'fixed',
          'bg-purple-100 text-purple-700': node.type === 'pattern'
        }"
      >
        {{ node.type }}
      </span>
    </div>
    
    <!-- Children -->
    <div v-if="node.children?.length" class="mt-1">
      <TemplatePreviewNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :variables="variables"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  node: any
  variables: any[]
  depth: number
}

const props = defineProps<Props>()

// Methods
function getTypeIcon(): string {
  switch (props.node.type) {
    case 'fixed': return '📌'
    case 'variable': return '🔤'
    case 'pattern': return '🔍'
    default: return '📁'
  }
}

function formatNodeName(): string {
  let name = props.node.name
  
  // Highlight variables in curly braces
  if (props.node.variables) {
    props.node.variables.forEach((varId: string) => {
      const variable = getVariable(varId)
      if (variable) {
        const placeholder = `{${varId}}`
        if (name.includes(placeholder)) {
          name = name.replace(
            placeholder,
            `{${variable.name}}`
          )
        }
      }
    })
  }
  
  return name
}

function getVariable(varId: string) {
  return props.variables.find(v => v.id === varId)
}

function getVariableName(varId: string): string {
  const variable = getVariable(varId)
  return variable?.name || varId
}

function getVariableColor(varId: string): string {
  const variable = getVariable(varId)
  return variable?.color || '#6B7280'
}
</script>

<style scoped>
.template-preview-node {
  user-select: none;
}

.preview-item {
  transition: all 0.2s ease-in-out;
}

.preview-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>