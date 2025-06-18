<template>
  <div class="media-asset-item">
    <div 
      class="flex items-center gap-3 py-2 px-3 rounded hover:bg-accent cursor-pointer group"
      :class="{
        'bg-primary/10 border border-primary/20': isSelected,
        'bg-accent/50': isAffectedByRule
      }"
      :style="{ paddingLeft: `${depth * 20 + 8}px` }"
      @click="handleClick"
    >
      <!-- Expand/Collapse Icon for Asset Groups -->
      <span v-if="asset.relatedFiles.length > 1" class="text-sm w-4 flex-shrink-0">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
      <span v-else class="w-4 flex-shrink-0"></span>
      
      <!-- Media Thumbnail or Icon -->
      <div class="flex-shrink-0">
        <div v-if="asset.thumbnail || asset.spriteUrl" class="w-16 h-10 rounded overflow-hidden bg-black">
          <ScrubbableImage
            v-if="asset.spriteUrl"
            :spriteUrl="asset.spriteUrl"
            :width="64"
            :height="40"
            :rows="asset.spriteRows || 5"
            :columns="asset.spriteColumns || 10"
            :showScrubBar="false"
          >
            <template #overlay>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-4 h-4 bg-black/75 rounded-full flex items-center justify-center">
                  <div class="w-2 h-2 border-l-2 border-white ml-0.5"></div>
                </div>
              </div>
            </template>
          </ScrubbableImage>
          <img 
            v-else-if="asset.thumbnail"
            :src="asset.thumbnail" 
            :alt="asset.name"
            class="w-full h-full object-cover"
          />
        </div>
        <span v-else class="text-xl">
          {{ getAssetIcon(asset) }}
        </span>
      </div>
      
      <!-- Asset Name and Metadata -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium truncate" :class="{ 'font-semibold': isSelected }">
            {{ asset.name }}
          </span>
          
          <!-- Format Badge -->
          <span 
            class="px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0"
            :class="getFormatBadgeClass(asset.format)"
          >
            {{ asset.format.toUpperCase() }}
          </span>
          
          <!-- Codec Badge -->
          <span 
            v-if="asset.metadata.codec"
            class="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded font-mono flex-shrink-0"
          >
            {{ asset.metadata.codec }}
          </span>
        </div>
        
        <!-- Asset Details -->
        <div class="text-xs text-muted-foreground mt-1 flex items-center gap-3">
          <span>{{ formatFileSize(getTotalSize(asset)) }}</span>
          <span>{{ asset.relatedFiles.length }} file{{ asset.relatedFiles.length !== 1 ? 's' : '' }}</span>
          
          <span v-if="asset.metadata.frameRate">{{ asset.metadata.frameRate }}fps</span>
          <span v-if="asset.metadata.resolution">{{ asset.metadata.resolution }}</span>
          <span v-if="asset.metadata.duration">{{ formatDuration(asset.metadata.duration) }}</span>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          @click.stop="$emit('create-rule', { asset, text: asset.name })"
          class="p-1 rounded hover:bg-accent-foreground/10"
          title="Create Ingest Rule"
        >
          <span class="text-xs">🏷️</span>
        </button>
        
        <button
          @click.stop="$emit('hash-asset', asset)"
          class="p-1 rounded hover:bg-accent-foreground/10"
          title="Generate Hash"
        >
          <span class="text-xs">🔒</span>
        </button>
      </div>
      
      <!-- Rule Indicators -->
      <div v-if="matchingRules.length > 0" class="flex gap-1 flex-shrink-0">
        <span 
          v-for="rule in matchingRules.slice(0, 3)" 
          :key="rule.id"
          class="w-2 h-2 rounded-full bg-primary"
          :title="rule.name"
        ></span>
        <span v-if="matchingRules.length > 3" class="text-xs text-muted-foreground">
          +{{ matchingRules.length - 3 }}
        </span>
      </div>
    </div>
    
    <!-- Related Files (when expanded) -->
    <div v-if="isExpanded && asset.relatedFiles.length > 1" class="ml-8 mt-1 space-y-1">
      <div 
        v-for="file in asset.relatedFiles"
        :key="file.path"
        class="flex items-center gap-2 py-1 px-2 text-xs text-muted-foreground hover:bg-accent/30 rounded"
        @click.stop="$emit('file-selected', file)"
      >
        <span class="w-3 flex-shrink-0">{{ getFileTypeIcon(file.name) }}</span>
        <span class="flex-1 truncate">{{ file.name }}</span>
        <span class="flex-shrink-0">{{ formatFileSize(file.size || 0) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MediaAsset } from '@/composables/useMediaAssets'
import type { FileNode, IngestRule } from '@/types'
import ScrubbableImage from './ScrubbableImage.vue'

interface Props {
  asset: MediaAsset
  depth: number
  selectedAsset?: MediaAsset | null
  activeRules: IngestRule[]
}

const props = defineProps<Props>()
const isExpanded = ref(false)

const emit = defineEmits<{
  'asset-selected': [asset: MediaAsset]
  'file-selected': [file: FileNode]
  'create-rule': [data: any]
  'hash-asset': [asset: MediaAsset]
}>()

const isSelected = computed(() => 
  props.selectedAsset?.id === props.asset.id
)

const matchingRules = computed(() => 
  props.activeRules.filter(rule => 
    rule.pathPatterns.some(pattern => 
      props.asset.primaryFile.path.includes(pattern.pattern)
    )
  )
)

const isAffectedByRule = computed(() => matchingRules.value.length > 0)

function handleClick() {
  if (props.asset.relatedFiles.length > 1) {
    isExpanded.value = !isExpanded.value
  }
  emit('asset-selected', props.asset)
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

function getFileTypeIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  if (['r3d', 'rdc', 'rmf', 'rmd'].includes(ext || '')) return '🔴'
  if (['braw'].includes(ext || '')) return '⚫'
  if (['mxf', 'mp4', 'mov'].includes(ext || '')) return '🎬'
  if (['xml', 'bim', 'ppm'].includes(ext || '')) return '📋'
  if (['jpg', 'jpeg', 'png', 'tiff'].includes(ext || '')) return '🖼️'
  if (['wav', 'mp3', 'aif'].includes(ext || '')) return '🎵'
  
  return '📄'
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