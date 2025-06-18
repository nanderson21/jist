<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-background border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-lg font-semibold">
          {{ group ? 'Edit Group' : 'Create Group' }}
        </h2>
        <button
          @click="$emit('cancel')"
          class="p-2 hover:bg-accent rounded text-muted-foreground"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="flex h-[600px]">
        <!-- Left Panel: Group Info -->
        <div class="w-1/3 p-4 border-r bg-muted/30">
          <div class="space-y-4">
            <!-- Group Name -->
            <div>
              <label class="block text-sm font-medium mb-2">Group Name</label>
              <input
                v-model="localGroup.baseName"
                type="text"
                class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter group name"
              />
            </div>

            <!-- Primary Representation -->
            <div>
              <label class="block text-sm font-medium mb-2">Primary Representation</label>
              <select
                v-model="primaryRepId"
                class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option 
                  v-for="rep in localGroup.representations" 
                  :key="rep.asset.id"
                  :value="rep.asset.id"
                >
                  {{ rep.asset.name }} ({{ rep.type }})
                </option>
              </select>
            </div>

            <!-- Metadata -->
            <div>
              <label class="block text-sm font-medium mb-2">Metadata</label>
              <div class="space-y-2">
                <div>
                  <input
                    v-model="localGroup.metadata.project"
                    type="text"
                    placeholder="Project"
                    class="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
                <div>
                  <input
                    v-model="localGroup.metadata.scene"
                    type="text"
                    placeholder="Scene"
                    class="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
                <div>
                  <input
                    v-model="localGroup.metadata.take"
                    type="text"
                    placeholder="Take"
                    class="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
              </div>
            </div>

            <!-- Tags -->
            <div>
              <label class="block text-sm font-medium mb-2">Tags</label>
              <div class="space-y-2">
                <!-- Add new tag -->
                <div class="flex gap-2">
                  <input
                    v-model="newTag"
                    @keyup.enter="addTag"
                    type="text"
                    placeholder="Add tag..."
                    class="flex-1 px-2 py-1 text-sm border rounded"
                  />
                  <button
                    @click="addTag"
                    class="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>
                
                <!-- Existing tags -->
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="tag in localGroup.tags"
                    :key="tag"
                    class="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                  >
                    {{ formatTag(tag) }}
                    <button
                      @click="removeTag(tag)"
                      class="hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Asset Management -->
        <div class="flex-1 flex flex-col">
          <!-- Assets in Group -->
          <div class="flex-1 p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium">Assets in Group ({{ localGroup.representations.length }})</h3>
              <button
                @click="showAvailableAssets = !showAvailableAssets"
                class="px-3 py-1 text-sm border rounded hover:bg-accent"
              >
                {{ showAvailableAssets ? 'Hide' : 'Add Assets' }}
              </button>
            </div>

            <!-- Current representations -->
            <div class="space-y-2 mb-4">
              <div
                v-for="(rep, index) in localGroup.representations"
                :key="rep.asset.id"
                class="flex items-center justify-between p-3 border rounded hover:bg-accent/30"
                :class="{ 'ring-2 ring-primary': rep.asset.id === primaryRepId }"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium truncate">{{ rep.asset.name }}</span>
                    <span v-if="rep.asset.id === primaryRepId" class="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                      Primary
                    </span>
                  </div>
                  <div class="text-sm text-muted-foreground">
                    {{ rep.type }} • {{ rep.resolution || 'Unknown resolution' }} • {{ rep.codec || 'Unknown codec' }}
                  </div>
                </div>
                
                <!-- Representation type selector -->
                <div class="flex items-center gap-2">
                  <select
                    v-model="rep.type"
                    class="px-2 py-1 text-xs border rounded"
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="proxy">Proxy</option>
                    <option value="preview">Preview</option>
                  </select>
                  
                  <button
                    @click="removeAssetFromGroup(index)"
                    :disabled="localGroup.representations.length <= 1"
                    class="p-1 hover:bg-destructive/20 rounded text-destructive disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            <!-- Available assets to add -->
            <div v-if="showAvailableAssets" class="border-t pt-4">
              <h4 class="font-medium mb-2">Available Assets</h4>
              <div class="max-h-60 overflow-y-auto space-y-1">
                <div
                  v-for="asset in filteredAvailableAssets"
                  :key="asset.id"
                  class="flex items-center justify-between p-2 border rounded hover:bg-accent/30 cursor-pointer"
                  @click="addAssetToGroup(asset)"
                >
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate">{{ asset.name }}</div>
                    <div class="text-xs text-muted-foreground">
                      {{ asset.format }} • {{ asset.metadata.resolution || 'Unknown' }}
                    </div>
                  </div>
                  <button class="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-4 border-t bg-muted/30">
        <div class="text-sm text-muted-foreground">
          {{ localGroup.representations.length }} asset{{ localGroup.representations.length !== 1 ? 's' : '' }} in group
        </div>
        <div class="flex gap-2">
          <button
            @click="$emit('cancel')"
            class="px-4 py-2 text-sm border rounded hover:bg-accent"
          >
            Cancel
          </button>
          <button
            @click="saveGroup"
            :disabled="!isValidGroup"
            class="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {{ group ? 'Update Group' : 'Create Group' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { MediaGroup, MediaRepresentation } from '@/composables/useMediaRepresentations'
import type { MediaAsset } from '@/composables/useMediaAssets'

interface Props {
  group?: MediaGroup | null
  availableAssets: MediaAsset[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'save': [group: MediaGroup]
  'cancel': []
}>()

// Local state
const showAvailableAssets = ref(false)
const newTag = ref('')
const primaryRepId = ref<string>('')

// Create local copy of group for editing
const localGroup = ref<MediaGroup>({
  id: '',
  baseName: '',
  representations: [],
  primaryRepresentation: {} as MediaRepresentation,
  tags: [],
  metadata: {}
})

// Computed properties
const isValidGroup = computed(() => {
  return localGroup.value.baseName.trim().length > 0 && 
         localGroup.value.representations.length > 0
})

const filteredAvailableAssets = computed(() => {
  const existingAssetIds = new Set(localGroup.value.representations.map(r => r.asset.id))
  return props.availableAssets.filter(asset => !existingAssetIds.has(asset.id))
})

// Initialize local group
function initializeLocalGroup() {
  if (props.group) {
    // Edit mode - copy existing group
    localGroup.value = {
      ...props.group,
      representations: [...props.group.representations],
      tags: [...props.group.tags],
      metadata: { ...props.group.metadata }
    }
    primaryRepId.value = props.group.primaryRepresentation.asset.id
  } else {
    // Create mode - initialize empty group
    localGroup.value = {
      id: `group_${Date.now()}`,
      baseName: '',
      representations: [],
      primaryRepresentation: {} as MediaRepresentation,
      tags: [],
      metadata: {}
    }
    primaryRepId.value = ''
  }
}

// Update primary representation when selection changes
watch(primaryRepId, (newId) => {
  const primaryRep = localGroup.value.representations.find(r => r.asset.id === newId)
  if (primaryRep) {
    localGroup.value.primaryRepresentation = primaryRep
  }
})

// Tag management
function addTag() {
  if (newTag.value.trim() && !localGroup.value.tags.includes(newTag.value.trim())) {
    localGroup.value.tags.push(newTag.value.trim())
    newTag.value = ''
  }
}

function removeTag(tag: string) {
  const index = localGroup.value.tags.indexOf(tag)
  if (index > -1) {
    localGroup.value.tags.splice(index, 1)
  }
}

function formatTag(tag: string): string {
  const [category, value] = tag.split(':')
  return value || tag
}

// Asset management
function addAssetToGroup(asset: MediaAsset) {
  // Determine representation type based on asset properties
  const repType = detectRepresentationType(asset)
  
  const newRep: MediaRepresentation = {
    type: repType,
    resolution: asset.metadata.resolution,
    codec: asset.metadata.codec,
    bitrate: asset.metadata.bitRate,
    asset
  }
  
  localGroup.value.representations.push(newRep)
  
  // Set as primary if it's the first asset or if it's an 'online' type
  if (localGroup.value.representations.length === 1 || (repType === 'online' && !primaryRepId.value)) {
    primaryRepId.value = asset.id
    localGroup.value.primaryRepresentation = newRep
  }
  
  // Auto-generate group name if empty
  if (!localGroup.value.baseName.trim()) {
    localGroup.value.baseName = extractBaseName(asset.name)
  }
}

function removeAssetFromGroup(index: number) {
  const removedRep = localGroup.value.representations[index]
  localGroup.value.representations.splice(index, 1)
  
  // Update primary if we removed the primary representation
  if (removedRep.asset.id === primaryRepId.value && localGroup.value.representations.length > 0) {
    primaryRepId.value = localGroup.value.representations[0].asset.id
    localGroup.value.primaryRepresentation = localGroup.value.representations[0]
  }
}

// Helper functions
function detectRepresentationType(asset: MediaAsset): 'online' | 'offline' | 'proxy' | 'preview' {
  const path = asset.primaryFile.path.toLowerCase()
  const name = asset.primaryFile.name.toLowerCase()
  
  if (path.includes('/proxy/') || path.includes('/proxies/') || 
      name.includes('_proxy') || name.includes('_prx')) {
    return 'proxy'
  }
  
  if (path.includes('/offline/') || path.includes('/edit/') || 
      name.includes('_offline') || name.includes('_edit')) {
    return 'offline'
  }
  
  if (path.includes('/preview/') || name.includes('_preview')) {
    return 'preview'
  }
  
  return 'online'
}

function extractBaseName(name: string): string {
  let baseName = name
  baseName = baseName.replace(/_(proxy|prx|offline|edit|preview|online|master)$/i, '')
  baseName = baseName.replace(/_(low|med|high|full)$/i, '')
  baseName = baseName.replace(/_(h264|prores|dnxhd|avid)$/i, '')
  baseName = baseName.replace(/_(1080p|720p|4k|uhd|2k)$/i, '')
  return baseName
}

function saveGroup() {
  if (!isValidGroup.value) return
  
  // Ensure we have a valid primary representation
  if (primaryRepId.value && localGroup.value.representations.length > 0) {
    const primaryRep = localGroup.value.representations.find(r => r.asset.id === primaryRepId.value)
    if (primaryRep) {
      localGroup.value.primaryRepresentation = primaryRep
    }
  }
  
  emit('save', { ...localGroup.value })
}

// Initialize on mount and when prop changes
onMounted(initializeLocalGroup)
watch(() => props.group, initializeLocalGroup, { immediate: true })
</script>