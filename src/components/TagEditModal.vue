<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-background rounded-lg shadow-xl w-full max-w-md">
      <!-- Header -->
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Edit Tag</h2>
          <button
            @click="$emit('close')"
            class="p-2 hover:bg-accent rounded-full"
          >
            ✕
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="p-6 space-y-4">
        <!-- Category Info -->
        <div class="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
          <span
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: category.color }"
          ></span>
          <span class="text-lg">{{ category.icon }}</span>
          <span class="font-medium">{{ category.name }}</span>
        </div>
        
        <!-- Tag Name -->
        <div>
          <label class="text-sm font-medium">Tag Name</label>
          <input
            v-model="editedTag.name"
            class="w-full mt-1 px-3 py-2 border border-input rounded-md"
            placeholder="e.g., A001"
          />
        </div>
        
        <!-- Tag Value -->
        <div>
          <label class="text-sm font-medium">Tag Value</label>
          <input
            v-model="editedTag.value"
            class="w-full mt-1 px-3 py-2 border border-input rounded-md"
            placeholder="e.g., A001"
          />
          <div class="text-xs text-muted-foreground mt-1">
            The value used for matching and filtering
          </div>
        </div>
        
        <!-- Tag Color -->
        <div>
          <label class="text-sm font-medium">Custom Color (Optional)</label>
          <div class="flex mt-1 gap-2">
            <input
              v-model="editedTag.color"
              type="color"
              class="w-12 h-10 border border-input rounded-md"
            />
            <button
              @click="editedTag.color = ''"
              class="px-3 py-2 text-sm border border-input rounded-md hover:bg-accent"
            >
              Use Category Color
            </button>
          </div>
        </div>
        
        <!-- Metadata -->
        <div>
          <label class="text-sm font-medium">Metadata (JSON)</label>
          <textarea
            v-model="metadataJson"
            class="w-full mt-1 px-3 py-2 border border-input rounded-md h-20 resize-none font-mono text-sm"
            placeholder='{"description": "Additional metadata..."}'
          ></textarea>
          <div v-if="metadataError" class="text-xs text-destructive mt-1">
            {{ metadataError }}
          </div>
        </div>
        
        <!-- File Usage Info -->
        <div class="p-3 bg-muted/20 rounded-lg">
          <div class="text-sm font-medium mb-2">Usage Statistics</div>
          <div class="text-sm text-muted-foreground">
            This tag is used by {{ fileCount }} files
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-6 border-t flex justify-between">
        <button
          @click="$emit('close')"
          class="px-4 py-2 border border-input rounded-md hover:bg-accent"
        >
          Cancel
        </button>
        
        <div class="flex gap-3">
          <button
            @click="deleteTag"
            class="px-4 py-2 text-destructive border border-destructive rounded-md hover:bg-destructive/10"
          >
            Delete Tag
          </button>
          <button
            @click="saveTag"
            :disabled="!canSave"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  tag: any
  category: any
  fileCount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'tag-updated': [tag: any]
  'tag-deleted': [tagId: string]
  'close': []
}>()

// State
const editedTag = ref({ ...props.tag })
const metadataJson = ref('')
const metadataError = ref('')

// Initialize metadata JSON
watch(() => props.tag, (newTag) => {
  editedTag.value = { ...newTag }
  metadataJson.value = newTag.metadata ? JSON.stringify(newTag.metadata, null, 2) : ''
}, { immediate: true })

// Computed
const canSave = computed(() => {
  return editedTag.value.name.trim() && 
         editedTag.value.value.trim() && 
         !metadataError.value
})

// Watch metadata JSON for validation
watch(metadataJson, (newValue) => {
  metadataError.value = ''
  
  if (newValue.trim()) {
    try {
      JSON.parse(newValue)
    } catch (error) {
      metadataError.value = 'Invalid JSON format'
    }
  }
})

// Methods
function saveTag() {
  if (!canSave.value) return
  
  const updatedTag = {
    ...editedTag.value,
    name: editedTag.value.name.trim(),
    value: editedTag.value.value.trim(),
    metadata: metadataJson.value.trim() ? JSON.parse(metadataJson.value) : undefined
  }
  
  emit('tag-updated', updatedTag)
}

function deleteTag() {
  const fileCount = props.fileCount || 0
  const message = fileCount > 0 
    ? `Delete tag "${props.tag.name}"? This will remove it from ${fileCount} files.`
    : `Delete tag "${props.tag.name}"?`
  
  if (confirm(message)) {
    emit('tag-deleted', props.tag.id)
  }
}
</script>

<style scoped>
/* Add any specific styles here */
</style>