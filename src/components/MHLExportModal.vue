<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-background border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
      <!-- Header -->
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Generate MHL File</h2>
          <button
            @click="$emit('cancel')"
            class="p-2 hover:bg-accent rounded-full"
          >
            ✕
          </button>
        </div>
        
        <p class="text-sm text-muted-foreground mt-2">
          Configure options for Media Hash List generation
        </p>
      </div>
      
      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- File Selection Summary -->
        <div class="bg-muted/50 p-4 rounded-lg">
          <h3 class="font-medium mb-2">Selected Content</h3>
          <div class="text-sm text-muted-foreground space-y-1">
            <div>{{ assetGroups.length }} asset group{{ assetGroups.length !== 1 ? 's' : '' }}</div>
            <div>{{ totalAssets }} media asset{{ totalAssets !== 1 ? 's' : '' }}</div>
            <div>{{ totalFiles }} file{{ totalFiles !== 1 ? 's' : '' }} ({{ formatFileSize(totalSize) }})</div>
          </div>
        </div>
        
        <!-- Hash Algorithm -->
        <div class="space-y-3">
          <label class="block text-sm font-medium">Hash Algorithm</label>
          <div class="space-y-2">
            <label class="flex items-center gap-2">
              <input
                type="radio"
                v-model="options.hashType"
                value="md5"
                class="form-radio"
              />
              <span class="text-sm">MD5 (fastest, widely supported)</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="radio"
                v-model="options.hashType"
                value="sha1"
                class="form-radio"
              />
              <span class="text-sm">SHA-1 (more secure than MD5)</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="radio"
                v-model="options.hashType"
                value="sha256"
                class="form-radio"
              />
              <span class="text-sm">SHA-256 (most secure, slower)</span>
            </label>
          </div>
        </div>
        
        <!-- Path Options -->
        <div class="space-y-3">
          <label class="block text-sm font-medium">Path Settings</label>
          <div class="space-y-3">
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                v-model="options.relativePaths"
                class="form-checkbox"
              />
              <span class="text-sm">Use relative paths (recommended for portability)</span>
            </label>
            
            <div v-if="options.relativePaths" class="ml-6 space-y-2">
              <label class="block text-xs font-medium text-muted-foreground">Base Path</label>
              <input
                type="text"
                v-model="options.basePath"
                placeholder="Auto-detected from project root"
                class="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        
        <!-- Metadata Options -->
        <div class="space-y-3">
          <label class="block text-sm font-medium">Metadata Inclusion</label>
          <div class="space-y-2">
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                v-model="options.includeMetadata"
                class="form-checkbox"
              />
              <span class="text-sm">Include media asset metadata</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                v-model="options.includeCameraData"
                class="form-checkbox"
              />
              <span class="text-sm">Include camera-specific data</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                v-model="options.includeTimestamps"
                class="form-checkbox"
              />
              <span class="text-sm">Include file timestamps</span>
            </label>
          </div>
        </div>
        
        <!-- File Naming -->
        <div class="space-y-3">
          <label class="block text-sm font-medium">Output File</label>
          <div class="space-y-2">
            <input
              type="text"
              v-model="fileName"
              placeholder="Enter filename (without extension)"
              class="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p class="text-xs text-muted-foreground">
              File will be saved as: {{ fileName || 'project' }}.mhl
            </p>
          </div>
        </div>
        
        <!-- Advanced Options -->
        <details class="space-y-3">
          <summary class="text-sm font-medium cursor-pointer hover:text-primary">
            Advanced Options
          </summary>
          
          <div class="ml-4 space-y-3 mt-3">
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                v-model="options.verifyHashes"
                class="form-checkbox"
              />
              <span class="text-sm">Verify hashes after generation</span>
            </label>
            
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                v-model="options.includeHidden"
                class="form-checkbox"
              />
              <span class="text-sm">Include hidden/system files</span>
            </label>
            
            <div class="space-y-2">
              <label class="block text-xs font-medium text-muted-foreground">Creator Information</label>
              <input
                type="text"
                v-model="options.creatorName"
                placeholder="Your name or organization"
                class="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div class="space-y-2">
              <label class="block text-xs font-medium text-muted-foreground">Project Notes</label>
              <textarea
                v-model="options.notes"
                placeholder="Optional notes about this MHL"
                rows="3"
                class="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              ></textarea>
            </div>
          </div>
        </details>
        
        <!-- Progress (shown during generation) -->
        <div v-if="isGenerating" class="space-y-3">
          <div class="flex items-center gap-2">
            <div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span class="text-sm font-medium">Generating MHL...</span>
          </div>
          
          <div class="bg-muted rounded-full h-2 overflow-hidden">
            <div 
              class="bg-primary h-full transition-all duration-300"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
          
          <p class="text-xs text-muted-foreground">
            {{ progressText }}
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-6 border-t flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          Estimated time: {{ estimatedTime }}
        </div>
        
        <div class="flex gap-3">
          <button
            @click="$emit('cancel')"
            :disabled="isGenerating"
            class="px-4 py-2 text-sm border rounded hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            @click="generateMHL"
            :disabled="isGenerating || !fileName.trim()"
            class="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {{ isGenerating ? 'Generating...' : 'Generate MHL' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AssetGroup } from '@/composables/useMediaAssets'
import type { MHLOptions } from '@/composables/useMHL'

interface Props {
  assetGroups: AssetGroup[]
  defaultFileName?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'generate': [fileName: string, options: ExtendedMHLOptions]
  'cancel': []
}>()

interface ExtendedMHLOptions extends MHLOptions {
  includeCameraData: boolean
  includeTimestamps: boolean
  verifyHashes: boolean
  includeHidden: boolean
  creatorName: string
  notes: string
}

const fileName = ref(props.defaultFileName || '')
const isGenerating = ref(false)
const progress = ref(0)
const progressText = ref('')

const options = ref<ExtendedMHLOptions>({
  hashType: 'md5',
  includeMetadata: true,
  relativePaths: true,
  basePath: '',
  includeCameraData: true,
  includeTimestamps: true,
  verifyHashes: false,
  includeHidden: false,
  creatorName: '',
  notes: ''
})

const totalAssets = computed(() => 
  props.assetGroups.reduce((sum, group) => sum + group.assets.length, 0)
)

const totalFiles = computed(() => 
  props.assetGroups.reduce((sum, group) => sum + group.fileCount, 0)
)

const totalSize = computed(() => 
  props.assetGroups.reduce((sum, group) => sum + group.totalSize, 0)
)

const estimatedTime = computed(() => {
  const filesPerSecond = options.value.hashType === 'md5' ? 10 : 
                        options.value.hashType === 'sha1' ? 8 : 5
  const seconds = Math.ceil(totalFiles.value / filesPerSecond)
  
  if (seconds < 60) return `${seconds} seconds`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`
  return `${Math.ceil(seconds / 3600)} hours`
})

async function generateMHL() {
  if (!fileName.value.trim() || isGenerating.value) return
  
  isGenerating.value = true
  progress.value = 0
  progressText.value = 'Initializing...'
  
  try {
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += Math.random() * 10
        
        if (progress.value < 30) {
          progressText.value = 'Reading file metadata...'
        } else if (progress.value < 60) {
          progressText.value = 'Calculating checksums...'
        } else {
          progressText.value = 'Generating MHL file...'
        }
      }
    }, 500)
    
    // Emit the generation request
    emit('generate', fileName.value, options.value)
    
    // Clear interval after generation starts
    setTimeout(() => {
      clearInterval(progressInterval)
      progress.value = 100
      progressText.value = 'Complete!'
      
      setTimeout(() => {
        isGenerating.value = false
      }, 1000)
    }, 2000)
    
  } catch (error) {
    isGenerating.value = false
    console.error('Error generating MHL:', error)
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Auto-generate filename if not provided
watch(() => props.assetGroups, (groups) => {
  if (!fileName.value && groups.length > 0) {
    const date = new Date().toISOString().split('T')[0]
    fileName.value = `${groups[0].name}_${date}`
  }
}, { immediate: true })
</script>

<style scoped>
.form-radio:checked {
  @apply bg-primary border-primary;
}

.form-checkbox:checked {
  @apply bg-primary border-primary;
}
</style>