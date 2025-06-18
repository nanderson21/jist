<template>
  <div class="min-h-screen bg-background">
    <div class="flex h-screen">
      <!-- Left Sidebar - Split into Raw Folders and Smart Collections -->
      <div class="w-80 border-r flex flex-col">
        <!-- Top Half - Raw Folders -->
        <div class="flex-1 min-h-0 flex flex-col">
          <div class="p-3 border-b">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-semibold">Raw Folders</h2>
              <Button @click="selectProject" variant="outline" size="sm" :disabled="isSelectingProject">
                {{ isSelectingProject ? '...' : '📁' }}
              </Button>
            </div>
            
            <div v-if="rootNode" class="flex gap-2">
              <Button @click="importMHL" variant="outline" size="sm" class="text-xs">
                📋 Import MHL
              </Button>
              <Button @click="generateAllMHL" variant="outline" size="sm" class="text-xs">
                💾 Export MHL
              </Button>
            </div>
          </div>
          
          <!-- Tree Browser -->
          <div class="flex-1 overflow-auto">
            <!-- Scanning Progress in Tree (always visible when scanning) -->
            <div v-if="isScanning" class="p-2 bg-blue-50 dark:bg-blue-900/20 border-b">
              <div class="text-xs text-black flex items-center gap-2">
                <div class="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                Scanning...
              </div>
            </div>
            
            <!-- File Tree -->
            <div class="flex-1 overflow-auto">
              <FileBrowser
                :root-node="currentRoot"
                :selected-file="selectedTreeNode"
                :active-rules="activeRules"
                :is-partial-scan="isScanning"
                @file-selected="handleTreeNodeSelect"
                @create-rule="handleCreateRule"
              />
            </div>
            
            <!-- Smart Folder Classifier -->
            <div v-if="selectedTreeNode && selectedTreeNode.type === 'directory'" class="border-t">
              <SmartFolderClassifier
                :selected-folder="selectedTreeNode"
                :user-flags="userFolderFlags"
                :is-scanning="isScanning"
                @folder-flagged="handleFolderFlagged"
                @start-smart-scan="handleSmartScan"
              />
            </div>
          </div>
        </div>
        
        <!-- Bottom Half - Smart Collections -->
        <div class="flex-1 min-h-0">
          <SmartCollectionsSidebar
            ref="smartCollectionsSidebarRef"
            :smart-collections="smartCollections"
            :tag-categories="tagCategories"
            :media-groups="mediaGroups"
            :all-files="allAvailableFiles"
            :is-scanning="isScanning"
            @collection-selected="handleCollectionSelected"
            @query-applied="handleQueryApplied"
            @filters-changed="handleFiltersChanged"
            @hierarchy-selected="handleHierarchySelected"
            @add-to-hierarchy="handleAddToHierarchy"
          />
        </div>
      </div>
      
      <!-- Center Panel - Unified Context Manager -->
      <div class="flex-1 flex flex-col border-r">
        <!-- Scanning Progress -->
        <div v-if="isScanning" class="p-3 bg-blue-50 dark:bg-blue-900/20 border-b">
          <ScanProgress
            :current-path="scanProgress.currentPath"
            :file-count="scanProgress.fileCount"
            :folder-count="scanProgress.folderCount"
            :scan-tree="scanningTree"
          />
        </div>
        
        <!-- Unified Context Manager -->
        <div class="flex-1 overflow-hidden">
          <UnifiedContextManager
            :files="allAvailableFiles"
            :root-node="currentRoot"
            @file-selected="handleContextualFileSelect"
            @context-assigned="handleContextAssigned"
            @rule-created="handleRuleCreated"
          />
        </div>
      </div>
      
      <!-- Right Sidebar - File Details -->
      <div class="w-96 flex flex-col">
        <!-- File Metadata -->
        <div class="flex-1 p-4 border-b">
          <h3 class="font-semibold mb-3">File Details</h3>
          <FileDetails 
            :file="selectedFile" 
            @create-rule="handleCreateRule"
            @add-to-hierarchy="handleAddToHierarchy"
            @create-advanced-rule="handleCreateAdvancedRule"
          />
        </div>
        
        <!-- Asset Groups -->
        <div class="flex-1 p-4 border-b" v-if="selectedAsset || selectedAssets.length > 0">
          <AssetGroupsPanel
            :selected-asset="selectedAsset"
            :selected-assets="selectedAssets"
            :current-group="currentMediaGroup"
            :media-groups="mediaGroups"
            :available-assets="allAvailableAssets"
            @asset-selected="handleAssetSelect"
            @group-created="handleGroupCreated"
            @group-updated="handleGroupUpdated"
            @group-deleted="handleGroupDeleted"
            @suggestion-applied="handleSuggestionApplied"
          />
        </div>
        
        <!-- Context Observations Feed -->
        <div class="flex-1 border-b">
          <ContextObservationsFeed
            :selected-folder="selectedTreeNode?.path"
            @observation-selected="handleObservationSelected"
            @action-executed="handleObservationAction"
          />
        </div>
        
        <!-- Active Rules -->
        <div class="flex-1 p-4">
          <h3 class="font-semibold mb-3">Ingest Rules</h3>
          <RulesList 
            :rules="activeRules"
            :selected-file="selectedFile"
            @rule-updated="handleRuleUpdate"
            @rule-deleted="handleRuleDelete"
          />
        </div>
      </div>
    </div>
    
    <!-- Rule Creation Modal -->
    <RuleCreationModal
      v-if="showRuleModal"
      :selected-text="selectedPathText"
      :file-context="selectedFile"
      :rule-data="currentRuleData"
      @rule-created="handleRuleCreated"
      @cancel="showRuleModal = false"
    />
    
    <!-- Advanced Ingest Rule Builder Modal -->
    <Teleport to="body">
      <div
        v-if="showAdvancedRuleModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click="showAdvancedRuleModal = false"
      >
        <div @click.stop class="w-full max-w-4xl">
          <IngestRuleBuilder
            @close="showAdvancedRuleModal = false"
            @save="handleAdvancedRuleSave"
          />
        </div>
      </div>
    </Teleport>
    
    <!-- MHL Export Modal -->
    <MHLExportModal
      v-if="showMHLModal"
      :asset-groups="mhlAssetGroups"
      :default-file-name="rootNode?.name"
      @generate="handleMHLGenerate"
      @cancel="showMHLModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, nextTick, watch } from 'vue'
import { useFileSystemAccess } from '@vueuse/core'
import type { FileNode, IngestRule } from '@/types'
import type { AssetGroup, MediaAsset } from '@/composables/useMediaAssets'
import { useMediaAssets } from '@/composables/useMediaAssets'
import { useMHL } from '@/composables/useMHL'
import { useFileHashing } from '@/composables/useFileHashing'
import { useMHLImport } from '@/composables/useMHLImport'
import { useMediaFolderDetection, type UserFolderFlag } from '@/composables/useMediaFolderDetection'
import { useMediaRepresentations, type MediaGroup, type SmartCollection, type TagQuery } from '@/composables/useMediaRepresentations'
import Button from '@/components/ui/button.vue'
import BreadcrumbPath from '@/components/BreadcrumbPath.vue'
import FileBrowser from '@/components/FileBrowser.vue'
import VirtualTreeView from '@/components/VirtualTreeView.vue'
import MediaAssetBrowser from '@/components/MediaAssetBrowser.vue'
import MediaAssetGridView from '@/components/MediaAssetGridView.vue'
import SmartCollectionsSidebar from '@/components/SmartCollectionsSidebar.vue'
import SmartMediaView from '@/components/SmartMediaView.vue'
import UnifiedContextManager from '@/components/UnifiedContextManager.vue'
import ContextObservationsFeed from '@/components/ContextObservationsFeed.vue'
import FileDetails from '@/components/FileDetails.vue'
import RulesList from '@/components/RulesList.vue'
import RuleCreationModal from '@/components/RuleCreationModal.vue'
import MHLExportModal from '@/components/MHLExportModal.vue'
import SmartFolderClassifier from '@/components/SmartFolderClassifier.vue'
import ScanProgress from '@/components/ScanProgress.vue'
import AssetGroupsPanel from '@/components/AssetGroupsPanel.vue'
import IngestRuleBuilder from '@/components/IngestRuleBuilder.vue'

const rootNode = ref<FileNode | null>(null)
const selectedFile = ref<FileNode | null>(null)
const selectedAsset = ref<MediaAsset | null>(null)
const selectedAssets = ref<MediaAsset[]>([])
const selectedTreeNode = ref<FileNode | null>(null)
const activeRules = ref<IngestRule[]>([])
const assetGroups = ref<AssetGroup[]>([])
const detectedFormat = ref<string>('standard') // Cache the detected format to prevent changes during scanning
const viewMode = ref<'files' | 'assets-list' | 'assets-grid'>('assets-grid')
const showRuleModal = ref(false)
const showMHLModal = ref(false)
const showAdvancedRuleModal = ref(false)
const selectedPathText = ref('')
const currentRuleData = ref<any>(null)
const smartCollectionsSidebarRef = ref<InstanceType<typeof SmartCollectionsSidebar>>()
const mhlAssetGroups = ref<AssetGroup[]>([])
const importedMHLData = ref<any>(null)
const userFolderFlags = ref<UserFolderFlag[]>([])
const isSelectingProject = ref(false)
const isScanning = ref(false)
const scanProgress = ref({
  currentPath: '',
  fileCount: 0,
  folderCount: 0,
  completedFolders: 0,
  totalFolders: 0
})
const scanningTree = ref<FileNode | null>(null)
const partiallyScannedRoot = ref<FileNode | null>(null)
const scanUpdateTrigger = ref(0)
let updateTimeoutId: number | null = null

const { isSupported } = useFileSystemAccess()
const { createAssetGroups, detectCameraFormat, createAssetGroupsWithFormat } = useMediaAssets()
const { generateMHL, exportMHLFile } = useMHL()
const { hashMultipleFiles } = useFileHashing()
const { importMHLFile, shouldSkipHashing, getExistingHash } = useMHLImport()
const { learnFromUserAction } = useMediaFolderDetection()
const { 
  mediaGroups, 
  smartCollections, 
  tagCategories, 
  updateMediaGroups 
} = useMediaRepresentations()

// Smart collections state
const selectedCollection = ref<SmartCollection | null>(null)
const appliedQuery = ref<TagQuery | null>(null)

// Computed properties for filtered content with stability
const filteredAssetGroups = computed(() => {
  console.log('filteredAssetGroups computed:', {
    isScanning: isScanning.value,
    hasSelectedNode: !!selectedTreeNode.value,
    selectedNodePath: selectedTreeNode.value?.path,
    totalAssetGroups: assetGroups.value.length,
    totalAssets: assetGroups.value.reduce((sum, g) => sum + g.assets.length, 0)
  })
  
  // During active scanning, always show all assets to prevent flickering empty state
  // This ensures progressive build-up of assets regardless of selected folder
  if (isScanning.value) {
    console.log('Returning all assets during scanning')
    return assetGroups.value
  }
  
  // If no folder is selected (after scanning), show all assets
  if (!selectedTreeNode.value || selectedTreeNode.value.type === 'file') {
    console.log('No folder selected, returning all assets')
    return assetGroups.value
  }
  
  // Filter asset groups to only show those under the selected folder path
  const selectedPath = selectedTreeNode.value.path
  console.log('Filtering by selected path:', selectedPath)
  
  const filtered = assetGroups.value.filter(group => {
    // Check if any asset in the group is under the selected folder
    return group.assets.some(asset => 
      asset.primaryFile.path.startsWith(selectedPath + '/') || 
      asset.primaryFile.path === selectedPath
    )
  }).map(group => ({
    ...group,
    // Also filter the assets within each group
    assets: group.assets.filter(asset => 
      asset.primaryFile.path.startsWith(selectedPath + '/') || 
      asset.primaryFile.path === selectedPath
    )
  })).filter(group => group.assets.length > 0) // Remove empty groups
  
  console.log('Filtered result:', {
    filteredGroups: filtered.length,
    filteredAssets: filtered.reduce((sum, g) => sum + g.assets.length, 0)
  })
  
  return filtered
})

const totalFilteredAssets = computed(() =>
  filteredAssetGroups.value.reduce((sum, group) => sum + group.assets.length, 0)
)

const totalFilteredSize = computed(() =>
  filteredAssetGroups.value.reduce((sum, group) => sum + group.totalSize, 0)
)

const allAvailableFiles = computed(() => {
  const sourceNode = partiallyScannedRoot.value || rootNode.value
  if (!sourceNode) return []
  
  return collectAllFiles(sourceNode)
})

const currentRoot = computed(() => {
  // During scanning, show the partial tree that gets updated in real-time
  if (isScanning.value && partiallyScannedRoot.value) {
    return partiallyScannedRoot.value
  }
  
  // After scanning, show the complete tree
  return rootNode.value
})

// Find the current media group for the selected asset
const currentMediaGroup = computed(() => {
  if (!selectedAsset.value) return null
  
  return mediaGroups.value.find(group => 
    group.representations.some(rep => rep.asset.id === selectedAsset.value!.id)
  ) || null
})

// Get all available assets for group editing
const allAvailableAssets = computed(() => {
  return assetGroups.value.flatMap(group => group.assets)
})

// Create asset groups when files are scanned - simplified and stable
watch([rootNode, partiallyScannedRoot], ([root, partial]) => {
  const sourceNode = partial || root
  
  if (sourceNode) {
    const allFiles = collectAllFiles(sourceNode)
    
    // During scanning, maintain format consistency by caching the first detection
    if (isScanning.value && detectedFormat.value === 'standard' && allFiles.length > 10) {
      // Only update format detection after we have enough files to make a stable decision
      const detectedCameraFormat = detectCameraFormat(allFiles)
      if (detectedCameraFormat !== 'standard') {
        detectedFormat.value = detectedCameraFormat
        console.log('Camera format detected:', detectedCameraFormat)
      }
    } else if (!isScanning.value) {
      // When not scanning, always do fresh format detection
      detectedFormat.value = detectCameraFormat(allFiles)
    }
    
    const newAssetGroups = createAssetGroupsWithFormat(allFiles, detectedFormat.value)
    console.log('Asset groups updated via main watch:', {
      isScanning: isScanning.value,
      sourceType: partial ? 'partial' : 'root',
      fileCount: allFiles.length,
      groupCount: newAssetGroups.length,
      format: detectedFormat.value
    })
    assetGroups.value = newAssetGroups
    
    // Update media groups for smart collections
    const allAssets = newAssetGroups.flatMap(group => group.assets)
    updateMediaGroups(allAssets)
  } else {
    console.log('Asset groups cleared - no source node')
    assetGroups.value = []
  }
}, { immediate: true })

// Watch for scan updates to trigger asset group regeneration during scanning  
watch([scanUpdateTrigger, partiallyScannedRoot, isScanning], ([trigger, partial, scanning]) => {
  if (partial && scanning) {
    const allFiles = collectAllFiles(partial)
    
    // During scanning, maintain format consistency
    if (detectedFormat.value === 'standard' && allFiles.length > 10) {
      const detectedCameraFormat = detectCameraFormat(allFiles)
      if (detectedCameraFormat !== 'standard') {
        detectedFormat.value = detectedCameraFormat
        console.log('Camera format detected during scan trigger:', detectedCameraFormat)
      }
    }
    
    const newAssetGroups = createAssetGroupsWithFormat(allFiles, detectedFormat.value)
    console.log('Asset groups updated via scan trigger:', {
      trigger,
      fileCount: allFiles.length,
      groupCount: newAssetGroups.length,
      isScanning: scanning,
      format: detectedFormat.value
    })
    assetGroups.value = newAssetGroups
    
    // Update media groups for smart collections
    const allAssets = newAssetGroups.flatMap(group => group.assets)
    updateMediaGroups(allAssets)
  }
})

// Helper function to collect all files from a tree
function collectAllFiles(node: FileNode): FileNode[] {
  const files: FileNode[] = []
  
  if (node.type === 'file') {
    files.push(node)
  }
  
  if (node.children) {
    for (const child of node.children) {
      files.push(...collectAllFiles(child))
    }
  }
  
  return files
}

// Throttled asset update function
function triggerAssetUpdate() {
  if (updateTimeoutId) {
    clearTimeout(updateTimeoutId)
  }
  
  updateTimeoutId = setTimeout(() => {
    scanUpdateTrigger.value++
    updateTimeoutId = null
  }, 100) // Update every 100ms max
}

// Helper function to find a node by path in a tree
function findNodeByPath(root: FileNode, targetPath: string): FileNode | null {
  if (root.path === targetPath) {
    return root
  }
  
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeByPath(child, targetPath)
      if (found) return found
    }
  }
  
  return null
}

// Helper function to add a node to the correct parent in the tree
function addNodeToTree(root: FileNode, newNode: FileNode): boolean {
  const parentPath = newNode.path.substring(0, newNode.path.lastIndexOf('/'))
  
  if (parentPath === root.path) {
    // Direct child of root
    if (!root.children) root.children = []
    
    // Check if already exists
    const existing = root.children.find(child => child.path === newNode.path)
    if (!existing) {
      root.children.push(newNode)
      
      // Sort children: directories first, then alphabetically
      root.children.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name, undefined, { 
            numeric: true, 
            sensitivity: 'base' 
          })
        }
        return a.type === 'directory' ? -1 : 1
      })
      
      return true
    }
    return false
  }
  
  // Find the parent node and add there
  if (root.children) {
    for (const child of root.children) {
      if (addNodeToTree(child, newNode)) {
        return true
      }
    }
  }
  
  return false
}

async function selectProject() {
  if (!isSupported.value) {
    alert('File System Access API not supported')
    return
  }

  if (isSelectingProject.value) {
    return
  }

  isSelectingProject.value = true

  try {
    // @ts-ignore
    const directoryHandle = await window.showDirectoryPicker()
    await processDirectoryHandle(directoryHandle)
  } catch (error) {
    console.error('Error selecting project:', error)
    alert('Error selecting project: ' + error.message)
  } finally {
    isSelectingProject.value = false
    // Don't set isScanning = false here, let processDirectoryHandle control it
  }
}

async function processDirectoryHandle(directoryHandle: any) {
  try {
    // Set scanning to true IMMEDIATELY so currentRoot computed works correctly
    isScanning.value = true
    
    // Reset format detection for new scan
    detectedFormat.value = 'standard'
    
    // Reset progress
    scanProgress.value = { currentPath: '', fileCount: 0, folderCount: 0, completedFolders: 0, totalFolders: 0 }
    
    // Initialize progressive scanning
    const initialRoot: FileNode = {
      name: directoryHandle.name,
      path: directoryHandle.name,
      type: 'directory',
      children: []
    }
    
    partiallyScannedRoot.value = initialRoot
    scanningTree.value = { ...initialRoot }
    console.log('Initial scanning state set:', {
      isScanning: isScanning.value,
      hasPartialRoot: !!partiallyScannedRoot.value
    })
    
    console.log('Directory selected:', directoryHandle.name)
    
    // Start progressive scanning
    const finalRoot = await scanDirectoryProgressive(directoryHandle, '', initialRoot)
    
    // Set the final root first
    rootNode.value = finalRoot
    console.log('Final root set, completing scan...')
    
    // Mark scanning as complete BEFORE clearing partial root
    isScanning.value = false
    console.log('Scanning marked as complete')
    
    // Clear partial root AFTER setting the final root and stopping scanning
    partiallyScannedRoot.value = null
    console.log('Partial root cleared')
    
    console.log('Scan complete. Files:', scanProgress.value.fileCount, 'Folders:', scanProgress.value.folderCount)
  } catch (error) {
    console.error('Error during directory processing:', error)
    isScanning.value = false
    throw error // Re-throw to be handled by selectProject
  }
}


async function scanDirectory(dirHandle: FileSystemDirectoryHandle, path = '', treeNode?: FileNode): Promise<FileNode> {
  const node: FileNode = {
    name: dirHandle.name,
    path: path ? `${path}/${dirHandle.name}` : dirHandle.name,
    type: 'directory',
    children: []
  }

  scanProgress.value.currentPath = node.path
  scanProgress.value.folderCount++

  // Update scanning tree if provided
  if (treeNode) {
    treeNode.path = node.path
    treeNode.children = []
  }

  try {
    console.log(`Scanning directory: ${node.path}`)
    
    // First, collect all entries and sort them
    const entries: { entry: FileSystemHandle, kind: string, name: string }[] = []
    for await (const entry of dirHandle.values()) {
      entries.push({ entry, kind: entry.kind, name: entry.name })
    }
    
    // Sort entries: directories first, then by name with numeric sorting
    entries.sort((a, b) => {
      if (a.kind === b.kind) {
        return a.name.localeCompare(b.name, undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        })
      }
      return a.kind === 'directory' ? -1 : 1
    })
    
    console.log(`Processing ${entries.length} entries in sorted order:`, entries.map(e => e.name))
    
    // Now process entries in sorted order
    for (const { entry, kind } of entries) {
      console.log(`Processing ${kind}: ${entry.name}`)
      
      if (kind === 'file') {
        try {
          const file = await (entry as FileSystemFileHandle).getFile()
          const fileNode: FileNode = {
            name: entry.name,
            path: `${node.path}/${entry.name}`,
            type: 'file',
            size: file.size,
            lastModified: new Date(file.lastModified)
          }
          node.children!.push(fileNode)
          
          // Update scanning tree
          if (treeNode) {
            treeNode.children!.push({ ...fileNode })
          }
          
          scanProgress.value.fileCount++
        } catch (fileErr) {
          console.error(`Error reading file ${entry.name}:`, fileErr)
        }
      } else if (kind === 'directory') {
        try {
          // Create a tree node for the subdirectory
          const subTreeNode: FileNode = {
            name: entry.name,
            path: `${node.path}/${entry.name}`,
            type: 'directory',
            children: []
          }
          
          if (treeNode) {
            treeNode.children!.push(subTreeNode)
          }
          
          const childNode = await scanDirectory(entry as FileSystemDirectoryHandle, node.path, subTreeNode)
          node.children!.push(childNode)
        } catch (dirErr) {
          console.error(`Error scanning subdirectory ${entry.name}:`, dirErr)
        }
      }
    }
    
    console.log(`Finished scanning ${node.path}: ${entries.length} entries`)
  } catch (err) {
    console.error(`Error iterating directory ${node.path}:`, err)
    // Continue scanning even if one directory fails
  }

  // Sort: directories first, then alphabetically (with proper numeric sorting)
  node.children!.sort((a, b) => {
    if (a.type === b.type) {
      // Use localeCompare with numeric option for proper sorting of numbered prefixes
      return a.name.localeCompare(b.name, undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      })
    }
    return a.type === 'directory' ? -1 : 1
  })

  return node
}

async function scanDirectoryProgressive(dirHandle: FileSystemDirectoryHandle, path = '', parentNode: FileNode): Promise<FileNode> {
  const node: FileNode = {
    name: dirHandle.name,
    path: path ? `${path}/${dirHandle.name}` : dirHandle.name,
    type: 'directory',
    children: []
  }

  scanProgress.value.currentPath = node.path
  scanProgress.value.folderCount++

  try {
    // First, collect all entries and sort them
    const entries: { entry: FileSystemHandle, kind: string, name: string }[] = []
    for await (const entry of dirHandle.values()) {
      entries.push({ entry, kind: entry.kind, name: entry.name })
    }
    
    // Sort entries: directories first, then by name with numeric sorting
    entries.sort((a, b) => {
      if (a.kind === b.kind) {
        return a.name.localeCompare(b.name, undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        })
      }
      return a.kind === 'directory' ? -1 : 1
    })
    
    // Process all files first - add them to the tree immediately
    for (const { entry, kind } of entries.filter(e => e.kind === 'file')) {
      try {
        const file = await (entry as FileSystemFileHandle).getFile()
        const fileNode: FileNode = {
          name: entry.name,
          path: `${node.path}/${entry.name}`,
          type: 'file',
          size: file.size,
          lastModified: new Date(file.lastModified)
        }
        
        node.children!.push(fileNode)
        scanProgress.value.fileCount++
        
        // Add file to the live tree immediately
        if (partiallyScannedRoot.value) {
          addNodeToTree(partiallyScannedRoot.value, fileNode)
          // Throttled reactivity update
          triggerAssetUpdate()
        }
        
        // Small delay to make progress visible
        await new Promise(resolve => setTimeout(resolve, 1))
        
      } catch (fileErr) {
        console.error(`Error reading file ${entry.name}:`, fileErr)
      }
    }
    
    // Add subdirectory placeholders immediately
    for (const { entry, kind } of entries.filter(e => e.kind === 'directory')) {
      const childPath = `${node.path}/${entry.name}`
      const placeholderDir: FileNode = {
        name: entry.name,
        path: childPath,
        type: 'directory',
        children: []
      }
      
      node.children!.push(placeholderDir)
      
      // Add directory placeholder to the live tree immediately
      if (partiallyScannedRoot.value) {
        addNodeToTree(partiallyScannedRoot.value, placeholderDir)
        // Throttled reactivity update
        triggerAssetUpdate()
      }
    }
    
    // Sort children
    node.children!.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name, undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        })
      }
      return a.type === 'directory' ? -1 : 1
    })
    
    scanProgress.value.completedFolders++
    
    // Now recursively scan subdirectories
    const directoryEntries = entries.filter(e => e.kind === 'directory')
    scanProgress.value.totalFolders += directoryEntries.length
    
    for (const { entry } of directoryEntries) {
      try {
        const childNode = await scanDirectoryProgressive(entry as FileSystemDirectoryHandle, node.path, node)
        
        // Replace placeholder with completed scan in this node's children
        const existingIndex = node.children!.findIndex(child => child.name === entry.name && child.type === 'directory')
        if (existingIndex >= 0) {
          node.children![existingIndex] = childNode
          
          // Update the live tree with the complete subdirectory
          if (partiallyScannedRoot.value) {
            const liveNode = findNodeByPath(partiallyScannedRoot.value, childNode.path)
            if (liveNode && childNode.children) {
              // Replace the placeholder with the complete directory structure
              liveNode.children = [...childNode.children]
              // Throttled reactivity update
              triggerAssetUpdate()
            }
          }
        }
      } catch (dirErr) {
        console.error(`Error scanning subdirectory ${entry.name}:`, dirErr)
      }
    }
    
  } catch (err) {
    console.error(`Error iterating directory ${node.path}:`, err)
  }

  return node
}

function handleFileSelect(file: FileNode) {
  selectedFile.value = file
}

function handleTreeNodeSelect(node: FileNode) {
  selectedTreeNode.value = node
  
  // If it's a file, also set as selected file for details
  if (node.type === 'file') {
    selectedFile.value = node
  }
}

function handleBreadcrumbClick(data: any) {
  handleCreateRule(data)
}

function handleCreateRule(ruleData: any) {
  selectedPathText.value = ruleData.text
  currentRuleData.value = ruleData
  showRuleModal.value = true
}

function handleRuleCreated(rule: IngestRule) {
  activeRules.value.push(rule)
  showRuleModal.value = false
}

function handleRuleUpdate(rule: IngestRule) {
  const index = activeRules.value.findIndex(r => r.id === rule.id)
  if (index > -1) {
    activeRules.value[index] = rule
  }
}

function handleRuleDelete(ruleId: string) {
  const index = activeRules.value.findIndex(r => r.id === ruleId)
  if (index > -1) {
    activeRules.value.splice(index, 1)
  }
}

// Media Asset handlers
function handleAssetSelect(asset: MediaAsset) {
  selectedAsset.value = asset
  selectedFile.value = asset.primaryFile
  
  // Update selected assets for multi-select
  if (selectedAssets.value.includes(asset)) {
    selectedAssets.value = selectedAssets.value.filter(a => a.id !== asset.id)
  } else {
    selectedAssets.value = [asset]
  }
}

function handleGenerateMHL(groups: AssetGroup[]) {
  mhlAssetGroups.value = groups
  showMHLModal.value = true
}

async function handleMHLGenerate(fileName: string, options: any) {
  try {
    const manifest = await generateMHL(mhlAssetGroups.value, {
      hashType: options.hashType,
      includeMetadata: options.includeMetadata,
      relativePaths: options.relativePaths,
      basePath: options.basePath || rootNode.value?.path
    })
    
    await exportMHLFile(manifest, fileName)
    
    showMHLModal.value = false
    alert('MHL file generated successfully!')
  } catch (error) {
    console.error('Error generating MHL:', error)
    alert('Error generating MHL: ' + error.message)
  }
}

async function handleHashFiles(assets: MediaAsset[]) {
  try {
    // This is a placeholder - in a real implementation you'd need file handles
    alert(`Starting hash calculation for ${assets.length} assets...`)
    console.log('Assets to hash:', assets)
    
    // TODO: Implement actual file hashing using File System Access API
    // const allFiles = assets.flatMap(asset => asset.relatedFiles)
    // const hashes = await hashMultipleFiles(fileHandles, ['MD5', 'SHA-1'])
    
  } catch (error) {
    console.error('Error hashing files:', error)
    alert('Error hashing files: ' + error.message)
  }
}

function generateAllMHL() {
  if (assetGroups.value) {
    handleGenerateMHL(assetGroups.value)
  }
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'mxf', 'r3d', 'braw', 'rdc']
  const imageExts = ['jpg', 'jpeg', 'png', 'tiff', 'cr2', 'arw', 'dng']
  const audioExts = ['wav', 'mp3', 'aif', 'aiff']
  
  if (videoExts.includes(ext || '')) return '🎬'
  if (imageExts.includes(ext || '')) return '🖼️'
  if (audioExts.includes(ext || '')) return '🎵'
  
  return '📄'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

async function importMHL() {
  try {
    // @ts-ignore
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'Media Hash List files',
        accept: { 'application/xml': ['.mhl'] }
      }]
    })
    
    const file = await fileHandle.getFile()
    const content = await file.text()
    
    // Import MHL and match with current assets
    const allAssets = assetGroups.value.flatMap(group => group.assets)
    importedMHLData.value = await importMHLFile(content, allAssets, file.name)
    
    // Update UI to show import results
    const { matched, unmatched, newFromMHL } = importedMHLData.value
    
    let message = `MHL imported successfully!\n\n`
    message += `✅ ${matched?.length || 0} files already verified\n`
    message += `⚠️ ${unmatched?.length || 0} files need hashing\n`
    message += `📁 ${newFromMHL?.length || 0} files found in MHL but not in project`
    
    alert(message)
    
    console.log('MHL Import Data:', importedMHLData.value)
    
  } catch (error) {
    console.error('Error importing MHL:', error)
    if (error.name !== 'AbortError') {
      alert('Error importing MHL: ' + error.message)
    }
  }
}

function handleFolderFlagged(path: string, type: 'media' | 'ignore' | 'system') {
  userFolderFlags.value = learnFromUserAction(path, type, userFolderFlags.value)
  console.log('Folder flagged:', { path, type, totalFlags: userFolderFlags.value.length })
}

function handleSmartScan() {
  if (selectedTreeNode.value) {
    console.log('Starting smart scan for:', selectedTreeNode.value.path)
    // TODO: Implement smart scanning that only processes flagged media folders
    alert('Smart scan feature coming soon! This will only scan folders you\'ve marked as containing media.')
  }
}

function handleChildrenLoaded(node: FileNode, children: FileNode[]) {
  // Update the tree with loaded children and refresh asset groups
  if (node.children !== children) {
    node.children = children
    
    // Trigger asset group update
    const sourceNode = partiallyScannedRoot.value || rootNode.value
    if (sourceNode) {
      const allFiles = collectAllFiles(sourceNode)
      assetGroups.value = createAssetGroups(allFiles)
    }
  }
}

// Smart Collections Event Handlers
function handleCollectionSelected(collection: SmartCollection) {
  selectedCollection.value = collection
  appliedQuery.value = collection.query
}

function handleQueryApplied(query: TagQuery) {
  appliedQuery.value = query
}

function handleFiltersChanged(filters: string[]) {
  // Convert filters to query format
  appliedQuery.value = {
    include: filters
  }
}

function handleMediaGroupSelect(group: MediaGroup) {
  // Set the primary representation as the selected asset
  selectedAsset.value = group.primaryRepresentation.asset
  selectedFile.value = group.primaryRepresentation.asset.primaryFile
  
  // Update selected assets to include all representations in the group
  selectedAssets.value = group.representations.map(rep => rep.asset)
}

function handleQueryChanged(query: TagQuery) {
  appliedQuery.value = query
}

// Asset Groups Panel handlers
function handleGroupCreated(assets: MediaAsset[], type: string) {
  console.log('Creating new group:', { assets: assets.length, type })
  // Trigger a re-processing of media groups to include the new group
  updateMediaGroups(allAvailableAssets.value)
}

function handleGroupUpdated(group: MediaGroup) {
  console.log('Updating group:', group.id)
  // Find and update the group in mediaGroups
  const index = mediaGroups.value.findIndex(g => g.id === group.id)
  if (index >= 0) {
    mediaGroups.value[index] = group
  }
}

function handleGroupDeleted(groupId: string) {
  console.log('Deleting group:', groupId)
  // Remove the group from mediaGroups
  mediaGroups.value = mediaGroups.value.filter(g => g.id !== groupId)
  
  // Clear selection if the deleted group contained the selected asset
  if (currentMediaGroup.value?.id === groupId) {
    selectedAsset.value = null
    selectedAssets.value = []
  }
}

// New Hierarchy and Advanced Rule Handlers
function handleHierarchySelected(hierarchy: any) {
  console.log('Hierarchy selected:', hierarchy)
  // Could apply filters or update the view based on the hierarchy
}

function handleAddToHierarchy(segment: any, hierarchyData: any) {
  console.log('Adding to hierarchy:', { segment, hierarchyData })
  
  // Switch to hierarchy tab in the smart collections sidebar
  if (smartCollectionsSidebarRef.value?.switchToHierarchyTab) {
    smartCollectionsSidebarRef.value.switchToHierarchyTab()
  }
  
  // Pass the data to the sidebar to handle
  if (smartCollectionsSidebarRef.value?.handleAddToHierarchy) {
    smartCollectionsSidebarRef.value.handleAddToHierarchy(segment, hierarchyData)
  }
}

function handleCreateAdvancedRule(segment: any, context: any) {
  console.log('Creating advanced rule:', { segment, context })
  showAdvancedRuleModal.value = true
}

function handleAdvancedRuleSave(rule: any) {
  console.log('Saving advanced rule:', rule)
  
  // Add the rule to active rules
  activeRules.value.push(rule)
  
  // Save to localStorage for persistence
  const savedRules = JSON.parse(localStorage.getItem('ingestRules') || '[]')
  savedRules.push(rule)
  localStorage.setItem('ingestRules', JSON.stringify(savedRules))
  
  showAdvancedRuleModal.value = false
  
  // Show success message
  alert(`Ingest rule "${rule.name}" has been created and is now active!`)
}

// Contextual Viewport Handlers
function handleContextualFileSelect(file: FileNode) {
  selectedFile.value = file
  selectedTreeNode.value = file
  
  // Also update asset selection if this file is part of an asset
  const asset = allAvailableAssets.value.find(asset => 
    asset.primaryFile === file || asset.allFiles.includes(file)
  )
  
  if (asset) {
    selectedAsset.value = asset
  }
}

function handleContextSelected(context: any) {
  console.log('Context selected:', context)
  // Could apply filters or update views based on selected context
}

// Observations Feed Handlers
function handleObservationSelected(observation: any) {
  console.log('Observation selected:', observation)
  
  // If the observation has a primary context, we could filter by it
  if (observation.context) {
    // Could switch to a filtered view or highlight related files
  }
}

function handleObservationAction(action: string, observation: any) {
  console.log('Observation action:', { action, observation: observation.title })
  
  switch (action) {
    case 'Create production timeline view':
      // Create a filter for production pipeline stages
      appliedQuery.value = {
        include: ['status:final', 'status:approved', 'status:ready']
      }
      break
      
    case 'Set up approval workflow':
      // Switch to smart collections tab and create approval hierarchy
      if (smartCollectionsSidebarRef.value?.switchToHierarchyTab) {
        smartCollectionsSidebarRef.value.switchToHierarchyTab()
      }
      break
      
    case 'Create technical specification views':
      // Filter by technical contexts
      appliedQuery.value = {
        include: ['format:', 'technical:']
      }
      break
      
    case 'Create thematic content views':
      // Filter by semantic contexts
      appliedQuery.value = {
        include: ['semantic:', 'category:']
      }
      break
      
    case 'Configure semantic search filters':
      // Enable semantic search mode
      console.log('Enabling semantic search mode')
      break
  }
}

function handleSuggestionApplied(suggestion: any) {
  console.log('Applying suggestion:', suggestion.title)
  // Re-process media groups to apply the relationship suggestion
  updateMediaGroups(allAvailableAssets.value)
}

function handleContextAssigned(node: any, categoryId: string, value: string) {
  console.log('Context assigned:', { node: node.name, categoryId, value })
  // The UnifiedContextManager handles the context store integration internally
  // This handler could be used for additional side effects if needed
}
</script>