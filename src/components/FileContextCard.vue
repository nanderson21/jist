<template>
  <div class="file-context-card border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-background">
    <!-- File Header -->
    <div class="flex items-start gap-3 mb-3" @click="$emit('file-selected', file)">
      <div class="flex-shrink-0">
        <span class="text-2xl">{{ getFileIcon() }}</span>
      </div>
      
      <div class="flex-1 min-w-0">
        <h4 class="font-medium text-foreground truncate">{{ file.name }}</h4>
        <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{{ formatFileSize(file.size || 0) }}</span>
          <span v-if="fileMetadata.duration">{{ fileMetadata.duration }}</span>
          <span v-if="fileMetadata.resolution">{{ fileMetadata.resolution }}</span>
          <span v-if="fileMetadata.format">{{ fileMetadata.format }}</span>
        </div>
      </div>
      
      <!-- Context Confidence Badge -->
      <div v-if="context" class="flex-shrink-0">
        <span 
          class="text-xs px-2 py-1 rounded-full"
          :style="{ 
            backgroundColor: getContextColor() + '20',
            color: getContextColor()
          }"
        >
          {{ Math.round(context.confidence * 100) }}%
        </span>
      </div>
    </div>
    
    <!-- Context Tags -->
    <div v-if="displayTags.length > 0" class="mb-3">
      <div class="flex flex-wrap gap-1">
        <span
          v-for="tag in displayTags"
          :key="tag.name"
          class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
          :class="getTagStyle(tag.type)"
        >
          <span v-if="tag.icon">{{ tag.icon }}</span>
          {{ tag.name }}
        </span>
      </div>
    </div>
    
    <!-- File Relationships -->
    <div v-if="profile?.relationships && hasRelationships" class="mb-3 text-xs">
      <div class="space-y-1">
        <div v-if="profile.relationships.siblings.length > 0" class="text-muted-foreground">
          <span class="font-medium">Related:</span>
          {{ profile.relationships.siblings.length }} sibling{{ profile.relationships.siblings.length > 1 ? 's' : '' }}
        </div>
        <div v-if="profile.relationships.variants.length > 0" class="text-muted-foreground">
          <span class="font-medium">Variants:</span>
          {{ profile.relationships.variants.length }} version{{ profile.relationships.variants.length > 1 ? 's' : '' }}
        </div>
      </div>
    </div>
    
    <!-- Context Hierarchy Path -->
    <div v-if="context" class="mb-3 text-xs text-muted-foreground">
      <div class="flex items-center gap-1 truncate">
        <span>📁</span>
        <span>{{ context.hierarchy.slice(-3).join(' > ') }}</span>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div class="flex items-center justify-between">
      <div class="flex gap-1">
        <button
          @click.stop="handleAction('view')"
          class="text-xs px-3 py-1 rounded transition-colors"
          :class="getActionButtonStyle('primary')"
        >
          {{ getViewAction() }}
        </button>
        
        <button
          v-if="hasEditableContent"
          @click.stop="handleAction('edit')"
          class="text-xs px-3 py-1 rounded transition-colors"
          :class="getActionButtonStyle('secondary')"
        >
          {{ getEditAction() }}
        </button>
      </div>
      
      <!-- Context Actions -->
      <div class="flex items-center gap-1">
        <button
          v-if="context"
          @click.stop="$emit('context-action', 'filter-by-context', context)"
          class="p-1 text-muted-foreground hover:text-foreground rounded"
          :title="`Filter by ${context.name}`"
        >
          🔍
        </button>
        
        <button
          @click.stop="$emit('context-action', 'create-rule', context, file)"
          class="p-1 text-muted-foreground hover:text-foreground rounded"
          title="Create rule from this file"
        >
          ⚙️
        </button>
        
        <button
          @click.stop="handleAction('more')"
          class="p-1 text-muted-foreground hover:text-foreground rounded"
          title="More actions"
        >
          ⋯
        </button>
      </div>
    </div>
    
    <!-- Status Indicators -->
    <div v-if="statusIndicators.length > 0" class="mt-3 pt-3 border-t border-border/20">
      <div class="flex items-center gap-2">
        <span
          v-for="indicator in statusIndicators"
          :key="indicator.type"
          class="flex items-center gap-1 text-xs"
          :class="indicator.color"
          :title="indicator.description"
        >
          <span>{{ indicator.icon }}</span>
          <span>{{ indicator.label }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileNode } from '@/types'
import type { DetectedContext, FileContextProfile } from '@/composables/useContextDetection'

interface Props {
  file: FileNode
  context?: DetectedContext | null
  profile?: FileContextProfile | null
}

interface FileTag {
  name: string
  type: 'status' | 'category' | 'format' | 'technical' | 'semantic'
  icon?: string
}

interface StatusIndicator {
  type: string
  icon: string
  label: string
  color: string
  description: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'file-selected': [file: FileNode]
  'context-action': [action: string, context: DetectedContext, file?: FileNode]
}>()

// Computed properties
const fileExtension = computed(() => {
  return props.file.name.split('.').pop()?.toLowerCase() || ''
})

const fileMetadata = computed(() => {
  const ext = fileExtension.value
  
  // Mock metadata based on file type - in real app this would come from actual metadata
  if (['wav', 'mp3', 'aif', 'flac'].includes(ext)) {
    return {
      duration: '45:23',
      format: '48kHz/24bit',
      type: 'audio'
    }
  } else if (['mp4', 'mov', 'avi', 'r3d', 'braw'].includes(ext)) {
    return {
      duration: '2:15:30',
      resolution: '4096x2160',
      format: 'ProRes 422',
      type: 'video'
    }
  } else if (['jpg', 'png', 'tiff', 'cr2', 'arw'].includes(ext)) {
    return {
      resolution: '6000x4000',
      format: 'Canon R5',
      type: 'image'
    }
  }
  
  return { type: 'document' }
})

const displayTags = computed((): FileTag[] => {
  const tags: FileTag[] = []
  
  if (props.context) {
    // Add context-specific tags
    props.context.tags.forEach(tag => {
      tags.push({
        name: tag,
        type: props.context!.type as any,
        icon: getTagIcon(tag, props.context!.type)
      })
    })
  }
  
  if (props.profile) {
    // Add status tags based on filename patterns
    const filename = props.file.name.toLowerCase()
    
    if (filename.includes('final')) {
      tags.push({ name: 'Final Mix', type: 'status', icon: '✅' })
    }
    if (filename.includes('approved')) {
      tags.push({ name: 'Approved', type: 'status', icon: '👍' })
    }
    if (filename.includes('ready')) {
      tags.push({ name: 'Ready for Use', type: 'status', icon: '🚀' })
    }
    if (filename.includes('edited')) {
      tags.push({ name: 'Edited', type: 'status', icon: '✏️' })
    }
    if (filename.includes('mixed')) {
      tags.push({ name: 'Mixed', type: 'status', icon: '🎛️' })
    }
    
    // Add category tags
    if (filename.includes('vocal') || filename.includes('lead')) {
      tags.push({ name: 'Lead Vocal', type: 'category', icon: '🎤' })
    }
    if (filename.includes('instruments') || filename.includes('band')) {
      tags.push({ name: 'Band', type: 'category', icon: '🎸' })
    }
    if (filename.includes('wide')) {
      tags.push({ name: 'Wide Shot', type: 'category', icon: '📹' })
    }
    if (filename.includes('sanctuary')) {
      tags.push({ name: 'Sanctuary', type: 'category', icon: '⛪' })
    }
  }
  
  // Remove duplicates and limit to 4 tags
  const uniqueTags = tags.filter((tag, index, self) => 
    index === self.findIndex(t => t.name === tag.name)
  )
  
  return uniqueTags.slice(0, 4)
})

const hasRelationships = computed(() => {
  return props.profile?.relationships && (
    props.profile.relationships.siblings.length > 0 ||
    props.profile.relationships.variants.length > 0 ||
    props.profile.relationships.dependencies.length > 0
  )
})

const hasEditableContent = computed(() => {
  const editableTypes = ['wav', 'mp3', 'mp4', 'mov', 'jpg', 'png', 'tiff']
  return editableTypes.includes(fileExtension.value)
})

const statusIndicators = computed((): StatusIndicator[] => {
  const indicators: StatusIndicator[] = []
  
  // Check for various status conditions
  if (props.file.name.toLowerCase().includes('social') && props.file.name.toLowerCase().includes('ready')) {
    indicators.push({
      type: 'social-ready',
      icon: '📱',
      label: 'Social Media Ready',
      color: 'text-green-600',
      description: 'Optimized for social media platforms'
    })
  }
  
  if (props.context?.type === 'project' && props.context.name.toLowerCase().includes('easter')) {
    indicators.push({
      type: 'seasonal',
      icon: '🐰',
      label: 'Easter Content',
      color: 'text-purple-600',
      description: 'Seasonal Easter content'
    })
  }
  
  if (fileMetadata.value.type === 'audio' && displayTags.value.some(tag => tag.name === 'Final Mix')) {
    indicators.push({
      type: 'audio-final',
      icon: '🎵',
      label: 'Audio',
      color: 'text-blue-600',
      description: 'Final audio mix'
    })
  }
  
  if (fileMetadata.value.type === 'image' && displayTags.value.some(tag => tag.name === 'Edited')) {
    indicators.push({
      type: 'image-processed',
      icon: '🖼️',
      label: 'Photography',
      color: 'text-orange-600',
      description: 'Processed photography'
    })
  }
  
  return indicators
})

// Methods
function getFileIcon(): string {
  const ext = fileExtension.value
  const icons = {
    // Audio
    wav: '🎵', mp3: '🎵', aif: '🎵', flac: '🎵',
    // Video
    mp4: '🎬', mov: '🎬', avi: '🎬', r3d: '📹', braw: '📹',
    // Images
    jpg: '🖼️', png: '🖼️', tiff: '🖼️', cr2: '📷', arw: '📷',
    // Documents
    pdf: '📄', txt: '📄', md: '📄', doc: '📄', docx: '📄'
  }
  
  return icons[ext] || '📄'
}

function getContextColor(): string {
  if (!props.context) return '#6b7280'
  
  const colors = {
    project: '#3b82f6',
    status: '#10b981',
    category: '#f59e0b',
    format: '#8b5cf6',
    temporal: '#ef4444',
    semantic: '#06b6d4',
    technical: '#6b7280'
  }
  
  return colors[props.context.type] || '#6b7280'
}

function getTagStyle(type: string): string {
  const styles = {
    status: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    category: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    format: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    technical: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    semantic: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300'
  }
  
  return styles[type] || styles.technical
}

function getTagIcon(tagName: string, contextType: string): string {
  const tagIcons = {
    // Status icons
    'final': '✅', 'approved': '👍', 'ready': '🚀', 'edited': '✏️', 'mixed': '🎛️',
    // Category icons
    'vocal': '🎤', 'lead': '🎤', 'instruments': '🎸', 'band': '🎸',
    'wide': '📹', 'sanctuary': '⛪', 'people': '👥',
    // Format icons
    'stereo': '🔊', 'mono': '🔈', '4k': '📺', 'hd': '📺'
  }
  
  const key = tagName.toLowerCase().replace(/\s+/g, '')
  return tagIcons[key] || ''
}

function getActionButtonStyle(variant: 'primary' | 'secondary'): string {
  if (variant === 'primary') {
    return 'bg-primary/10 text-primary hover:bg-primary/20'
  } else {
    return 'bg-muted text-muted-foreground hover:bg-muted/80'
  }
}

function getViewAction(): string {
  const type = fileMetadata.value.type
  const actions = {
    audio: 'Play',
    video: 'Preview',
    image: 'View',
    document: 'Open'
  }
  
  return actions[type] || 'View'
}

function getEditAction(): string {
  const type = fileMetadata.value.type
  const actions = {
    audio: 'Edit Audio',
    video: 'Edit Video',
    image: 'Edit Image',
    document: 'Edit'
  }
  
  return actions[type] || 'Edit'
}

function handleAction(action: string) {
  switch (action) {
    case 'view':
      emit('file-selected', props.file)
      break
    case 'edit':
      // Implement edit action
      console.log('Edit file:', props.file.name)
      break
    case 'more':
      // Show context menu or more actions
      console.log('More actions for:', props.file.name)
      break
  }
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
.file-context-card {
  @apply transition-all duration-200;
}

.file-context-card:hover {
  @apply shadow-lg border-primary/20;
  transform: translateY(-1px);
}
</style>