<template>
  <div class="rule-management h-full flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <h3 class="text-lg font-semibold">Inspection Rules</h3>
          <p class="text-sm text-muted-foreground">
            Manage metadata extraction and processing rules
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="showCreateRule = true"
            class="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            + Create Rule
          </button>
          <button
            @click="exportAllRules"
            class="px-3 py-1 text-xs border border-input rounded hover:bg-accent"
          >
            📤 Export All
          </button>
          <button
            @click="importRules"
            class="px-3 py-1 text-xs border border-input rounded hover:bg-accent"
          >
            📥 Import
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="p-3 border-b bg-muted/20">
      <div class="grid grid-cols-4 gap-4 text-sm">
        <div class="text-center">
          <div class="font-semibold">{{ rules.length }}</div>
          <div class="text-muted-foreground text-xs">Total Rules</div>
        </div>
        <div class="text-center">
          <div class="font-semibold">{{ enabledRules.length }}</div>
          <div class="text-muted-foreground text-xs">Enabled</div>
        </div>
        <div class="text-center">
          <div class="font-semibold">{{ recentExecutions.filter(e => e.success).length }}</div>
          <div class="text-muted-foreground text-xs">Recent Success</div>
        </div>
        <div class="text-center">
          <div class="font-semibold">{{ totalExtractedProperties }}</div>
          <div class="text-muted-foreground text-xs">Properties Extracted</div>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="p-4 border-b">
      <div class="flex gap-3">
        <input
          v-model="searchTerm"
          placeholder="Search rules..."
          class="flex-1 px-3 py-2 text-sm border border-input rounded-md"
        />
        <select
          v-model="filterStatus"
          class="px-3 py-2 text-sm border border-input rounded-md"
        >
          <option value="all">All Rules</option>
          <option value="enabled">Enabled Only</option>
          <option value="disabled">Disabled Only</option>
        </select>
        <select
          v-model="filterTrigger"
          class="px-3 py-2 text-sm border border-input rounded-md"
        >
          <option value="all">All Triggers</option>
          <option value="scan">Scan Trigger</option>
          <option value="select">Select Trigger</option>
          <option value="manual">Manual Only</option>
        </select>
      </div>
    </div>

    <!-- Rules List -->
    <div class="flex-1 min-h-0 overflow-auto">
      <div class="p-4 space-y-3">
        <div
          v-for="rule in filteredRules"
          :key="rule.id"
          class="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
          :class="rule.enabled ? '' : 'opacity-60'"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0 space-y-2">
              <!-- Rule Header -->
              <div class="flex items-center gap-2">
                <button
                  @click="toggleRule(rule.id)"
                  class="shrink-0 w-4 h-4 border rounded flex items-center justify-center text-xs"
                  :class="rule.enabled 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'border-input hover:border-primary'"
                >
                  {{ rule.enabled ? '✓' : '' }}
                </button>
                <h4 class="font-medium text-sm truncate">{{ rule.name }}</h4>
                <div class="shrink-0 px-1.5 py-0.5 text-xs bg-muted rounded">
                  Priority {{ rule.priority }}
                </div>
              </div>

              <!-- Rule Description -->
              <p class="text-xs text-muted-foreground">{{ rule.description }}</p>

              <!-- Rule Details -->
              <div class="flex items-center gap-4 text-xs text-muted-foreground">
                <div class="flex items-center gap-1">
                  <span>🎯</span>
                  <span>{{ rule.conditions.length }} condition{{ rule.conditions.length !== 1 ? 's' : '' }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <span>⚡</span>
                  <span>{{ rule.actions.length }} action{{ rule.actions.length !== 1 ? 's' : '' }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <span>🔄</span>
                  <span>{{ rule.triggers.join(', ') }}</span>
                </div>
              </div>

              <!-- Execution Stats -->
              <div v-if="getRuleStats(rule.id)" class="text-xs text-muted-foreground">
                <div class="flex items-center gap-4">
                  <span>{{ getRuleStats(rule.id)?.executions || 0 }} executions</span>
                  <span>{{ getRuleStats(rule.id)?.successRate || 0 }}% success rate</span>
                  <span>{{ getRuleStats(rule.id)?.avgProperties || 0 }} avg properties</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="shrink-0 flex gap-1">
              <button
                @click="editRule(rule)"
                class="p-1 text-xs hover:bg-accent rounded"
                title="Edit rule"
              >
                ✏️
              </button>
              <button
                @click="duplicateRule(rule)"
                class="p-1 text-xs hover:bg-accent rounded"
                title="Duplicate rule"
              >
                📋
              </button>
              <button
                @click="testRule(rule)"
                class="p-1 text-xs hover:bg-accent rounded"
                title="Test rule"
              >
                🧪
              </button>
              <button
                @click="exportRule(rule)"
                class="p-1 text-xs hover:bg-accent rounded"
                title="Export rule"
              >
                📤
              </button>
              <button
                @click="removeRule(rule.id)"
                class="p-1 text-xs text-destructive hover:bg-destructive/10 rounded"
                title="Delete rule"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        <!-- No Rules -->
        <div v-if="filteredRules.length === 0" class="p-8 text-center text-muted-foreground">
          <div class="text-4xl mb-2">📋</div>
          <p class="text-lg">No rules found</p>
          <p class="text-sm mt-1">Create your first inspection rule to get started</p>
          <button
            @click="showCreateRule = true"
            class="mt-3 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Create Rule
          </button>
        </div>
      </div>
    </div>

    <!-- Recent Executions -->
    <div v-if="recentExecutions.length > 0" class="border-t">
      <div class="p-3">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-medium">Recent Executions</h4>
          <button
            @click="showExecutionLog = !showExecutionLog"
            class="text-xs text-muted-foreground hover:text-foreground"
          >
            {{ showExecutionLog ? 'Hide' : 'Show' }}
          </button>
        </div>
        
        <div v-if="showExecutionLog" class="space-y-1 max-h-32 overflow-auto">
          <div
            v-for="execution in recentExecutions.slice(0, 10)"
            :key="`${execution.ruleId}_${execution.timestamp.getTime()}`"
            class="flex items-center justify-between text-xs p-2 bg-muted/20 rounded"
          >
            <div class="flex items-center gap-2">
              <span :class="execution.success ? 'text-green-600' : 'text-red-600'">
                {{ execution.success ? '✓' : '✗' }}
              </span>
              <span class="font-medium">{{ execution.ruleName }}</span>
              <span class="text-muted-foreground">on {{ execution.file }}</span>
            </div>
            <div class="text-muted-foreground">
              {{ execution.extractedProperties }} props
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Rule Modal -->
    <div
      v-if="showCreateRule || editingRule"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-background rounded-lg shadow-xl w-full max-w-5xl h-full max-h-[90vh] overflow-hidden">
        <MetadataRuleBuilder
          :preview-file="testFile"
          :initial-rule="editingRule"
          @close="closeRuleEditor"
          @save="handleSaveRule"
          @test="handleTestRule"
        />
      </div>
    </div>

    <!-- Hidden file input for import -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      multiple
      @change="handleFileImport"
      class="hidden"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInspectionRules } from '@/composables/useInspectionRules'
import type { InspectionRule } from '@/composables/useAdvancedMetadata'
import type { FileNode } from '@/types'
import MetadataRuleBuilder from './MetadataRuleBuilder.vue'

const {
  rules,
  enabledRules,
  recentExecutions,
  addRule,
  updateRule,
  removeRule,
  toggleRule,
  executeRule
} = useInspectionRules()

// Component state
const searchTerm = ref('')
const filterStatus = ref('all')
const filterTrigger = ref('all')
const showExecutionLog = ref(false)
const showCreateRule = ref(false)
const editingRule = ref<InspectionRule | null>(null)
const testFile = ref<FileNode | null>(null)
const fileInput = ref<HTMLInputElement>()

// Computed properties
const filteredRules = computed(() => {
  let filtered = rules.value

  // Filter by search term
  if (searchTerm.value.trim()) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(rule => 
      rule.name.toLowerCase().includes(search) ||
      rule.description.toLowerCase().includes(search)
    )
  }

  // Filter by status
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(rule => 
      filterStatus.value === 'enabled' ? rule.enabled : !rule.enabled
    )
  }

  // Filter by trigger
  if (filterTrigger.value !== 'all') {
    filtered = filtered.filter(rule => 
      rule.triggers.includes(filterTrigger.value as any)
    )
  }

  return filtered.sort((a, b) => {
    // Sort by enabled status first, then by priority
    if (a.enabled !== b.enabled) {
      return a.enabled ? -1 : 1
    }
    return a.priority - b.priority
  })
})

const totalExtractedProperties = computed(() => {
  return recentExecutions.value.reduce((sum, execution) => sum + execution.extractedProperties, 0)
})

// Rule statistics
const getRuleStats = (ruleId: string) => {
  const executions = recentExecutions.value.filter(e => e.ruleId === ruleId)
  if (executions.length === 0) return null

  const successful = executions.filter(e => e.success).length
  const avgProperties = executions.reduce((sum, e) => sum + e.extractedProperties, 0) / executions.length

  return {
    executions: executions.length,
    successRate: Math.round((successful / executions.length) * 100),
    avgProperties: Math.round(avgProperties)
  }
}

// Event handlers
function editRule(rule: InspectionRule) {
  editingRule.value = { ...rule }
}

function duplicateRule(rule: InspectionRule) {
  const duplicatedRule: InspectionRule = {
    ...rule,
    id: `rule-${Date.now()}`,
    name: `${rule.name} (Copy)`,
    enabled: false
  }
  addRule(duplicatedRule)
}

async function testRule(rule: InspectionRule) {
  console.log('Testing rule:', rule)
  // This would open a file picker or use a test file
}

function exportRule(rule: InspectionRule) {
  const data = JSON.stringify(rule, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${rule.name.replace(/\s+/g, '_')}_rule.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportAllRules() {
  const data = JSON.stringify(rules.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inspection_rules_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importRules() {
  fileInput.value?.click()
}

function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return

  Array.from(files).forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importedRules = JSON.parse(content)
        
        if (Array.isArray(importedRules)) {
          importedRules.forEach(rule => {
            if (rule.id && rule.name) {
              // Ensure unique ID
              rule.id = `imported-${Date.now()}-${Math.random()}`
              addRule(rule)
            }
          })
        } else if (importedRules.id && importedRules.name) {
          importedRules.id = `imported-${Date.now()}`
          addRule(importedRules)
        }
      } catch (error) {
        console.error('Failed to import rules:', error)
      }
    }
    reader.readAsText(file)
  })

  // Reset input
  target.value = ''
}

function closeRuleEditor() {
  showCreateRule.value = false
  editingRule.value = null
}

function handleSaveRule(rule: InspectionRule) {
  if (editingRule.value) {
    updateRule(editingRule.value.id, rule)
  } else {
    addRule(rule)
  }
  closeRuleEditor()
}

function handleTestRule(rule: InspectionRule, file?: FileNode) {
  console.log('Testing rule:', rule, 'with file:', file)
  // This would implement rule testing functionality
}
</script>

<style scoped>
.rule-management {
  max-height: 100vh;
}

.rule-management ::-webkit-scrollbar {
  width: 6px;
}

.rule-management ::-webkit-scrollbar-track {
  background: transparent;
}

.rule-management ::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}

.rule-management ::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}
</style>