<template>
  <div class="metadata-viewer">
    <div v-if="loading" class="text-center py-4">
      Loading metadata...
    </div>
    
    <div v-else-if="metadata" class="space-y-4">
      <!-- MediaInfo Section -->
      <div v-if="metadata.mediaInfo" class="border rounded-lg p-4">
        <h4 class="font-semibold mb-2">Media Information</h4>
        <dl class="grid grid-cols-2 gap-2 text-sm">
          <template v-for="(value, key) in metadata.mediaInfo" :key="key">
            <dt class="font-medium">{{ formatKey(key) }}:</dt>
            <dd>{{ value }}</dd>
          </template>
        </dl>
      </div>
      
      <!-- EXIF Data Section -->
      <div v-if="metadata.exifData" class="border rounded-lg p-4">
        <h4 class="font-semibold mb-2">EXIF Data</h4>
        <dl class="grid grid-cols-2 gap-2 text-sm">
          <template v-for="(value, key) in metadata.exifData" :key="key">
            <dt class="font-medium">{{ formatKey(key) }}:</dt>
            <dd>{{ value }}</dd>
          </template>
        </dl>
      </div>
    </div>
    
    <div v-else class="text-muted-foreground">
      Select a media file to view metadata
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FileNode, FileMetadata } from '@/types'

interface Props {
  node?: FileNode | null
}

const props = defineProps<Props>()
const metadata = ref<FileMetadata | null>(null)
const loading = ref(false)

// Watch for node changes
watch(() => props.node, async (newNode) => {
  if (!newNode || newNode.type === 'directory') {
    metadata.value = null
    return
  }
  
  // In a real implementation, you would extract metadata here
  // For now, we'll simulate it
  await extractMetadata(newNode)
})

async function extractMetadata(node: FileNode) {
  loading.value = true
  
  // Simulate metadata extraction
  // In a real app, you'd use libraries like exifr or call a backend service
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Mock metadata based on file extension
  const ext = node.name.split('.').pop()?.toLowerCase()
  
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) {
    metadata.value = {
      mediaInfo: {
        format: ext?.toUpperCase(),
        duration: Math.floor(Math.random() * 3600),
        bitRate: Math.floor(Math.random() * 10000000),
        videoCodec: 'H.264',
        audioCodec: 'AAC',
        resolution: '1920x1080',
        frameRate: 29.97
      }
    }
  } else if (['jpg', 'jpeg', 'png', 'tiff'].includes(ext || '')) {
    metadata.value = {
      exifData: {
        make: 'Canon',
        model: 'EOS R5',
        dateTime: new Date().toISOString(),
        exposureTime: '1/125',
        fNumber: 2.8,
        iso: 400
      }
    }
  } else {
    metadata.value = null
  }
  
  loading.value = false
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}
</script>