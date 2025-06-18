<template>
  <div class="metadata-inspector h-full flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b bg-background/95 backdrop-blur">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <h3 class="text-lg font-semibold">Metadata Inspector</h3>
          <p class="text-sm text-muted-foreground">
            {{ file?.name || 'No file selected' }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="file"
            @click="extractMetadata"
            :disabled="isLoading"
            class="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {{ isLoading ? '🔄 Analyzing...' : '🔍 Inspect' }}
          </button>
          <button
            @click="$emit('close')"
            class="p-1 hover:bg-accent rounded"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-h-0 overflow-hidden">
      <div v-if="!file" class="p-8 text-center text-muted-foreground">
        <div class="text-6xl mb-4">📄</div>
        <p class="text-lg">Select a file to inspect its metadata</p>
        <p class="text-sm mt-2">Click "Inspect" to extract comprehensive metadata properties</p>
      </div>

      <div v-else-if="error" class="p-4 text-center text-destructive">
        <div class="text-4xl mb-2">⚠️</div>
        <p class="font-medium">Metadata Extraction Failed</p>
        <p class="text-sm mt-1">{{ error }}</p>
        <button
          @click="extractMetadata"
          class="mt-3 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>

      <div v-else-if="isLoading" class="p-8 text-center">
        <div class="text-6xl mb-4 animate-spin">🔄</div>
        <p class="text-lg font-medium">Analyzing Metadata...</p>
        <p class="text-sm text-muted-foreground mt-1">
          This may take a few moments for large files
        </p>
      </div>

      <div v-else-if="metadata" class="flex-1 overflow-hidden flex flex-col">
        <!-- Metadata Summary -->
        <div class="p-4 border-b bg-muted/20">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="space-y-1">
              <div class="font-medium">{{ metadata.file.format }}</div>
              <div class="text-muted-foreground">{{ formatFileSize(metadata.file.size) }}</div>
            </div>
            <div class="space-y-1 text-right">
              <div class="font-medium">{{ metadata.properties.length }} Properties</div>
              <div class="text-muted-foreground">
                {{ metadata.technical.duration ? `${Math.round(metadata.technical.duration)}s` : 'Unknown duration' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Property Categories -->
        <div class="flex-1 overflow-auto">
          <div class="p-4 space-y-4">
            <!-- Search/Filter -->
            <div class="sticky top-0 bg-background z-10 pb-2">
              <input
                v-model="searchTerm"
                placeholder="Search properties..."
                class="w-full px-3 py-2 text-sm border border-input rounded-md"
              />
            </div>

            <!-- Category Tabs -->
            <div class="flex gap-1 text-xs border-b">
              <button
                v-for="category in categories"
                :key="category.key"
                @click="selectedCategory = category.key"
                class="px-3 py-2 rounded-t border-b-2 transition-colors"
                :class="selectedCategory === category.key 
                  ? 'border-primary text-primary font-medium' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'"
              >
                {{ category.label }} ({{ category.count }})
              </button>
            </div>

            <!-- Properties List -->
            <div class="space-y-2">
              <div
                v-for="property in filteredProperties"
                :key="property.id"
                class="group p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                :class="selectedProperties.has(property.id) ? 'bg-primary/10 border-primary/50' : ''"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0 space-y-1">
                    <div class="flex items-center gap-2">
                      <button
                        @click="togglePropertySelection(property)"
                        class="shrink-0 w-4 h-4 border rounded flex items-center justify-center text-xs"
                        :class="selectedProperties.has(property.id) 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'border-input hover:border-primary'"
                      >
                        {{ selectedProperties.has(property.id) ? '✓' : '' }}
                      </button>
                      <div class="font-medium text-sm truncate">{{ property.displayName }}</div>
                      <div class="shrink-0 px-1.5 py-0.5 text-xs bg-muted rounded">
                        {{ property.source }}
                      </div>
                    </div>
                    
                    <div class="text-xs text-muted-foreground">
                      {{ property.key }}
                    </div>
                    
                    <div class="font-mono text-sm break-all">
                      {{ formatPropertyValue(property) }}
                    </div>
                    
                    <div v-if="property.description" class="text-xs text-muted-foreground italic">
                      {{ property.description }}
                    </div>
                  </div>
                  
                  <div class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      @click="copyProperty(property)"
                      class="p-1 text-xs hover:bg-accent rounded"
                      title="Copy value"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- No Results -->
            <div v-if="filteredProperties.length === 0" class="p-8 text-center text-muted-foreground">
              <div class="text-4xl mb-2">🔍</div>
              <p>No properties found</p>
              <p class="text-xs mt-1">Try adjusting your search or category filter</p>
            </div>
          </div>
        </div>

        <!-- Actions Footer -->
        <div class="p-4 border-t bg-background/95 backdrop-blur">
          <div class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
              {{ selectedProperties.size }} selected
            </div>
            <div class="flex gap-2">
              <button
                @click="exportSelectedProperties"
                :disabled="selectedProperties.size === 0"
                class="px-3 py-1 text-xs border border-input rounded hover:bg-accent disabled:opacity-50"
              >
                📤 Export
              </button>
              <button
                @click="createRuleFromSelection"
                :disabled="selectedProperties.size === 0"
                class="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
              >
                🔧 Create Rule
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAdvancedMetadata } from '@/composables/useAdvancedMetadata'
import type { FileNode } from '@/types'
import type { MetadataProperty, ExtractedMetadata } from '@/composables/useAdvancedMetadata'

interface Props {
  file?: FileNode | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'close': []
  'create-rule': [properties: MetadataProperty[], file: FileNode]
  'export-metadata': [metadata: ExtractedMetadata, file: FileNode]
}>()

const { isLoading, error, extractMetadata: extractMetadataFn } = useAdvancedMetadata()

const metadata = ref<ExtractedMetadata | null>(null)
const selectedProperties = ref(new Set<string>())
const searchTerm = ref('')
const selectedCategory = ref<string>('all')

// Auto-extract metadata when file changes
watch(() => props.file, async (newFile) => {
  if (newFile && newFile.type === 'file') {
    await extractMetadata()
  } else {
    metadata.value = null
    selectedProperties.value.clear()
  }
}, { immediate: true })

// Property categories
const categories = computed(() => {
  if (!metadata.value) return []
  
  const categoryCount = metadata.value.properties.reduce((acc, prop) => {
    acc[prop.category] = (acc[prop.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const allCategories = [
    { key: 'all', label: 'All', count: metadata.value.properties.length },
    { key: 'general', label: 'General', count: categoryCount.general || 0 },
    { key: 'technical', label: 'Technical', count: categoryCount.technical || 0 },
    { key: 'video', label: 'Video', count: categoryCount.video || 0 },
    { key: 'audio', label: 'Audio', count: categoryCount.audio || 0 },
    { key: 'camera', label: 'Camera', count: categoryCount.camera || 0 },
    { key: 'image', label: 'Image', count: categoryCount.image || 0 },
    { key: 'custom', label: 'Custom', count: categoryCount.custom || 0 }
  ]

  return allCategories.filter(cat => cat.count > 0)
})

// Filtered properties based on search and category
const filteredProperties = computed(() => {
  if (!metadata.value) return []
  
  let properties = metadata.value.properties
  
  // Filter by category
  if (selectedCategory.value !== 'all') {
    properties = properties.filter(prop => prop.category === selectedCategory.value)
  }
  
  // Filter by search term
  if (searchTerm.value.trim()) {
    const search = searchTerm.value.toLowerCase()
    properties = properties.filter(prop => 
      prop.displayName.toLowerCase().includes(search) ||
      prop.key.toLowerCase().includes(search) ||
      String(prop.value).toLowerCase().includes(search)
    )
  }
  
  return properties.sort((a, b) => {
    // Sort by category first, then by display name
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }
    return a.displayName.localeCompare(b.displayName)
  })
})

async function extractMetadata() {
  if (!props.file) return
  
  try {
    metadata.value = await extractMetadataFn(props.file)
    selectedProperties.value.clear()
  } catch (err) {
    console.error('Failed to extract metadata:', err)
  }
}

function togglePropertySelection(property: MetadataProperty) {
  if (selectedProperties.value.has(property.id)) {
    selectedProperties.value.delete(property.id)
  } else {
    selectedProperties.value.add(property.id)
  }
}

function formatPropertyValue(property: MetadataProperty): string {
  const value = property.value
  
  switch (property.type) {
    case 'size':
      return typeof value === 'number' ? formatFileSize(value) : String(value)
    case 'duration':
      return typeof value === 'number' ? formatDuration(value) : String(value)
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleString()
      } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return new Date(value).toLocaleDateString()
      }
      return String(value)
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value)
    default:
      return String(value)
  }
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
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

async function copyProperty(property: MetadataProperty) {
  try {
    await navigator.clipboard.writeText(String(property.value))
    // Could show a toast notification here
  } catch (err) {
    console.warn('Failed to copy to clipboard:', err)
  }
}

function exportSelectedProperties() {
  if (!metadata.value || !props.file) return
  
  const selectedProps = metadata.value.properties.filter(prop => 
    selectedProperties.value.has(prop.id)
  )
  
  const exportData = {
    file: props.file.name,
    path: props.file.path,
    extractedAt: new Date().toISOString(),
    properties: selectedProps,
    metadata: {
      technical: metadata.value.technical,
      camera: metadata.value.camera,
      production: metadata.value.production,
      file: metadata.value.file
    }
  }
  
  emit('export-metadata', metadata.value, props.file)
  
  // Also download as JSON
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.file.name}_metadata.json`
  a.click()
  URL.revokeObjectURL(url)
}

function createRuleFromSelection() {
  if (!metadata.value || !props.file) return
  
  const selectedProps = metadata.value.properties.filter(prop => 
    selectedProperties.value.has(prop.id)
  )
  
  emit('create-rule', selectedProps, props.file)
}
</script>

<style scoped>
.metadata-inspector {
  max-height: 100vh;
}

.metadata-inspector ::-webkit-scrollbar {
  width: 6px;
}

.metadata-inspector ::-webkit-scrollbar-track {
  background: transparent;
}

.metadata-inspector ::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}

.metadata-inspector ::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}
</style>