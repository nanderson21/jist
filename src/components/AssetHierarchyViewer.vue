<template>
  <div class="asset-hierarchy-viewer h-full flex flex-col">
    <!-- Header with Layer Toggle -->
    <div class="p-4 border-b">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-foreground">Asset Hierarchy System</h3>
        <div class="flex items-center gap-2">
          <button
            @click="autoProcessFiles"
            :disabled="isProcessing"
            class="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {{ isProcessing ? '🔄 Processing...' : '🚀 Process Files' }}
          </button>
          
          <button
            @click="exportHierarchy"
            class="px-3 py-1 text-xs border border-input rounded hover:bg-accent"
          >
            📤 Export
          </button>
        </div>
      </div>
      
      <!-- Layer Navigation -->
      <div class="flex bg-muted rounded-md p-1">
        <button
          v-for="layer in layers"
          :key="layer.id"
          @click="activeLayer = layer.id"
          class="flex-1 px-3 py-2 text-xs rounded transition-colors flex items-center justify-center gap-2"
          :class="activeLayer === layer.id ? 'bg-background shadow-sm' : 'hover:bg-background/50'"
        >
          <span>{{ layer.icon }}</span>
          <span>{{ layer.name }}</span>
          <span class="text-muted-foreground">({{ layer.count }})</span>
        </button>
      </div>
    </div>
    
    <!-- Content Area -->
    <div class="flex-1 overflow-auto">
      <!-- Atomic Files Layer -->
      <div v-if="activeLayer === 'files'" class="p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AtomicFileCard
            v-for="file in atomicFiles"
            :key="file.id"
            :file="file"
            @file-selected="handleFileSelected"
            @labels-updated="handleLabelsUpdated"
          />
        </div>
      </div>
      
      <!-- Assets Layer -->
      <div v-if="activeLayer === 'assets'" class="p-4">
        <div class="space-y-6">
          <!-- RED Clips Section -->
          <div v-if="redClips.length > 0">
            <div class="flex items-center gap-2 mb-3">
              <h4 class="font-medium">🎬 RED MetaClips</h4>
              <span class="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                {{ redClips.length }} clips
              </span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <REDClipCard
                v-for="clip in redClips"
                :key="clip.id"
                :asset="clip"
                @asset-selected="handleAssetSelected"
                @labels-updated="handleLabelsUpdated"
              />
            </div>
          </div>
          
          <!-- Other Assets -->
          <div v-if="otherAssets.length > 0">
            <div class="flex items-center gap-2 mb-3">
              <h4 class="font-medium">📄 Other Assets</h4>
              <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                {{ otherAssets.length }} assets
              </span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AssetCard
                v-for="asset in otherAssets"
                :key="asset.id"
                :asset="asset"
                @asset-selected="handleAssetSelected"
                @labels-updated="handleLabelsUpdated"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Asset Groups Layer -->
      <div v-if="activeLayer === 'groups'" class="p-4">
        <div class="space-y-4">
          <AssetGroupCard
            v-for="group in assetGroups"
            :key="group.id"
            :group="group"
            @group-selected="handleGroupSelected"
            @labels-updated="handleLabelsUpdated"
          />
        </div>
      </div>
      
      <!-- Virtual Hierarchies Layer -->
      <div v-if="activeLayer === 'hierarchies'" class="p-4">
        <div class="space-y-6">
          <VirtualHierarchyTree
            v-for="hierarchy in virtualHierarchies"
            :key="hierarchy.id"
            :hierarchy="hierarchy"
            :assets="assets"
            :asset-groups="assetGroups"
            @node-selected="handleHierarchyNodeSelected"
            @virtual-navigate="handleVirtualNavigate"
          />
        </div>
      </div>
    </div>
    
    <!-- Selected Item Panel -->
    <div v-if="selectedItem" class="border-t p-4 bg-muted/10">
      <SelectedItemPanel
        :item="selectedItem"
        :item-type="selectedItemType"
        @labels-assigned="handleLabelsAssigned"
        @relationships-updated="handleRelationshipsUpdated"
        @panel-closed="selectedItem = null"
      />
    </div>
    
    <!-- Processing Status -->
    <div v-if="processingStatus" class="border-t p-3 bg-blue-50 dark:bg-blue-900/20">
      <div class="flex items-center gap-2 text-sm">
        <div class="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
        <span>{{ processingStatus }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FileNode } from '@/types'
import { useAssetHierarchy } from '@/composables/useAssetHierarchy'
import type { AtomicFile, Asset, AssetGroup, VirtualHierarchy, MetadataLabel } from '@/composables/useAssetHierarchy'
import AtomicFileCard from './AtomicFileCard.vue'
import REDClipCard from './REDClipCard.vue'
import AssetCard from './AssetCard.vue'
import AssetGroupCard from './AssetGroupCard.vue'
import VirtualHierarchyTree from './VirtualHierarchyTree.vue'
import SelectedItemPanel from './SelectedItemPanel.vue'

interface Props {
  allFiles: FileNode[]
  isScanning?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'asset-selected': [asset: Asset]
  'group-selected': [group: AssetGroup]
  'hierarchy-navigation': [hierarchy: VirtualHierarchy, path: string[]]
}>()

const {
  atomicFiles,
  assets,
  assetGroups,
  virtualHierarchies,
  redClips,
  processFiles
} = useAssetHierarchy()

// State
const activeLayer = ref<'files' | 'assets' | 'groups' | 'hierarchies'>('assets')
const selectedItem = ref<AtomicFile | Asset | AssetGroup | any>(null)
const selectedItemType = ref<string>('')
const isProcessing = ref(false)
const processingStatus = ref('')

// Layer configuration
const layers = computed(() => [
  {
    id: 'files',
    name: 'Atomic Files',
    icon: '📄',
    count: atomicFiles.value.length,
    description: 'Base level files on disk'
  },
  {
    id: 'assets',
    name: 'Assets',
    icon: '🎬',
    count: assets.value.length,
    description: 'Logical content groupings'
  },
  {
    id: 'groups',
    name: 'Asset Groups',
    icon: '📁',
    count: assetGroups.value.length,
    description: 'RED clips, sequences, projects'
  },
  {
    id: 'hierarchies',
    name: 'Virtual Hierarchies',
    icon: '🌳',
    count: virtualHierarchies.value.length,
    description: 'Multi-location class system'
  }
])

const otherAssets = computed(() => {
  const redAssetIds = new Set(redClips.value.flatMap(clip => clip.assets.map(a => a.id)))
  return assets.value.filter(asset => !redAssetIds.has(asset.id))
})

// Watch for file changes
watch(() => props.allFiles, (newFiles) => {
  if (newFiles.length > 0 && !isProcessing.value) {
    autoProcessFiles()
  }
}, { immediate: true })

// Methods
async function autoProcessFiles() {
  if (props.allFiles.length === 0) return
  
  isProcessing.value = true
  processingStatus.value = 'Converting files to atomic level...'
  
  try {
    // Simulate processing steps
    await new Promise(resolve => setTimeout(resolve, 500))
    
    processingStatus.value = 'Detecting RED clips and creating assets...'
    await new Promise(resolve => setTimeout(resolve, 500))
    
    processingStatus.value = 'Building asset groups and relationships...'
    await new Promise(resolve => setTimeout(resolve, 500))
    
    processingStatus.value = 'Generating metadata labels...'
    await new Promise(resolve => setTimeout(resolve, 500))
    
    processingStatus.value = 'Creating virtual hierarchies...'
    processFiles(props.allFiles)
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    processingStatus.value = ''
  } catch (error) {
    console.error('Processing failed:', error)
    processingStatus.value = 'Processing failed'
    setTimeout(() => processingStatus.value = '', 3000)
  } finally {
    isProcessing.value = false
  }
}

function handleFileSelected(file: AtomicFile) {
  selectedItem.value = file
  selectedItemType.value = 'file'
}

function handleAssetSelected(asset: Asset) {
  selectedItem.value = asset
  selectedItemType.value = 'asset'
  emit('asset-selected', asset)
}

function handleGroupSelected(group: AssetGroup) {
  selectedItem.value = group
  selectedItemType.value = 'group'
  emit('group-selected', group)
}

function handleHierarchyNodeSelected(node: any) {
  selectedItem.value = node
  selectedItemType.value = 'hierarchy-node'
}

function handleVirtualNavigate(hierarchy: VirtualHierarchy, path: string[]) {
  emit('hierarchy-navigation', hierarchy, path)
}

function handleLabelsUpdated(item: any, newLabels: MetadataLabel[]) {
  console.log('Labels updated:', { item: item.name || item.id, labels: newLabels.length })
  
  // Update the item's labels
  if ('labels' in item) {
    item.labels = [...item.labels, ...newLabels]
  }
  
  // Trigger re-processing to update hierarchies
  if (newLabels.length > 0) {
    processFiles(props.allFiles)
  }
}

function handleLabelsAssigned(labels: MetadataLabel[]) {
  if (selectedItem.value && 'labels' in selectedItem.value) {
    selectedItem.value.labels.push(...labels)
    processFiles(props.allFiles) // Re-process to update hierarchies
  }
}

function handleRelationshipsUpdated(relationships: any) {
  console.log('Relationships updated:', relationships)
  // Handle relationship updates
}

function exportHierarchy() {
  const exportData = {
    atomicFiles: atomicFiles.value.length,
    assets: assets.value.length,
    assetGroups: assetGroups.value.length,
    virtualHierarchies: virtualHierarchies.value.map(h => ({
      id: h.id,
      name: h.name,
      type: h.type,
      nodeCount: countHierarchyNodes(h.structure)
    })),
    redClips: redClips.value.length,
    timestamp: new Date().toISOString()
  }
  
  const data = JSON.stringify(exportData, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'asset-hierarchy.json'
  a.click()
  URL.revokeObjectURL(url)
}

function countHierarchyNodes(nodes: any[]): number {
  return nodes.reduce((count, node) => {
    return count + 1 + countHierarchyNodes(node.children || [])
  }, 0)
}
</script>

<style scoped>
.asset-hierarchy-viewer {
  min-height: 0;
}
</style>