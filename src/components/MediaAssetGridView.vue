<template>
  <div class="media-asset-grid-view h-full overflow-auto">
    <!-- View Controls -->
    <div class="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">Media Assets</h2>
          <div v-if="assetGroups.length > 0" class="text-sm text-muted-foreground">
            {{ totalAssets }} assets • {{ formatFileSize(totalSize) }}
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Generate Thumbnails Button -->
          <button
            @click="generateAllThumbnails"
            :disabled="isGeneratingThumbnails"
            class="px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {{ isGeneratingThumbnails ? 'Generating...' : '🖼️ Generate Thumbnails' }}
          </button>
          
          <!-- View Toggle -->
          <div class="flex border rounded-lg overflow-hidden">
            <button
              @click="setViewType('grid')"
              :class="viewType === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'"
              class="px-3 py-2 text-sm transition-colors"
            >
              ⊞ Grid
            </button>
            <button
              @click="setViewType('list')"
              :class="viewType === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'"
              class="px-3 py-2 text-sm transition-colors"
            >
              ☰ List
            </button>
          </div>
        </div>
      </div>
      
      <!-- Generation Progress -->
      <div v-if="isGeneratingThumbnails" class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
        <div class="flex items-center gap-2 text-sm">
          <div class="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Generating thumbnails... {{ Math.round(thumbnailProgress) }}%</span>
        </div>
        <div v-if="currentGeneratingAsset" class="text-xs text-muted-foreground mt-1">
          {{ currentGeneratingAsset }}
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${thumbnailProgress}%` }"
          ></div>
        </div>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-if="allAssets.length === 0" class="flex items-center justify-center h-full text-muted-foreground">
      <div class="text-center">
        <div class="text-lg mb-2">{{ isScanning ? 'Building asset index...' : 'No media assets found' }}</div>
        <div class="text-sm">
          {{ isScanning ? 'Assets will appear as they are detected' : 'Select a folder from the tree to view its media assets' }}
        </div>
      </div>
    </div>
    
    <!-- Grid View -->
    <div v-else-if="viewType === 'grid'" class="p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div
          v-for="asset in allAssets"
          :key="asset.id"
          class="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
          :class="{ 'ring-2 ring-primary': selectedAsset?.id === asset.id }"
          @click="handleAssetSelect(asset)"
        >
          <!-- Media Preview -->
          <div class="aspect-video bg-black relative overflow-hidden">
            <ScrubbableImage
              v-if="asset.spriteUrl"
              :spriteUrl="asset.spriteUrl"
              :width="300"
              :height="200"
              :rows="asset.spriteRows || 5"
              :columns="asset.spriteColumns || 10"
            >
              <template #overlay>
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div class="w-12 h-12 bg-black/75 rounded-full flex items-center justify-center">
                    <div class="w-6 h-6 border-l-4 border-white ml-1"></div>
                  </div>
                </div>
                <div v-if="asset.metadata.duration" class="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                  {{ formatDuration(asset.metadata.duration) }}
                </div>
              </template>
            </ScrubbableImage>
            
            <img 
              v-else-if="asset.thumbnail"
              :src="asset.thumbnail" 
              :alt="asset.name"
              class="w-full h-full object-cover"
            />
            
            <div v-else class="w-full h-full flex items-center justify-center text-4xl">
              {{ getAssetIcon(asset) }}
            </div>
            
            <!-- Generating Indicator -->
            <div v-if="isGeneratingThumbnail(asset.id)" class="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
            </div>
          </div>
          
          <!-- Asset Info -->
          <div class="p-3 space-y-2">
            <div class="flex items-center gap-2">
              <h3 class="font-medium text-sm truncate flex-1">{{ asset.name }}</h3>
              <span 
                class="px-2 py-1 text-xs rounded-full font-medium flex-shrink-0"
                :class="getFormatBadgeClass(asset.format)"
              >
                {{ asset.format.toUpperCase() }}
              </span>
            </div>
            
            <div class="text-xs text-muted-foreground space-y-1">
              <div class="flex justify-between">
                <span>{{ formatFileSize(getTotalSize(asset)) }}</span>
                <span>{{ asset.relatedFiles.length }} files</span>
              </div>
              
              <div v-if="asset.metadata.resolution || asset.metadata.frameRate" class="flex justify-between">
                <span v-if="asset.metadata.resolution">{{ asset.metadata.resolution }}</span>
                <span v-if="asset.metadata.frameRate">{{ asset.metadata.frameRate }}fps</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- List View -->
    <div v-else class="p-4">
      <div class="bg-card border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-muted/50 border-b">
            <tr>
              <th class="text-left p-3 text-sm font-medium">Asset</th>
              <th class="text-left p-3 text-sm font-medium">Format</th>
              <th class="text-left p-3 text-sm font-medium">Resolution</th>
              <th class="text-left p-3 text-sm font-medium">Duration</th>
              <th class="text-left p-3 text-sm font-medium">Size</th>
              <th class="text-left p-3 text-sm font-medium">Files</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="asset in allAssets"
              :key="asset.id"
              class="hover:bg-muted/30 cursor-pointer"
              :class="{ 'bg-primary/10': selectedAsset?.id === asset.id }"
              @click="handleAssetSelect(asset)"
            >
              <td class="p-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-8 rounded overflow-hidden bg-black flex-shrink-0">
                    <img 
                      v-if="asset.thumbnail"
                      :src="asset.thumbnail" 
                      :alt="asset.name"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center text-lg">
                      {{ getAssetIcon(asset) }}
                    </div>
                  </div>
                  <span class="font-medium text-sm">{{ asset.name }}</span>
                </div>
              </td>
              <td class="p-3">
                <span 
                  class="px-2 py-1 text-xs rounded-full font-medium"
                  :class="getFormatBadgeClass(asset.format)"
                >
                  {{ asset.format.toUpperCase() }}
                </span>
              </td>
              <td class="p-3 text-sm">{{ asset.metadata.resolution || '—' }}</td>
              <td class="p-3 text-sm">{{ asset.metadata.duration ? formatDuration(asset.metadata.duration) : '—' }}</td>
              <td class="p-3 text-sm">{{ formatFileSize(getTotalSize(asset)) }}</td>
              <td class="p-3 text-sm">{{ asset.relatedFiles.length }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AssetGroup, MediaAsset } from '@/composables/useMediaAssets'
import type { FileNode, IngestRule } from '@/types'
import { useAssetThumbnails } from '@/composables/useAssetThumbnails'
import ScrubbableImage from './ScrubbableImage.vue'

interface Props {
  assetGroups?: AssetGroup[]
  selectedAsset?: MediaAsset | null
  activeRules: IngestRule[]
  isScanning?: boolean
}

const props = defineProps<Props>()
const viewType = ref<'grid' | 'list'>('grid')

const emit = defineEmits<{
  'asset-selected': [asset: MediaAsset]
  'file-selected': [file: FileNode]
  'view-type-changed': [viewType: 'grid' | 'list']
}>()

const {
  isGenerating: isGeneratingThumbnails,
  totalProgress: thumbnailProgress,
  currentAsset: currentGeneratingAsset,
  generateAssetThumbnails,
  isGeneratingThumbnail
} = useAssetThumbnails()

const allAssets = computed(() => 
  props.assetGroups?.flatMap(group => group.assets) || []
)

const totalAssets = computed(() => allAssets.value.length)

const totalSize = computed(() => 
  props.assetGroups?.reduce((sum, group) => sum + group.totalSize, 0) || 0
)

function setViewType(type: 'grid' | 'list') {
  viewType.value = type
  emit('view-type-changed', type)
}

function handleAssetSelect(asset: MediaAsset) {
  emit('asset-selected', asset)
}

async function generateAllThumbnails() {
  if (allAssets.value.length > 0) {
    await generateAssetThumbnails(allAssets.value)
  }
}

function getAssetIcon(asset: MediaAsset): string {
  switch (asset.format) {
    case 'red': return '🔴'
    case 'braw': return '⚫'
    case 'sony': return '🟡'
    case 'canon': return '🔵'
    default:
      switch (asset.type) {
        case 'clip': return '🎬'
        case 'sequence': return '🎞️'
        case 'still': return '🖼️'
        default: return '📁'
      }
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

function getTotalSize(asset: MediaAsset): number {
  return asset.relatedFiles.reduce((sum, file) => sum + (file.size || 0), 0)
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
</script>