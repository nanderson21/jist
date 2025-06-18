import { ref, computed } from 'vue'
import type { FileNode } from '@/types'

// IndexedDB setup
const DB_NAME = 'JistContextDB'
const DB_VERSION = 1

interface TagCategory {
  id: string
  name: string
  icon: string
  color: string
  description: string
  parentId?: string // For nested categories
  createdAt: Date
  updatedAt: Date
}

interface Tag {
  id: string
  categoryId: string
  name: string
  value: string // Actual value like "A001", "4K", etc.
  color?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

interface ContextMapping {
  id: string
  path: string // Folder path or pattern
  contextType: 'folder' | 'pattern' | 'filename'
  contextValue: string // What this represents
  categoryId: string
  tagId?: string
  confidence: number
  createdAt: Date
  updatedAt: Date
}

interface TagRule {
  id: string
  name: string
  description: string
  pattern: string // Regex pattern
  patternType: 'path' | 'filename' | 'content'
  categoryId: string
  tagTemplate: string // Template for tag creation, e.g., "{capture_roll}"
  priority: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

interface FileTag {
  fileId: string // path + name as unique ID
  tagId: string
  source: 'manual' | 'rule' | 'context'
  ruleId?: string
  confidence: number
  createdAt: Date
}

class ContextStore {
  private db: IDBDatabase | null = null
  
  // Reactive state
  tagCategories = ref<TagCategory[]>([])
  tags = ref<Tag[]>([])
  contextMappings = ref<ContextMapping[]>([])
  tagRules = ref<TagRule[]>([])
  fileTags = ref<Map<string, FileTag[]>>(new Map())
  
  // Computed
  tagsByCategory = computed(() => {
    const map = new Map<string, Tag[]>()
    this.tags.value.forEach(tag => {
      if (!map.has(tag.categoryId)) {
        map.set(tag.categoryId, [])
      }
      map.get(tag.categoryId)!.push(tag)
    })
    return map
  })
  
  categoriesTree = computed(() => {
    const rootCategories = this.tagCategories.value.filter(c => !c.parentId)
    const buildTree = (parent: TagCategory): any => ({
      ...parent,
      children: this.tagCategories.value
        .filter(c => c.parentId === parent.id)
        .map(child => buildTree(child)),
      tags: this.tagsByCategory.value.get(parent.id) || []
    })
    return rootCategories.map(buildTree)
  })
  
  async initialize() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        this.loadAllData()
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Tag Categories store
        if (!db.objectStoreNames.contains('tagCategories')) {
          const store = db.createObjectStore('tagCategories', { keyPath: 'id' })
          store.createIndex('name', 'name', { unique: true })
          store.createIndex('parentId', 'parentId', { unique: false })
        }
        
        // Tags store
        if (!db.objectStoreNames.contains('tags')) {
          const store = db.createObjectStore('tags', { keyPath: 'id' })
          store.createIndex('categoryId', 'categoryId', { unique: false })
          store.createIndex('name', 'name', { unique: false })
          store.createIndex('value', 'value', { unique: false })
        }
        
        // Context Mappings store
        if (!db.objectStoreNames.contains('contextMappings')) {
          const store = db.createObjectStore('contextMappings', { keyPath: 'id' })
          store.createIndex('path', 'path', { unique: false })
          store.createIndex('categoryId', 'categoryId', { unique: false })
        }
        
        // Tag Rules store
        if (!db.objectStoreNames.contains('tagRules')) {
          const store = db.createObjectStore('tagRules', { keyPath: 'id' })
          store.createIndex('active', 'active', { unique: false })
          store.createIndex('priority', 'priority', { unique: false })
        }
        
        // File Tags store
        if (!db.objectStoreNames.contains('fileTags')) {
          const store = db.createObjectStore('fileTags', { keyPath: ['fileId', 'tagId'] })
          store.createIndex('fileId', 'fileId', { unique: false })
          store.createIndex('tagId', 'tagId', { unique: false })
          store.createIndex('source', 'source', { unique: false })
        }
      }
    })
  }
  
  private async loadAllData() {
    if (!this.db) return
    
    // Load all data from IndexedDB
    const transaction = this.db.transaction(
      ['tagCategories', 'tags', 'contextMappings', 'tagRules', 'fileTags'],
      'readonly'
    )
    
    // Load categories
    const categories = await this.getAll(transaction.objectStore('tagCategories'))
    this.tagCategories.value = categories
    
    // Load tags
    const tags = await this.getAll(transaction.objectStore('tags'))
    this.tags.value = tags
    
    // Load context mappings
    const mappings = await this.getAll(transaction.objectStore('contextMappings'))
    this.contextMappings.value = mappings
    
    // Load rules
    const rules = await this.getAll(transaction.objectStore('tagRules'))
    this.tagRules.value = rules
    
    // Load file tags
    const fileTags = await this.getAll(transaction.objectStore('fileTags'))
    const fileTagMap = new Map<string, FileTag[]>()
    fileTags.forEach((tag: FileTag) => {
      if (!fileTagMap.has(tag.fileId)) {
        fileTagMap.set(tag.fileId, [])
      }
      fileTagMap.get(tag.fileId)!.push(tag)
    })
    this.fileTags.value = fileTagMap
  }
  
  private getAll<T>(store: IDBObjectStore): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
  
  // CRUD operations for Tag Categories
  async createCategory(data: Omit<TagCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<TagCategory> {
    const category: TagCategory = {
      ...data,
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const transaction = this.db!.transaction(['tagCategories'], 'readwrite')
    const store = transaction.objectStore('tagCategories')
    await this.promisifyRequest(store.add(category))
    
    this.tagCategories.value.push(category)
    return category
  }
  
  async updateCategory(id: string, updates: Partial<TagCategory>): Promise<void> {
    const category = this.tagCategories.value.find(c => c.id === id)
    if (!category) throw new Error('Category not found')
    
    Object.assign(category, updates, { updatedAt: new Date() })
    
    const transaction = this.db!.transaction(['tagCategories'], 'readwrite')
    const store = transaction.objectStore('tagCategories')
    await this.promisifyRequest(store.put(category))
  }
  
  // CRUD operations for Tags
  async createTag(data: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    const tag: Tag = {
      ...data,
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const transaction = this.db!.transaction(['tags'], 'readwrite')
    const store = transaction.objectStore('tags')
    await this.promisifyRequest(store.add(tag))
    
    this.tags.value.push(tag)
    return tag
  }
  
  async updateTag(id: string, updates: Partial<Tag>): Promise<void> {
    const tag = this.tags.value.find(t => t.id === id)
    if (!tag) throw new Error('Tag not found')
    
    Object.assign(tag, updates, { updatedAt: new Date() })
    
    const transaction = this.db!.transaction(['tags'], 'readwrite')
    const store = transaction.objectStore('tags')
    await this.promisifyRequest(store.put(tag))
  }
  
  async deleteTag(id: string): Promise<void> {
    const transaction = this.db!.transaction(['tags', 'fileTags'], 'readwrite')
    
    // Delete tag
    await this.promisifyRequest(transaction.objectStore('tags').delete(id))
    
    // Delete all file associations
    const fileTagStore = transaction.objectStore('fileTags')
    const index = fileTagStore.index('tagId')
    const range = IDBKeyRange.only(id)
    const cursor = index.openCursor(range)
    
    await new Promise<void>((resolve, reject) => {
      cursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          fileTagStore.delete(cursor.primaryKey)
          cursor.continue()
        } else {
          resolve()
        }
      }
      cursor.onerror = () => reject(cursor.error)
    })
    
    // Update state
    this.tags.value = this.tags.value.filter(t => t.id !== id)
    this.fileTags.value.forEach((tags, fileId) => {
      this.fileTags.value.set(fileId, tags.filter(t => t.tagId !== id))
    })
  }
  
  // Context Mapping operations
  async createContextMapping(data: Omit<ContextMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContextMapping> {
    const mapping: ContextMapping = {
      ...data,
      id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const transaction = this.db!.transaction(['contextMappings'], 'readwrite')
    const store = transaction.objectStore('contextMappings')
    await this.promisifyRequest(store.add(mapping))
    
    this.contextMappings.value.push(mapping)
    return mapping
  }
  
  // Tag Rule operations
  async createRule(data: Omit<TagRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<TagRule> {
    const rule: TagRule = {
      ...data,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const transaction = this.db!.transaction(['tagRules'], 'readwrite')
    const store = transaction.objectStore('tagRules')
    await this.promisifyRequest(store.add(rule))
    
    this.tagRules.value.push(rule)
    return rule
  }
  
  async updateRule(id: string, updates: Partial<TagRule>): Promise<void> {
    const rule = this.tagRules.value.find(r => r.id === id)
    if (!rule) throw new Error('Rule not found')
    
    Object.assign(rule, updates, { updatedAt: new Date() })
    
    const transaction = this.db!.transaction(['tagRules'], 'readwrite')
    const store = transaction.objectStore('tagRules')
    await this.promisifyRequest(store.put(rule))
  }
  
  // File tagging operations
  async tagFile(fileId: string, tagId: string, source: FileTag['source'], ruleId?: string): Promise<void> {
    const fileTag: FileTag = {
      fileId,
      tagId,
      source,
      ruleId,
      confidence: source === 'manual' ? 1 : 0.8,
      createdAt: new Date()
    }
    
    const transaction = this.db!.transaction(['fileTags'], 'readwrite')
    const store = transaction.objectStore('fileTags')
    await this.promisifyRequest(store.add(fileTag))
    
    if (!this.fileTags.value.has(fileId)) {
      this.fileTags.value.set(fileId, [])
    }
    this.fileTags.value.get(fileId)!.push(fileTag)
  }
  
  async untagFile(fileId: string, tagId: string): Promise<void> {
    const transaction = this.db!.transaction(['fileTags'], 'readwrite')
    const store = transaction.objectStore('fileTags')
    await this.promisifyRequest(store.delete([fileId, tagId]))
    
    const fileTags = this.fileTags.value.get(fileId) || []
    this.fileTags.value.set(fileId, fileTags.filter(t => t.tagId !== tagId))
  }
  
  // Apply rules to files
  async applyRulesToFiles(files: FileNode[]): Promise<number> {
    let tagCount = 0
    const activeRules = this.tagRules.value
      .filter(r => r.active)
      .sort((a, b) => b.priority - a.priority)
    
    for (const file of files) {
      const fileId = `${file.path}/${file.name}`
      
      for (const rule of activeRules) {
        const pattern = new RegExp(rule.pattern, 'i')
        const testValue = rule.patternType === 'path' ? file.path : file.name
        
        const match = testValue.match(pattern)
        if (match) {
          // Extract values from capture groups
          const tagValue = rule.tagTemplate.replace(/\{(\d+)\}/g, (_, group) => match[group] || '')
          
          // Find or create tag
          let tag = this.tags.value.find(t => t.categoryId === rule.categoryId && t.value === tagValue)
          if (!tag) {
            tag = await this.createTag({
              categoryId: rule.categoryId,
              name: tagValue,
              value: tagValue
            })
          }
          
          // Tag the file
          const existingTag = this.fileTags.value.get(fileId)?.find(t => t.tagId === tag!.id)
          if (!existingTag) {
            await this.tagFile(fileId, tag.id, 'rule', rule.id)
            tagCount++
          }
        }
      }
    }
    
    return tagCount
  }
  
  // Get files by tag
  getFilesByTag(tagId: string): string[] {
    const fileIds: string[] = []
    this.fileTags.value.forEach((tags, fileId) => {
      if (tags.some(t => t.tagId === tagId)) {
        fileIds.push(fileId)
      }
    })
    return fileIds
  }
  
  // Get files by category
  getFilesByCategory(categoryId: string): string[] {
    const categoryTags = this.tags.value.filter(t => t.categoryId === categoryId)
    const fileIds = new Set<string>()
    
    categoryTags.forEach(tag => {
      this.getFilesByTag(tag.id).forEach(fileId => fileIds.add(fileId))
    })
    
    return Array.from(fileIds)
  }
  
  // Initialize with default categories
  async initializeDefaults() {
    if (this.tagCategories.value.length === 0) {
      // Create default categories
      const defaultCategories = [
        { name: 'Capture Roll', icon: '📼', color: '#8B5CF6', description: 'Media card or reel identifiers' },
        { name: 'Camera', icon: '📹', color: '#EC4899', description: 'Camera units and models' },
        { name: 'Format', icon: '🎨', color: '#10B981', description: 'Media formats and codecs' },
        { name: 'Resolution', icon: '📐', color: '#F59E0B', description: 'Video resolution categories' },
        { name: 'Frame Rate', icon: '🎬', color: '#3B82F6', description: 'Frames per second' },
        { name: 'Project', icon: '🎯', color: '#6366F1', description: 'Project or production names' },
        { name: 'Date', icon: '📅', color: '#EF4444', description: 'Shoot dates and timelines' },
        { name: 'Status', icon: '📋', color: '#059669', description: 'Production workflow status' },
        { name: 'Location', icon: '📍', color: '#F97316', description: 'Shooting locations' },
        { name: 'Scene', icon: '🎭', color: '#7C3AED', description: 'Scene and shot identifiers' }
      ]
      
      for (const cat of defaultCategories) {
        await this.createCategory(cat)
      }
    }
  }
  
  private promisifyRequest(request: IDBRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

// Create singleton instance
export const contextStore = new ContextStore()

// Composable for components
export function useContextStore() {
  return {
    // State
    tagCategories: contextStore.tagCategories,
    tags: contextStore.tags,
    contextMappings: contextStore.contextMappings,
    tagRules: contextStore.tagRules,
    fileTags: contextStore.fileTags,
    
    // Computed
    tagsByCategory: contextStore.tagsByCategory,
    categoriesTree: contextStore.categoriesTree,
    
    // Methods
    initialize: () => contextStore.initialize(),
    initializeDefaults: () => contextStore.initializeDefaults(),
    
    // Category operations
    createCategory: contextStore.createCategory.bind(contextStore),
    updateCategory: contextStore.updateCategory.bind(contextStore),
    
    // Tag operations
    createTag: contextStore.createTag.bind(contextStore),
    updateTag: contextStore.updateTag.bind(contextStore),
    deleteTag: contextStore.deleteTag.bind(contextStore),
    
    // Context mapping
    createContextMapping: contextStore.createContextMapping.bind(contextStore),
    
    // Rules
    createRule: contextStore.createRule.bind(contextStore),
    updateRule: contextStore.updateRule.bind(contextStore),
    
    // File operations
    tagFile: contextStore.tagFile.bind(contextStore),
    untagFile: contextStore.untagFile.bind(contextStore),
    applyRulesToFiles: contextStore.applyRulesToFiles.bind(contextStore),
    getFilesByTag: contextStore.getFilesByTag.bind(contextStore),
    getFilesByCategory: contextStore.getFilesByCategory.bind(contextStore)
  }
}