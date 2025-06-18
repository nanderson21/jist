<template>
  <div class="rules-list">
    <div v-if="rules.length === 0" class="text-muted-foreground text-sm">
      No rules created yet. Select text in file paths to create rules.
    </div>
    
    <div v-else class="space-y-3">
      <div v-for="rule in rules" :key="rule.id" 
           class="p-3 border rounded-lg space-y-2">
        <div class="flex items-center justify-between">
          <div class="font-medium text-sm">{{ rule.name }}</div>
          <Button @click="$emit('rule-deleted', rule.id)" variant="destructive" size="sm">
            Delete
          </Button>
        </div>
        
        <div class="text-xs text-muted-foreground">
          {{ rule.description }}
        </div>
        
        <!-- Pattern Preview -->
        <div class="space-y-1">
          <div class="text-xs font-medium">Patterns:</div>
          <div v-for="pattern in rule.pathPatterns" :key="pattern.pattern"
               class="text-xs font-mono bg-muted/20 p-1 rounded">
            {{ pattern.pattern }}
          </div>
        </div>
        
        <!-- Variables -->
        <div v-if="rule.variables.length > 0" class="space-y-1">
          <div class="text-xs font-medium">Variables:</div>
          <div v-for="variable in rule.variables" :key="variable.name"
               class="text-xs bg-accent/20 p-1 rounded">
            <span class="font-medium">{{ variable.name }}</span>: {{ variable.source }}
          </div>
        </div>
        
        <!-- Show how this rule affects current file -->
        <div v-if="selectedFile && doesRuleApply(rule, selectedFile)" 
             class="text-xs bg-primary/10 p-2 rounded">
          ✓ This rule applies to the selected file
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileNode, IngestRule } from '@/types'
import Button from '@/components/ui/button.vue'

interface Props {
  rules: IngestRule[]
  selectedFile?: FileNode | null
}

defineProps<Props>()

defineEmits<{
  'rule-updated': [rule: IngestRule]
  'rule-deleted': [ruleId: string]
}>()

function doesRuleApply(rule: IngestRule, file: FileNode): boolean {
  return rule.pathPatterns.some(pattern => 
    file.path.includes(pattern.pattern)
  )
}
</script>