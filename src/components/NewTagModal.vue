<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-background rounded-lg shadow-xl w-full max-w-md">
      <!-- Header -->
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Create New Tag</h2>
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
            v-model="newTag.name"
            ref="nameInput"
            class="w-full mt-1 px-3 py-2 border border-input rounded-md"
            placeholder="e.g., A001"
            @keyup.enter="focusValue"
          />
          <div class="text-xs text-muted-foreground mt-1">
            Display name for this tag
          </div>
        </div>
        
        <!-- Tag Value -->
        <div>
          <label class="text-sm font-medium">Tag Value</label>
          <input
            v-model="newTag.value"
            ref="valueInput"
            class="w-full mt-1 px-3 py-2 border border-input rounded-md"
            placeholder="e.g., A001"
            @keyup.enter="canCreate && createTag()"
          />
          <div class="text-xs text-muted-foreground mt-1">
            The value used for matching and filtering
          </div>
        </div>
        
        <!-- Auto-suggestion based on category -->
        <div v-if="suggestions.length > 0">
          <label class="text-sm font-medium">Suggestions</label>
          <div class="mt-1 flex flex-wrap gap-2">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              @click="applySuggestion(suggestion)"
              class="px-2 py-1 text-xs border border-input rounded hover:bg-accent"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
        
        <!-- Tag Color -->
        <div>
          <label class="text-sm font-medium">Custom Color (Optional)</label>
          <div class="flex mt-1 gap-2">
            <input
              v-model="newTag.color"
              type="color"
              class="w-12 h-10 border border-input rounded-md"
            />
            <button
              @click="newTag.color = ''"
              class="px-3 py-2 text-sm border border-input rounded-md hover:bg-accent"
            >
              Use Category Color
            </button>
          </div>
          <div class="text-xs text-muted-foreground mt-1">
            Leave empty to inherit category color
          </div>
        </div>
        
        <!-- Metadata -->
        <div>
          <label class="text-sm font-medium">Description (Optional)</label>
          <textarea
            v-model="newTag.description"
            class="w-full mt-1 px-3 py-2 border border-input rounded-md h-16 resize-none"
            placeholder="Additional description for this tag..."
          ></textarea>
        </div>
        
        <!-- Pattern Detection Helper -->
        <div v-if="detectedPattern" class="p-3 bg-primary/10 rounded-lg">
          <div class="text-sm font-medium text-primary mb-1">Pattern Detected</div>
          <div class="text-xs text-muted-foreground">
            {{ detectedPattern.explanation }}
          </div>
          <button
            @click="applyPattern"
            class="mt-2 px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Use Pattern
          </button>
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
        
        <button
          @click="createTag"
          :disabled="!canCreate"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          Create Tag
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'

interface Props {
  category: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'tag-created': [tag: any]
  'close': []
}>()

// Refs
const nameInput = ref<HTMLInputElement>()
const valueInput = ref<HTMLInputElement>()

// State
const newTag = ref({
  name: '',
  value: '',
  color: '',
  description: ''
})

// Computed
const canCreate = computed(() => {
  return newTag.value.name.trim() && newTag.value.value.trim()
})

// Generate suggestions based on category
const suggestions = computed(() => {
  const categoryName = props.category.name.toLowerCase()
  const suggestions: string[] = []
  
  if (categoryName.includes('capture') || categoryName.includes('roll')) {
    // Generate capture roll suggestions: A001, B001, C001
    ['A', 'B', 'C', 'D', 'E'].forEach(letter => {
      suggestions.push(`${letter}001`)
    })
  } else if (categoryName.includes('clip') || categoryName.includes('sequence')) {
    // Generate clip sequence suggestions: C001, C002, C003
    for (let i = 1; i <= 10; i++) {
      suggestions.push(`C${i.toString().padStart(3, '0')}`)
    }
  } else if (categoryName.includes('camera') || categoryName.includes('unit')) {
    // Generate camera unit suggestions
    suggestions.push('Camera A', 'Camera B', 'Camera 1', 'Camera 2')
  } else if (categoryName.includes('resolution')) {
    suggestions.push('4K', '8K', 'HD', 'UHD', '2K')
  } else if (categoryName.includes('format')) {
    suggestions.push('R3D', 'ProRes', 'H.264', 'DNxHD')
  } else if (categoryName.includes('frame')) {
    suggestions.push('24fps', '25fps', '30fps', '60fps', '120fps')
  }
  
  return suggestions.slice(0, 6) // Limit to 6 suggestions
})

// Pattern detection for automatic value inference
const detectedPattern = computed(() => {
  const name = newTag.value.name.trim()
  if (!name) return null
  
  // Detect capture roll pattern (letter + numbers)
  const captureRollMatch = name.match(/([A-Z])(\d{3})/i)
  if (captureRollMatch) {
    return {
      type: 'capture-roll',
      explanation: `Detected capture roll pattern: ${captureRollMatch[0].toUpperCase()}`,
      value: captureRollMatch[0].toUpperCase()
    }
  }
  
  // Detect clip sequence pattern
  const clipMatch = name.match(/([C])(\d{3})/i)
  if (clipMatch) {
    return {
      type: 'clip-sequence',
      explanation: `Detected clip sequence pattern: ${clipMatch[0].toUpperCase()}`,
      value: clipMatch[0].toUpperCase()
    }
  }
  
  // Detect date pattern
  const dateMatch = name.match(/(\d{4})[-_](\d{2})[-_](\d{2})/)
  if (dateMatch) {
    return {
      type: 'date',
      explanation: `Detected date pattern: ${dateMatch[0]}`,
      value: dateMatch[0]
    }
  }
  
  // Detect resolution pattern
  const resolutionMatch = name.match(/(4K|8K|HD|UHD|2K|\d+[kK])/i)
  if (resolutionMatch) {
    return {
      type: 'resolution',
      explanation: `Detected resolution: ${resolutionMatch[0]}`,
      value: resolutionMatch[0].toUpperCase()
    }
  }
  
  return null
})

// Methods
function applySuggestion(suggestion: string) {
  newTag.value.name = suggestion
  newTag.value.value = suggestion
}

function applyPattern() {
  if (detectedPattern.value) {
    newTag.value.value = detectedPattern.value.value
  }
}

function focusValue() {
  nextTick(() => {
    valueInput.value?.focus()
  })
}

function createTag() {
  if (!canCreate.value) return
  
  const tag = {
    id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    categoryId: props.category.id,
    name: newTag.value.name.trim(),
    value: newTag.value.value.trim(),
    color: newTag.value.color || undefined,
    description: newTag.value.description.trim() || undefined,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  emit('tag-created', tag)
}

// Auto-focus name input when modal opens
onMounted(() => {
  nextTick(() => {
    nameInput.value?.focus()
  })
})
</script>

<style scoped>
/* Add any specific styles here */
</style>