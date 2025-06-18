<template>
  <div class="unified-context-manager h-full flex flex-col bg-background">
    <!-- Header with breadcrumbs and actions -->
    <div class="border-b p-4">
      <!-- Breadcrumb Navigation -->
      <div class="mb-3">
        <nav class="flex items-center space-x-1 text-sm">
          <button
            @click="navigateToRoot"
            class="text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            <span>🏠</span>
            <span>Project Root</span>
          </button>
          
          <template v-for="(crumb, index) in breadcrumbs" :key="index">
            <span class="text-muted-foreground">/</span>
            <button
              @click="navigateToCrumb(index)"
              class="text-primary hover:text-primary/80 flex items-center gap-1"
              :class="{ 'font-medium': index === breadcrumbs.length - 1 }"
            >
              <span>{{ crumb.icon }}</span>
              <span>{{ crumb.name }}</span>
              <span v-if="crumb.context" class="ml-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {{ crumb.context }}
              </span>
            </button>
          </template>
        </nav>
      </div>
      
      <!-- Stats and Actions -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-foreground">
            {{ currentView.title }}
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            {{ stats.totalFiles }} files • {{ stats.taggedFiles }} tagged • {{ stats.mappedFolders }} mapped folders
          </p>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click="showTemplateBuilder = true"
            class="px-3 py-1 text-sm border border-input rounded hover:bg-accent"
          >
            📋 Templates
          </button>
          
          <button
            @click="showRuleBuilder = true"
            class="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            🔧 Create Rule
          </button>
          
          <button
            @click="applyAllRules"
            :disabled="isProcessing"
            class="px-3 py-1 text-sm border border-input rounded hover:bg-accent"
          >
            {{ isProcessing ? '⏳ Processing...' : '⚡ Apply Rules' }}
          </button>
          
          <button
            @click="exportConfiguration"
            class="px-3 py-1 text-sm border border-input rounded hover:bg-accent"
          >
            📤 Export
          </button>
        </div>
      </div>
    </div>
    
    <!-- Smart Template Detection -->
    <div v-if="hierarchyNodes.length > 0" class="border-b">
      <SmartTemplateMatcher
        :root-path="props.rootNode?.path || 'Project'"
        :project-structure="hierarchyNodes"
        @template-applied="handleTemplateApplied"
        @create-template="showTemplateBuilder = true"
      />
    </div>
    
    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Panel - Hierarchy Explorer -->
      <div class="w-1/2 border-r flex flex-col">
        <div class="p-3 border-b bg-muted/20">
          <h3 class="font-medium text-sm">📁 File Hierarchy</h3>
        </div>
        
        <div class="flex-1 overflow-auto p-3">
          <HierarchyExplorer
            :nodes="hierarchyNodes"
            :selected-node="selectedNode"
            :context-mappings="contextMappings"
            :file-tags="fileTags"
            @node-selected="handleNodeSelected"
            @context-assigned="handleQuickContextAssign"
          />
        </div>
      </div>
      
      <!-- Right Panel - Context Assignment -->
      <div class="w-1/2 flex flex-col">
        <div class="p-3 border-b bg-muted/20">
          <h3 class="font-medium text-sm">🏷️ Context & Tagging</h3>
        </div>
        
        <div class="flex-1 overflow-auto">
          <!-- Node Details -->
          <div v-if="selectedNode" class="p-4 space-y-4">
            <!-- Node Info -->
            <div class="bg-muted/20 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">{{ getNodeIcon(selectedNode) }}</span>
                  <div>
                    <h4 class="font-semibold">{{ selectedNode.name }}</h4>
                    <p class="text-xs text-muted-foreground">{{ selectedNode.type }} • {{ selectedNode.path }}</p>
                  </div>
                </div>
                
                <div v-if="selectedNode.stats" class="text-xs text-muted-foreground text-right">
                  <div>{{ selectedNode.stats.fileCount }} files</div>
                  <div>{{ selectedNode.stats.totalSize }}</div>
                </div>
              </div>
              
              <!-- Pattern Analysis -->
              <div v-if="patternAnalysis" class="mt-3 pt-3 border-t">
                <div class="text-xs font-medium text-muted-foreground mb-2">Detected Patterns:</div>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="pattern in patternAnalysis.patterns"
                    :key="pattern.id"
                    class="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                  >
                    {{ pattern.name }} ({{ pattern.confidence }}%)
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Context Assignment -->
            <div>
              <h5 class="font-medium mb-3">Assign Context</h5>
              
              <!-- Quick Assignment Buttons -->
              <div class="grid grid-cols-2 gap-2 mb-4">
                <button
                  v-for="suggestion in contextSuggestions"
                  :key="suggestion.id"
                  @click="assignContext(suggestion)"
                  class="p-3 border rounded-lg hover:bg-accent text-left"
                  :class="{ 'border-primary bg-primary/10': suggestion.confidence > 80 }"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-medium text-sm">{{ suggestion.category }}</div>
                      <div class="text-xs text-muted-foreground">{{ suggestion.value }}</div>
                    </div>
                    <span class="text-xs text-primary">{{ suggestion.confidence }}%</span>
                  </div>
                </button>
              </div>
              
              <!-- Custom Context Input -->
              <div class="space-y-3">
                <div>
                  <label class="text-sm font-medium">Category</label>
                  <select
                    v-model="customContext.categoryId"
                    class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                  >
                    <option value="">Select category...</option>
                    <option
                      v-for="category in tagCategories"
                      :key="category.id"
                      :value="category.id"
                    >
                      {{ category.icon }} {{ category.name }}
                    </option>
                  </select>
                </div>
                
                <div>
                  <label class="text-sm font-medium">Value</label>
                  <input
                    v-model="customContext.value"
                    @keyup.enter="assignCustomContext"
                    class="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                    placeholder="e.g., A001, 4K, Scene 1..."
                  />
                </div>
                
                <button
                  @click="assignCustomContext"
                  :disabled="!customContext.categoryId || !customContext.value"
                  class="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  Assign Context
                </button>
              </div>
            </div>
            
            <!-- Applied Contexts & Tags -->
            <div v-if="nodeContexts.length > 0">
              <h5 class="font-medium mb-3">Applied Contexts</h5>
              <div class="space-y-2">
                <div
                  v-for="context in nodeContexts"
                  :key="context.id"
                  class="flex items-center justify-between p-2 bg-muted/20 rounded"
                >
                  <div class="flex items-center gap-2">
                    <span>{{ getCategoryIcon(context.categoryId) }}</span>
                    <div>
                      <div class="text-sm font-medium">{{ context.contextValue }}</div>
                      <div class="text-xs text-muted-foreground">{{ getCategoryName(context.categoryId) }}</div>
                    </div>
                  </div>
                  <button
                    @click="removeContext(context.id)"
                    class="text-xs text-destructive hover:text-destructive/80"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
            
            <!-- File Tags Preview -->
            <div v-if="selectedNode.type === 'file' && nodeTags.length > 0">
              <h5 class="font-medium mb-3">File Tags</h5>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in nodeTags"
                  :key="tag.id"
                  class="px-3 py-1 text-xs rounded-full flex items-center gap-1"
                  :style="{ backgroundColor: getTagColor(tag) + '20', color: getTagColor(tag) }"
                >
                  {{ getCategoryIcon(tag.categoryId) }} {{ tag.name }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-else class="p-8 text-center text-muted-foreground">
            <div class="text-4xl mb-3">📁</div>
            <p>Select a folder or file to assign context</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Rule Builder Modal -->
    <RuleBuilderModal
      v-if="showRuleBuilder"
      :categories="tagCategories"
      :selected-node="selectedNode"
      @rule-created="handleRuleCreated"
      @close="showRuleBuilder = false"
    />
    
    <!-- Template Builder Modal -->
    <div
      v-if="showTemplateBuilder"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="w-full h-full max-w-7xl max-h-[95vh] bg-background rounded-lg shadow-xl overflow-hidden">
        <div class="h-full flex flex-col">
          <div class="p-4 border-b flex items-center justify-between">
            <h3 class="text-lg font-semibold">Template Builder</h3>
            <button
              @click="showTemplateBuilder = false"
              class="p-2 hover:bg-accent rounded-full"
            >
              ✕
            </button>
          </div>
          <div class="flex-1 overflow-hidden">
            <TemplateBuilder
              :hierarchy-nodes="hierarchyNodes"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Processing Overlay -->
    <div v-if="isProcessing" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-background rounded-lg p-6 max-w-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <div>
            <h3 class="font-semibold">Processing Files</h3>
            <p class="text-sm text-muted-foreground">{{ processingStatus }}</p>
          </div>
        </div>
        <div class="w-full bg-muted rounded-full h-2">
          <div
            class="bg-primary h-2 rounded-full transition-all"
            :style="{ width: `${processingProgress}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { FileNode } from '@/types'
import { useContextStore } from '@/stores/contextStore'
import { analyzeFileRelationships, inferContextFromPatterns } from '@/data/redNamingConventions'
import HierarchyExplorer from './HierarchyExplorer.vue'
import RuleBuilderModal from './RuleBuilderModal.vue'
import SmartTemplateMatcher from './SmartTemplateMatcher.vue'
import TemplateBuilder from './TemplateBuilder.vue'

interface Props {
  files?: FileNode[]
  rootNode?: FileNode | null
}

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
  files?: FileNode[]
}

const props = defineProps<Props>()

const {
  tagCategories,
  tags,
  contextMappings,
  tagRules,
  fileTags,
  categoriesTree,
  createCategory,
  createTag,
  createContextMapping,
  createRule,
  applyRulesToFiles,
  initialize,
  initializeDefaults
} = useContextStore()

// State
const selectedNode = ref<HierarchyNode | null>(null)
const breadcrumbs = ref<Array<{ name: string; icon: string; path: string; context?: string }>>([])
const showRuleBuilder = ref(false)
const showTemplateBuilder = ref(false)
const isProcessing = ref(false)
const processingStatus = ref('')
const processingProgress = ref(0)
const customContext = ref({ categoryId: '', value: '' })

// Initialize store
onMounted(async () => {
  await initialize()
  await initializeDefaults()
})

// Convert FileNode tree to HierarchyNode tree
const hierarchyNodes = computed(() => {
  if (!props.rootNode) return []
  
  const convertNode = (node: FileNode): HierarchyNode => {
    const hierarchyNode: HierarchyNode = {
      id: `${node.path}/${node.name}`,
      name: node.name,
      path: node.path,
      type: node.type as 'folder' | 'file'
    }
    
    if (node.type === 'directory' && node.children) {
      hierarchyNode.children = node.children.map(convertNode)
      
      // Calculate stats
      const allFiles = getAllFilesInNode(node)
      hierarchyNode.stats = {
        fileCount: allFiles.length,
        totalSize: formatFileSize(allFiles.reduce((sum, f) => sum + (f.size || 0), 0))
      }
      hierarchyNode.files = allFiles
    }
    
    return hierarchyNode
  }
  
  return props.rootNode ? [convertNode(props.rootNode)] : []
})

// Get all files in a node recursively
function getAllFilesInNode(node: FileNode): FileNode[] {
  const files: FileNode[] = []
  
  if (node.type === 'file') {
    files.push(node)
  } else if (node.children) {
    node.children.forEach(child => {
      files.push(...getAllFilesInNode(child))
    })
  }
  
  return files
}

// Current view computed
const currentView = computed(() => {
  if (!selectedNode.value) {
    return { title: 'File Hierarchy', subtitle: 'Select a folder to begin' }
  }
  
  return {
    title: selectedNode.value.name,
    subtitle: selectedNode.value.path
  }
})

// Stats computed
const stats = computed(() => {
  const totalFiles = props.files?.length || 0
  const taggedFiles = new Set<string>()
  fileTags.value.forEach((_, fileId) => taggedFiles.add(fileId))
  
  const mappedFolders = contextMappings.value.filter(m => m.contextType === 'folder').length
  
  return {
    totalFiles,
    taggedFiles: taggedFiles.size,
    mappedFolders
  }
})

// Pattern analysis for selected node
const patternAnalysis = computed(() => {
  if (!selectedNode.value || !selectedNode.value.files) return null
  
  const analysis = analyzeFileRelationships(selectedNode.value.files)
  const patterns: any[] = []
  
  // Extract patterns from analysis
  analysis.captureRolls.forEach((roll, rollId) => {
    patterns.push({
      id: `roll-${rollId}`,
      name: `Capture Roll ${rollId}`,
      type: 'captureRoll',
      confidence: 90
    })
  })
  
  analysis.formatGroups.forEach((format, key) => {
    patterns.push({
      id: `format-${key}`,
      name: format.format,
      type: 'format',
      confidence: 85
    })
  })
  
  return { patterns }
})

// Context suggestions for selected node
const contextSuggestions = computed(() => {
  if (!selectedNode.value) return []
  
  const suggestions: any[] = []
  
  // Use NLP to infer context
  const inference = inferContextFromPatterns(
    selectedNode.value.name,
    selectedNode.value.type,
    selectedNode.value.files || []
  )
  
  // Find matching category
  const category = tagCategories.value.find(c => 
    c.name.toLowerCase().includes(inference.contextType)
  )
  
  if (category) {
    suggestions.push({
      id: `suggest-${inference.contextType}`,
      category: category.name,
      categoryId: category.id,
      value: inference.suggestedContext,
      confidence: Math.round(inference.confidence * 100)
    })
  }
  
  // Add pattern-based suggestions
  if (patternAnalysis.value) {
    patternAnalysis.value.patterns.forEach(pattern => {
      const cat = tagCategories.value.find(c => 
        c.name.toLowerCase().includes(pattern.type.toLowerCase())
      )
      if (cat) {
        suggestions.push({
          id: pattern.id,
          category: cat.name,
          categoryId: cat.id,
          value: pattern.name,
          confidence: pattern.confidence
        })
      }
    })
  }
  
  return suggestions.slice(0, 6) // Limit to 6 suggestions
})

// Get contexts for selected node
const nodeContexts = computed(() => {
  if (!selectedNode.value) return []
  
  return contextMappings.value.filter(m => 
    m.path === selectedNode.value!.path ||
    m.path === `${selectedNode.value!.path}/${selectedNode.value!.name}`
  )
})

// Get tags for selected node (if it's a file)
const nodeTags = computed(() => {
  if (!selectedNode.value || selectedNode.value.type !== 'file') return []
  
  const fileId = `${selectedNode.value.path}/${selectedNode.value.name}`
  const fileTagList = fileTags.value.get(fileId) || []
  
  return fileTagList.map(ft => {
    const tag = tags.value.find(t => t.id === ft.tagId)
    return tag
  }).filter(Boolean)
})

// Navigation methods
function navigateToRoot() {
  breadcrumbs.value = []
  selectedNode.value = hierarchyNodes.value[0] || null
}

function navigateToCrumb(index: number) {
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
  // Navigate to the node at this breadcrumb
  let node = hierarchyNodes.value[0]
  for (let i = 0; i <= index; i++) {
    const crumb = breadcrumbs.value[i]
    node = node.children?.find(n => n.name === crumb.name) || node
  }
  selectedNode.value = node
}

function handleNodeSelected(node: HierarchyNode) {
  selectedNode.value = node
  
  // Update breadcrumbs
  const pathParts = node.path.split('/').filter(Boolean)
  breadcrumbs.value = pathParts.map((part, index) => {
    const context = contextMappings.value.find(m => 
      m.path === pathParts.slice(0, index + 1).join('/')
    )
    
    return {
      name: part,
      icon: '📁',
      path: pathParts.slice(0, index + 1).join('/'),
      context: context?.contextValue
    }
  })
}

// Context assignment methods
async function assignContext(suggestion: any) {
  if (!selectedNode.value) return
  
  // Create or find tag
  let tag = tags.value.find(t => 
    t.categoryId === suggestion.categoryId && t.value === suggestion.value
  )
  
  if (!tag) {
    tag = await createTag({
      categoryId: suggestion.categoryId,
      name: suggestion.value,
      value: suggestion.value
    })
  }
  
  // Create context mapping
  await createContextMapping({
    path: selectedNode.value.path,
    contextType: selectedNode.value.type,
    contextValue: suggestion.value,
    categoryId: suggestion.categoryId,
    tagId: tag.id,
    confidence: suggestion.confidence / 100
  })
  
  // Clear custom input
  customContext.value = { categoryId: '', value: '' }
}

async function assignCustomContext() {
  if (!selectedNode.value || !customContext.value.categoryId || !customContext.value.value) return
  
  await assignContext({
    categoryId: customContext.value.categoryId,
    value: customContext.value.value,
    confidence: 100
  })
}

async function handleQuickContextAssign(node: HierarchyNode, categoryId: string, value: string) {
  selectedNode.value = node
  await assignContext({
    categoryId,
    value,
    confidence: 100
  })
}

async function removeContext(contextId: string) {
  // In a real implementation, we'd have a removeContextMapping method
  contextMappings.value = contextMappings.value.filter(m => m.id !== contextId)
}

// Template handling
function handleTemplateApplied(templateId: string, extractedVariables: Record<string, string>) {
  console.log('Template applied:', { templateId, extractedVariables })
  
  // Show success notification
  processingStatus.value = `Template applied! Extracted variables: ${Object.keys(extractedVariables).join(', ')}`
  isProcessing.value = true
  processingProgress.value = 100
  
  setTimeout(() => {
    isProcessing.value = false
  }, 2000)
}

// Rule handling
async function handleRuleCreated(rule: any) {
  await createRule(rule)
  showRuleBuilder.value = false
  
  // Optionally apply the rule immediately
  if (confirm('Apply this rule to all files now?')) {
    await applyAllRules()
  }
}

async function applyAllRules() {
  isProcessing.value = true
  processingStatus.value = 'Analyzing files...'
  processingProgress.value = 0
  
  try {
    const batchSize = 100
    const totalBatches = Math.ceil(props.files.length / batchSize)
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = props.files.slice(i * batchSize, (i + 1) * batchSize)
      processingStatus.value = `Processing batch ${i + 1} of ${totalBatches}...`
      processingProgress.value = ((i + 1) / totalBatches) * 100
      
      await applyRulesToFiles(batch)
      
      // Small delay for UI update
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    processingStatus.value = 'Complete!'
    await new Promise(resolve => setTimeout(resolve, 1000))
  } finally {
    isProcessing.value = false
    processingProgress.value = 0
  }
}

// Export configuration
function exportConfiguration() {
  const config = {
    categories: tagCategories.value,
    tags: tags.value,
    contextMappings: contextMappings.value,
    rules: tagRules.value,
    exportDate: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jist-context-config-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Helper methods
function getNodeIcon(node: HierarchyNode): string {
  if (node.type === 'file') {
    const ext = node.name.split('.').pop()?.toLowerCase()
    if (['r3d', 'mov', 'mp4'].includes(ext || '')) return '🎬'
    if (['jpg', 'png'].includes(ext || '')) return '🖼️'
    return '📄'
  }
  
  // Check if folder has context
  const context = contextMappings.value.find(m => m.path === node.path)
  if (context) {
    const category = tagCategories.value.find(c => c.id === context.categoryId)
    return category?.icon || '📁'
  }
  
  return '📁'
}

function getCategoryIcon(categoryId: string): string {
  const category = tagCategories.value.find(c => c.id === categoryId)
  return category?.icon || '🏷️'
}

function getCategoryName(categoryId: string): string {
  const category = tagCategories.value.find(c => c.id === categoryId)
  return category?.name || 'Unknown'
}

function getTagColor(tag: any): string {
  const category = tagCategories.value.find(c => c.id === tag.categoryId)
  return category?.color || '#6B7280'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
</script>

<style scoped>
.unified-context-manager {
  min-height: 0;
}
</style>