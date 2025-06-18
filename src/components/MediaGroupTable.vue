<template>
  <div class="bg-card border rounded-lg overflow-hidden">
    <table class="w-full">
      <thead class="bg-muted/50 border-b">
        <tr>
          <th class="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70" @click="handleSort('name')">
            Name {{ getSortIcon('name') }}
          </th>
          <th class="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70" @click="handleSort('format')">
            Format {{ getSortIcon('format') }}
          </th>
          <th class="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70" @click="handleSort('resolution')">
            Resolution {{ getSortIcon('resolution') }}
          </th>
          <th class="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70" @click="handleSort('size')">
            Size {{ getSortIcon('size') }}
          </th>
          <th class="text-left p-3 text-sm font-medium">Versions</th>
          <th class="text-left p-3 text-sm font-medium">Tags</th>
        </tr>
      </thead>
      <tbody class="divide-y">
        <tr
          v-for="group in groups"
          :key="group.id"
          class="hover:bg-muted/30 cursor-pointer"
          @click="handleSelect(group)"
        >
          <td class="p-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-8 rounded overflow-hidden bg-black flex-shrink-0">
                <img 
                  v-if="group.primaryRepresentation.asset.thumbnail"
                  :src="group.primaryRepresentation.asset.thumbnail" 
                  :alt="group.baseName"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-lg">
                  {{ getFormatIcon(group.primaryRepresentation.asset.format) }}
                </div>
              </div>
              <span class="font-medium text-sm">{{ group.baseName }}</span>
            </div>
          </td>
          <td class="p-3">
            <span 
              class="px-2 py-1 text-xs rounded-full font-medium"
              :class="getFormatBadgeClass(group.primaryRepresentation.asset.format)"
            >
              {{ group.primaryRepresentation.asset.format.toUpperCase() }}
            </span>
          </td>
          <td class="p-3 text-sm">{{ group.primaryRepresentation.asset.metadata.resolution || '—' }}</td>
          <td class="p-3 text-sm">{{ formatFileSize(getTotalSize(group)) }}</td>
          <td class="p-3">
            <div v-if="showRepresentations" class="space-y-1">
              <div
                v-for="rep in group.representations"
                :key="rep.asset.id"
                class="text-xs capitalize"
              >
                {{ rep.type }}
              </div>
            </div>
            <div v-else class="text-sm">
              {{ group.representations.length }}
            </div>
          </td>
          <td class="p-3">
            <div class="flex flex-wrap gap-1">
              <span
                v-for="tag in group.tags.slice(0, 2)"
                :key="tag"
                class="px-2 py-1 text-xs bg-muted text-muted-foreground rounded cursor-pointer hover:bg-primary/10"
                @click.stop="handleTagClick(tag)"
              >
                {{ formatTag(tag) }}
              </span>
              <span v-if="group.tags.length > 2" class="text-xs text-muted-foreground">
                +{{ group.tags.length - 2 }}
              </span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { MediaGroup } from '@/composables/useMediaRepresentations'

interface Props {
  groups: MediaGroup[]
  showRepresentations?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select': [group: MediaGroup]
  'tag-click': [tag: string]
  'sort': [field: string]
}>()

const sortField = ref('')
const sortOrder = ref<'asc' | 'desc'>('asc')

function handleSelect(group: MediaGroup) {
  emit('select', group)
}

function handleTagClick(tag: string) {
  emit('tag-click', tag)
}

function handleSort(field: string) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  emit('sort', field)
}

function getSortIcon(field: string): string {
  if (sortField.value !== field) return ''
  return sortOrder.value === 'asc' ? '↑' : '↓'
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