<template>
  <div class="media-asset-browser h-full overflow-auto">
    <div v-if="!assetGroups || assetGroups.length === 0" class="flex items-center justify-center h-full text-muted-foreground">
      <div class="text-center">
        <div class="text-lg mb-2">{{ isScanning ? 'Building asset index...' : 'No media assets found' }}</div>
        <div class="text-sm">
          {{ isScanning ? 'Assets will appear as they are detected' : 'Select a folder from the tree to view its media assets' }}
        </div>
      </div>
    </div>
    
    <div v-else class="p-4">
      <div v-if="isScanning" class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <div class="text-xs text-black flex items-center gap-2 mb-2">
          <div class="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
          Scanning and grouping media assets...
        </div>
        
        <div class="space-y-2">
          <div class="text-xs text-muted-foreground">
            Found {{ totalAssets }} assets in {{ assetGroups.length }} groups
          </div>
          
          <!-- Format breakdown -->
          <div class="flex gap-2 flex-wrap">
            <span 
              v-for="[format, count] in formatCounts" 
              :key="format"
              class="px-2 py-1 text-xs rounded"
              :class="getFormatBadgeClass(format)"
            >
              {{ format.toUpperCase() }}: {{ count }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Asset Groups -->
      <div class="space-y-4">
        <div 
          v-for="group in assetGroups" 
          :key="group.id"
          class="border rounded-lg overflow-hidden"
        >
          <!-- Group Header -->
          <div 
            class="bg-muted/50 p-3 border-b cursor-pointer hover:bg-muted/70 transition-colors"
            @click="toggleGroup(group.id)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-sm">
                  {{ expandedGroups.has(group.id) ? '▼' : '▶' }}
                </span>
                
                <div>
                  <h3 class="font-medium">{{ group.name }}</h3>
                  <div class="text-xs text-muted-foreground mt-1">
                    {{ group.assets.length }} assets • {{ formatFileSize(group.totalSize) }} • {{ group.fileCount }} files
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <button
                  @click.stop="generateGroupMHL(group)"
                  class="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  title="Generate MHL for this group"
                >
                  📋 MHL
                </button>
                
                <button
                  @click.stop="hashGroup(group)"
                  class="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                  title="Hash all files in group"
                >
                  🔒 Hash
                </button>
              </div>
            </div>
          </div>
          
          <!-- Group Assets -->
          <div v-if="expandedGroups.has(group.id)" class="divide-y">
            <MediaAssetItem
              v-for="asset in group.assets"
              :key="asset.id"
              :asset="asset"
              :depth="0"
              :selected-asset="selectedAsset"
              :active-rules="activeRules"
              @asset-selected="$emit('asset-selected', $event)"
              @file-selected="$emit('file-selected', $event)"
              @create-rule="$emit('create-rule', $event)"
              @hash-asset="hashAsset"
            />
          </div>
        </div>
      </div>
      
      <!-- Actions Bar -->
      <div v-if="assetGroups.length > 0" class="mt-6 p-4 bg-muted/30 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            <strong>{{ totalAssets }}</strong> media assets • <strong>{{ totalSize }}</strong> total size
          </div>
          
          <div class="flex gap-2">
            <button
              @click="generateAllMHL"
              class="px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              📋 Generate Complete MHL
            </button>
            
            <button
              @click="hashAll"
              class="px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              🔒 Hash All Files
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AssetGroup, MediaAsset } from '@/composables/useMediaAssets'
import type { FileNode, IngestRule } from '@/types'
import MediaAssetItem from './MediaAssetItem.vue'

interface Props {
  assetGroups?: AssetGroup[]
  selectedAsset?: MediaAsset | null
  activeRules: IngestRule[]
  isScanning?: boolean
}

const props = defineProps<Props>()
const expandedGroups = ref(new Set<string>())

const emit = defineEmits<{
  'asset-selected': [asset: MediaAsset]
  'file-selected': [file: FileNode]
  'create-rule': [data: any]
  'generate-mhl': [groups: AssetGroup[]]
  'hash-files': [assets: MediaAsset[]]
}>()

const totalAssets = computed(() => 
  props.assetGroups?.reduce((sum, group) => sum + group.assets.length, 0) || 0
)

const totalSize = computed(() => 
  formatFileSize(props.assetGroups?.reduce((sum, group) => sum + group.totalSize, 0) || 0)
)

const formatCounts = computed(() => {
  const counts = new Map<string, number>()
  
  props.assetGroups?.forEach(group => {
    group.assets.forEach(asset => {
      counts.set(asset.format, (counts.get(asset.format) || 0) + 1)
    })
  })
  
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
})

function toggleGroup(groupId: string) {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

function generateGroupMHL(group: AssetGroup) {
  emit('generate-mhl', [group])
}

function generateAllMHL() {
  if (props.assetGroups) {
    emit('generate-mhl', props.assetGroups)
  }
}

function hashGroup(group: AssetGroup) {
  emit('hash-files', group.assets)
}

function hashAsset(asset: MediaAsset) {
  emit('hash-files', [asset])
}

function hashAll() {
  if (props.assetGroups) {
    const allAssets = props.assetGroups.flatMap(group => group.assets)
    emit('hash-files', allAssets)
  }
}

function getFormatBadgeClass(format: string): string {
  const classes = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    braw: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    sony: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    canon: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    standard: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
  }
  return classes[format as keyof typeof classes] || classes.standard
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Auto-expand first group on load
if (props.assetGroups && props.assetGroups.length > 0 && expandedGroups.value.size === 0) {
  expandedGroups.value.add(props.assetGroups[0].id)
}
</script>