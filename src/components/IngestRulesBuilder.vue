<template>
  <div class="ingest-rules-builder space-y-4">
    <!-- Path Patterns -->
    <div class="border rounded-lg p-4">
      <h3 class="font-semibold mb-3">Path Patterns</h3>
      <div class="space-y-2">
        <div v-for="(pattern, index) in pathPatterns" :key="index" class="flex gap-2">
          <input
            v-model.number="pattern.level"
            type="number"
            min="0"
            placeholder="Level"
            class="w-20 px-2 py-1 border rounded"
          />
          <input
            v-model="pattern.pattern"
            type="text"
            placeholder="Pattern (e.g., *_proxy.*)"
            class="flex-1 px-2 py-1 border rounded"
          />
          <Button @click="removePathPattern(index)" variant="destructive" size="sm">
            Remove
          </Button>
        </div>
        <Button @click="addPathPattern" variant="outline" size="sm">
          Add Pattern
        </Button>
      </div>
    </div>

    <!-- Custom Variables -->
    <div class="border rounded-lg p-4">
      <h3 class="font-semibold mb-3">Custom Variables</h3>
      <div class="space-y-2">
        <div v-for="(variable, index) in customVariables" :key="index" class="space-y-2 p-2 border rounded">
          <div class="flex gap-2">
            <input
              v-model="variable.name"
              type="text"
              placeholder="Variable name"
              class="flex-1 px-2 py-1 border rounded"
            />
            <select v-model="variable.source" class="px-2 py-1 border rounded">
              <option value="path">Path</option>
              <option value="metadata">Metadata</option>
              <option value="custom">Custom</option>
            </select>
            <Button @click="removeVariable(index)" variant="destructive" size="sm">
              Remove
            </Button>
          </div>
          <input
            v-model="variable.extraction"
            type="text"
            placeholder="Extraction pattern or metadata field"
            class="w-full px-2 py-1 border rounded"
          />
        </div>
        <Button @click="addVariable" variant="outline" size="sm">
          Add Variable
        </Button>
      </div>
    </div>

    <!-- Selected Nodes Info -->
    <div v-if="selectedNodes.length > 0" class="border rounded-lg p-4">
      <h3 class="font-semibold mb-3">Selected Files</h3>
      <div class="text-sm space-y-1 max-h-40 overflow-y-auto">
        <div v-for="node in selectedNodes" :key="node.path">
          {{ node.path }}
        </div>
      </div>
    </div>

    <!-- Flagged Nodes Info -->
    <div v-if="flaggedNodes.length > 0" class="border rounded-lg p-4">
      <h3 class="font-semibold mb-3">Flagged Files</h3>
      <div class="text-sm space-y-1 max-h-40 overflow-y-auto">
        <div v-for="node in flaggedNodes" :key="node.path" class="text-yellow-600">
          🚩 {{ node.path }}
        </div>
      </div>
    </div>

    <!-- Save Rule -->
    <div class="flex gap-2">
      <input
        v-model="ruleName"
        type="text"
        placeholder="Rule name"
        class="flex-1 px-3 py-2 border rounded"
      />
      <Button @click="saveRule" :disabled="!ruleName">
        Save Rule
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { FileNode, IngestRule, PathPattern, CustomVariable } from '@/types'
import Button from '@/components/ui/button.vue'

interface Props {
  selectedNodes: FileNode[]
  flaggedNodes: FileNode[]
}

const props = defineProps<Props>()

const ruleName = ref('')
const pathPatterns = ref<PathPattern[]>([])
const customVariables = ref<CustomVariable[]>([])

// Store rules in localStorage
const savedRules = useLocalStorage<IngestRule[]>('jist-ingest-rules', [])

function addPathPattern() {
  pathPatterns.value.push({
    level: 0,
    pattern: '',
    flags: []
  })
}

function removePathPattern(index: number) {
  pathPatterns.value.splice(index, 1)
}

function addVariable() {
  customVariables.value.push({
    name: '',
    source: 'path',
    extraction: ''
  })
}

function removeVariable(index: number) {
  customVariables.value.splice(index, 1)
}

function saveRule() {
  if (!ruleName.value) return

  const newRule: IngestRule = {
    id: Date.now().toString(),
    name: ruleName.value,
    pathPatterns: [...pathPatterns.value],
    variables: [...customVariables.value],
    actions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  savedRules.value.push(newRule)
  
  // Reset form
  ruleName.value = ''
  pathPatterns.value = []
  customVariables.value = []
  
  alert('Rule saved successfully!')
}
</script>