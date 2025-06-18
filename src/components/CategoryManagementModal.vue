<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
      <!-- Header -->
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Manage Categories</h2>
          <button
            @click="$emit('close')"
            class="p-2 hover:bg-accent rounded-full"
          >
            ✕
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="p-6 overflow-auto max-h-[calc(80vh-140px)]">
        <!-- New Category Form -->
        <div class="border rounded-lg p-4 mb-6">
          <h3 class="font-semibold mb-4">Create New Category</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium">Name</label>
              <input
                v-model="newCategory.name"
                class="w-full mt-1 px-3 py-2 border border-input rounded-md"
                placeholder="e.g., Capture Roll"
              />
            </div>
            
            <div>
              <label class="text-sm font-medium">Icon</label>
              <div class="flex mt-1">
                <input
                  v-model="newCategory.icon"
                  class="flex-1 px-3 py-2 border border-input rounded-l-md"
                  placeholder="📼"
                />
                <button
                  @click="showIconPicker = !showIconPicker"
                  class="px-3 py-2 border border-l-0 border-input rounded-r-md hover:bg-accent"
                >
                  {{ newCategory.icon || '😀' }}
                </button>
              </div>
              
              <!-- Icon Picker -->
              <div v-if="showIconPicker" class="mt-2 p-3 border rounded-md bg-muted/20">
                <div class="grid grid-cols-8 gap-2">
                  <button
                    v-for="icon in commonIcons"
                    :key="icon"
                    @click="selectIcon(icon)"
                    class="p-2 hover:bg-accent rounded text-lg"
                  >
                    {{ icon }}
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <label class="text-sm font-medium">Color</label>
              <div class="flex mt-1 gap-2">
                <input
                  v-model="newCategory.color"
                  type="color"
                  class="w-12 h-10 border border-input rounded-md"
                />
                <select
                  v-model="newCategory.color"
                  class="flex-1 px-3 py-2 border border-input rounded-md"
                >
                  <option v-for="color in predefinedColors" :key="color.value" :value="color.value">
                    {{ color.name }}
                  </option>
                </select>
              </div>
            </div>
            
            <div>
              <label class="text-sm font-medium">Parent Category</label>
              <select
                v-model="newCategory.parentId"
                class="w-full mt-1 px-3 py-2 border border-input rounded-md"
              >
                <option value="">None (Root Category)</option>
                <option
                  v-for="category in categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.icon }} {{ category.name }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="mt-4">
            <label class="text-sm font-medium">Description</label>
            <textarea
              v-model="newCategory.description"
              class="w-full mt-1 px-3 py-2 border border-input rounded-md h-20 resize-none"
              placeholder="Describe what this category is for..."
            ></textarea>
          </div>
          
          <div class="mt-4 flex justify-end">
            <button
              @click="createCategory"
              :disabled="!canCreateCategory"
              class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              Create Category
            </button>
          </div>
        </div>
        
        <!-- Existing Categories -->
        <div>
          <h3 class="font-semibold mb-4">Existing Categories</h3>
          
          <div class="space-y-2">
            <div
              v-for="category in categories"
              :key="category.id"
              class="border rounded-lg p-4"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span
                    class="w-4 h-4 rounded-full"
                    :style="{ backgroundColor: category.color }"
                  ></span>
                  <span class="text-lg">{{ category.icon }}</span>
                  <div>
                    <div class="font-medium">{{ category.name }}</div>
                    <div class="text-sm text-muted-foreground">{{ category.description }}</div>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <span class="text-sm text-muted-foreground">
                    {{ getCategoryTagCount(category.id) }} tags
                  </span>
                  <button
                    @click="editCategory(category)"
                    class="p-2 hover:bg-accent rounded"
                  >
                    ✏️
                  </button>
                  <button
                    @click="deleteCategory(category)"
                    class="p-2 hover:bg-destructive/20 rounded text-destructive"
                    :disabled="getCategoryTagCount(category.id) > 0"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  categories: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'category-created': [category: any]
  'category-updated': [category: any]
  'category-deleted': [categoryId: string]
  'close': []
}>()

// State
const newCategory = ref({
  name: '',
  icon: '',
  color: '#8B5CF6',
  description: '',
  parentId: ''
})

const showIconPicker = ref(false)

// Common icons
const commonIcons = [
  '📼', '📹', '🎬', '🎨', '📐', '🎯', '📅', '📋', '📍', '🎭',
  '🎵', '🖼️', '📄', '🔧', '⚡', '🌟', '🎪', '🎸', '🎤', '🎧',
  '📺', '📱', '💻', '🖥️', '📷', '📸', '🔍', '🔬', '🧪', '⚗️'
]

// Predefined colors
const predefinedColors = [
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Gray', value: '#6B7280' }
]

// Computed
const canCreateCategory = computed(() => {
  return newCategory.value.name.trim() && 
         newCategory.value.icon && 
         newCategory.value.color
})

// Methods
function selectIcon(icon: string) {
  newCategory.value.icon = icon
  showIconPicker.value = false
}

function createCategory() {
  if (!canCreateCategory.value) return
  
  emit('category-created', {
    ...newCategory.value,
    name: newCategory.value.name.trim(),
    parentId: newCategory.value.parentId || undefined
  })
  
  // Reset form
  newCategory.value = {
    name: '',
    icon: '',
    color: '#8B5CF6',
    description: '',
    parentId: ''
  }
}

function editCategory(category: any) {
  // Implementation for editing categories
  console.log('Edit category:', category)
}

function deleteCategory(category: any) {
  if (getCategoryTagCount(category.id) > 0) {
    alert('Cannot delete category with existing tags')
    return
  }
  
  if (confirm(`Delete category "${category.name}"?`)) {
    emit('category-deleted', category.id)
  }
}

function getCategoryTagCount(categoryId: string): number {
  // This would be passed from parent or computed from store
  return 0
}
</script>

<style scoped>
/* Add any specific styles here */
</style>