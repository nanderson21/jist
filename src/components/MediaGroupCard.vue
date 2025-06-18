<template>
  <div
    class="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
    @click="handleSelect"
  >
    <!-- Media Preview -->
    <div class="aspect-video bg-black relative overflow-hidden">
      <div v-if="group.primaryRepresentation.asset.spriteUrl" class="w-full h-full">
        <ScrubbableImage
          :spriteUrl="group.primaryRepresentation.asset.spriteUrl"
          :width="300"
          :height="200"
          :rows="group.primaryRepresentation.asset.spriteRows || 5"
          :columns="group.primaryRepresentation.asset.spriteColumns || 10"
        >
          <template #overlay>
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div class="w-12 h-12 bg-black/75 rounded-full flex items-center justify-center">
                <div class="w-6 h-6 border-l-4 border-white ml-1"></div>
              </div>
            </div>
          </template>
        </ScrubbableImage>
      </div>
      
      <div v-else-if="group.primaryRepresentation.asset.thumbnail" class="w-full h-full">
        <img 
          :src="group.primaryRepresentation.asset.thumbnail" 
          :alt="group.baseName"
          class="w-full h-full object-cover"
        />
      </div>
      
      <div v-else class="w-full h-full flex items-center justify-center text-4xl">
        {{ getFormatIcon(group.primaryRepresentation.asset.format) }}
      </div>
      
      <!-- Representation Count Badge -->
      <div v-if="group.representations.length > 1" class="absolute top-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
        {{ group.representations.length }} versions
      </div>
    </div>
    
    <!-- Card Content -->
    <div class="p-4 space-y-3">
      <!-- Title and Format -->
      <div class="space-y-1">
        <h3 class="font-medium text-sm truncate">{{ group.baseName }}</h3>
        <div class="flex items-center justify-between">
          <span 
            class="px-2 py-1 text-xs rounded-full font-medium"
            :class="getFormatBadgeClass(group.primaryRepresentation.asset.format)"
          >
            {{ group.primaryRepresentation.asset.format.toUpperCase() }}
          </span>
          <span class="text-xs text-muted-foreground">
            {{ formatFileSize(getTotalSize(group)) }}
          </span>
        </div>
      </div>
      
      <!-- Representations -->
      <div v-if="showRepresentations && group.representations.length > 1" class="space-y-1">
        <div class="text-xs font-medium text-muted-foreground">Versions:</div>
        <div class="space-y-1">
          <div
            v-for="rep in group.representations"
            :key="rep.asset.id"
            class="flex items-center justify-between text-xs"
          >
            <span class="capitalize">{{ rep.type }}</span>
            <span class="text-muted-foreground">{{ rep.resolution || '—' }}</span>
          </div>
        </div>
      </div>
      
      <!-- Tags -->
      <div class="flex flex-wrap gap-1">
        <span
          v-for="tag in group.tags.slice(0, 3)"
          :key="tag"
          class="px-2 py-1 text-xs bg-muted text-muted-foreground rounded cursor-pointer hover:bg-primary/10"
          @click.stop="handleTagClick(tag)"
        >
          {{ formatTag(tag) }}
        </span>
        <span v-if="group.tags.length > 3" class="text-xs text-muted-foreground">
          +{{ group.tags.length - 3 }}
        </span>
      </div>
      
      <!-- Metadata -->
      <div class="text-xs text-muted-foreground space-y-1">
        <div v-if="group.primaryRepresentation.asset.metadata.resolution" class="flex justify-between">
          <span>Resolution:</span>
          <span>{{ group.primaryRepresentation.asset.metadata.resolution }}</span>
        </div>
        <div v-if="group.primaryRepresentation.asset.metadata.frameRate" class="flex justify-between">
          <span>Frame Rate:</span>
          <span>{{ group.primaryRepresentation.asset.metadata.frameRate }}fps</span>
        </div>
        <div v-if="group.metadata.captureRoll" class="flex justify-between">
          <span>Capture Roll:</span>
          <span>{{ group.metadata.captureRoll }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MediaGroup } from '@/composables/useMediaRepresentations'
import ScrubbableImage from './ScrubbableImage.vue'

interface Props {
  group: MediaGroup
  showRepresentations?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select': [group: MediaGroup]
  'tag-click': [tag: string]
}>()

function handleSelect() {
  emit('select', props.group)
}

function handleTagClick(tag: string) {
  emit('tag-click', tag)
}

function getFormatIcon(format: string): string {
  switch (format) {
    case 'red': return '🔴'
    case 'braw': return '⚫'
    case 'sony': return '🟡'
    case 'canon': return '🔵'
    default: return '🎬'
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

function formatTag(tag: string): string {
  const [category, value] = tag.split(':')
  return value || tag
}

function getTotalSize(group: MediaGroup): number {
  return group.representations.reduce((sum, rep) => 
    sum + (rep.asset.primaryFile.size || 0), 0
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
</script>