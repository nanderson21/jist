<template>
  <div class="tag-browser h-full flex flex-col bg-background border-r">
    <!-- Header -->
    <div class="p-4 border-b">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">Tag Browser</h2>
        <button
          @click="showManageModal = true"
          class="p-1 hover:bg-accent rounded"
          title="Manage Categories"
        >
          <span class="text-sm">⚙️</span>
        </button>
      </div>
      
      <!-- Search -->
      <div class="relative">
        <input
          v-model="searchQuery"
          class="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md"
          placeholder="Search tags..."
        />
        <span class="absolute left-2.5 top-2.5 text-muted-foreground">🔍</span>
      </div>
    </div>
    
    <!-- Filter Tabs -->
    <div class="px-4 py-2 border-b">
      <div class="flex bg-muted rounded-md p-1">
        <button
          @click="activeFilter = 'all'"
          class="flex-1 px-3 py-1 text-xs rounded transition-colors"
          :class="activeFilter === 'all' ? 'bg-background shadow-sm' : 'hover:bg-background/50'"
        >
          All Tags
        </button>
        <button
          @click="activeFilter = 'used'"
          class="flex-1 px-3 py-1 text-xs rounded transition-colors"
          :class="activeFilter === 'used' ? 'bg-background shadow-sm' : 'hover:bg-background/50'"
        >
          Used Only
        </button>
      </div>
    </div>
    
    <!-- Tag Categories -->
    <div class="flex-1 overflow-auto">
      <div class="p-2 space-y-1">
        <!-- Show All Files Option -->
        <div
          class="flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-accent"
          :class="{ 'bg-primary/10': selectedCategory === null }"
          @click="selectCategory(null)"
        >
          <span class="text-lg">📁</span>
          <div class="flex-1">
            <div class="font-medium">All Files</div>
            <div class="text-xs text-muted-foreground">{{ totalFileCount }} files</div>
          </div>
        </div>
        
        <!-- Categories -->
        <div
          v-for="category in filteredCategories"
          :key="category.id"
          class="space-y-1"
        >
          <!-- Category Header -->
          <div
            class="flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-accent"
            :class="{ 'bg-primary/10': selectedCategory?.id === category.id }"
            @click="selectCategory(category)"
          >
            <button
              @click.stop="toggleCategory(category.id)"
              class="w-4 h-4 flex items-center justify-center hover:bg-accent rounded"
            >
              <span
                class="text-xs transition-transform"
                :class="{ 'rotate-90': expandedCategories.has(category.id) }"
              >
                ▶
              </span>
            </button>
            
            <span
              class="w-3 h-3 rounded-full"
              :style="{ backgroundColor: category.color }"
            ></span>
            
            <span class="text-lg">{{ category.icon }}</span>
            
            <div class="flex-1">
              <div class="font-medium">{{ category.name }}</div>
              <div class="text-xs text-muted-foreground">
                {{ getCategoryStats(category).tagCount }} tags • {{ getCategoryStats(category).fileCount }} files
              </div>
            </div>
          </div>
          
          <!-- Category Tags -->
          <div
            v-if="expandedCategories.has(category.id)"
            class="ml-6 space-y-1"
          >
            <div
              v-for="tag in getCategoryTags(category.id)"
              :key="tag.id"
              class="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent"
              :class="{ 'bg-accent': selectedTag?.id === tag.id }"
              @click="selectTag(tag)"
            >
              <span class="text-sm">{{ category.icon }}</span>
              <div class="flex-1">
                <div class="text-sm font-medium">{{ tag.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ getTagFileCount(tag.id) }} files
                </div>
              </div>
              
              <!-- Tag Actions -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  @click.stop="editTag(tag)"
                  class="w-6 h-6 flex items-center justify-center hover:bg-accent rounded"
                  title="Edit tag"
                >
                  ✏️
                </button>
                <button
                  @click.stop="deleteTag(tag)"
                  class="w-6 h-6 flex items-center justify-center hover:bg-destructive/20 rounded"
                  title="Delete tag"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <!-- Add New Tag Button -->
            <button
              @click="addNewTag(category)"
              class="w-full flex items-center gap-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
            >
              <span>➕</span>
              <span>Add tag to {{ category.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Bottom Actions -->
    <div class="p-4 border-t space-y-2">
      <button
        @click="createNewCategory"
        class="w-full px-3 py-2 text-sm border border-input rounded-md hover:bg-accent"
      >
        ➕ Add Category
      </button>
      
      <div class="text-xs text-muted-foreground text-center">
        {{ stats.totalTags }} tags in {{ stats.totalCategories }} categories
      </div>
    </div>
    
    <!-- Category Management Modal -->
    <CategoryManagementModal
      v-if="showManageModal"
      :categories="tagCategories"
      @category-created="handleCategoryCreated"
      @category-updated="handleCategoryUpdated"
      @category-deleted="handleCategoryDeleted"
      @close="showManageModal = false"
    />
    
    <!-- Tag Edit Modal -->
    <TagEditModal
      v-if="editingTag"
      :tag="editingTag"
      :category="getTagCategory(editingTag.categoryId)"
      @tag-updated="handleTagUpdated"
      @close="editingTag = null"
    />
    
    <!-- New Tag Modal -->
    <NewTagModal
      v-if="newTagCategory"
      :category="newTagCategory"
      @tag-created="handleTagCreated"
      @close="newTagCategory = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useContextStore } from '@/stores/contextStore'
import CategoryManagementModal from './CategoryManagementModal.vue'
import TagEditModal from './TagEditModal.vue'
import NewTagModal from './NewTagModal.vue'

interface Props {
  totalFileCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'filter-changed': [filter: { type: 'all' | 'category' | 'tag', id?: string }]
}>()

const {
  tagCategories,
  tags,
  fileTags,
  tagsByCategory,
  createCategory,
  createTag,
  updateTag,
  deleteTag: removeTag,
  getFilesByTag,
  getFilesByCategory
} = useContextStore()

// State
const searchQuery = ref('')
const activeFilter = ref<'all' | 'used'>('all')
const selectedCategory = ref<any>(null)
const selectedTag = ref<any>(null)
const expandedCategories = ref<Set<string>>(new Set())
const showManageModal = ref(false)
const editingTag = ref<any>(null)
const newTagCategory = ref<any>(null)

// Computed
const filteredCategories = computed(() => {
  let categories = tagCategories.value
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    categories = categories.filter(cat => 
      cat.name.toLowerCase().includes(query) ||
      getCategoryTags(cat.id).some(tag => 
        tag.name.toLowerCase().includes(query) ||
        tag.value.toLowerCase().includes(query)
      )
    )
  }
  
  // Filter by usage
  if (activeFilter.value === 'used') {
    categories = categories.filter(cat => 
      getCategoryTags(cat.id).some(tag => getTagFileCount(tag.id) > 0)
    )
  }
  
  return categories
})

const stats = computed(() => ({
  totalCategories: tagCategories.value.length,
  totalTags: tags.value.length,
  usedTags: tags.value.filter(tag => getTagFileCount(tag.id) > 0).length
}))

// Methods
function toggleCategory(categoryId: string) {
  if (expandedCategories.value.has(categoryId)) {
    expandedCategories.value.delete(categoryId)
  } else {
    expandedCategories.value.add(categoryId)
  }
}

function selectCategory(category: any) {
  selectedCategory.value = category
  selectedTag.value = null
  
  if (category) {
    emit('filter-changed', { type: 'category', id: category.id })
    expandedCategories.value.add(category.id)
  } else {
    emit('filter-changed', { type: 'all' })
  }
}

function selectTag(tag: any) {
  selectedTag.value = tag
  selectedCategory.value = null
  emit('filter-changed', { type: 'tag', id: tag.id })
}

function getCategoryTags(categoryId: string) {
  return tagsByCategory.value.get(categoryId) || []
}

function getCategoryStats(category: any) {
  const categoryTags = getCategoryTags(category.id)
  const fileCount = categoryTags.reduce((sum, tag) => sum + getTagFileCount(tag.id), 0)
  
  return {
    tagCount: categoryTags.length,
    fileCount
  }
}

function getTagFileCount(tagId: string): number {
  return getFilesByTag(tagId).length
}

function getTagCategory(categoryId: string) {
  return tagCategories.value.find(c => c.id === categoryId)
}

function editTag(tag: any) {
  editingTag.value = tag
}

async function deleteTag(tag: any) {
  if (confirm(`Delete tag "${tag.name}"? This will remove it from all files.`)) {
    await removeTag(tag.id)
  }
}

function addNewTag(category: any) {
  newTagCategory.value = category
}

function createNewCategory() {
  showManageModal.value = true
}

// Event handlers
async function handleCategoryCreated(category: any) {
  await createCategory(category)
}

async function handleCategoryUpdated(category: any) {
  // Update category logic would go here
}

async function handleCategoryDeleted(categoryId: string) {
  // Delete category logic would go here
}

async function handleTagCreated(tag: any) {
  await createTag(tag)
  newTagCategory.value = null
}

async function handleTagUpdated(tag: any) {
  await updateTag(tag.id, tag)
  editingTag.value = null
}

// Expand first few categories by default
tagCategories.value.slice(0, 3).forEach(cat => {
  expandedCategories.value.add(cat.id)
})
</script>

<style scoped>
.tag-browser {
  min-height: 0;
}

.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}
</style>