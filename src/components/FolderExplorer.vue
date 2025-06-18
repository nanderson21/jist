<template>
  <div class="folder-explorer">
    <div class="mb-4 space-y-2">
      <Button @click="selectFolder" variant="outline" :disabled="isLoading">
        <span v-if="isLoading">Loading...</span>
        <span v-else>Select Project Folder</span>
      </Button>
      
      <div v-if="error" class="text-sm text-destructive">
        Error: {{ error }}
      </div>
      
      <div v-if="isLoading && scanningTree" class="mt-4">
        <ScanProgress
          :current-path="currentScanPath"
          :file-count="fileCount"
          :folder-count="folderCount"
          :scan-tree="scanningTree"
        />
      </div>
    </div>
    
    <div v-if="rootNode && !isLoading" class="tree-container border rounded-lg p-4">
      <div class="text-sm text-muted-foreground mb-2">
        Found {{ fileCount }} files in {{ folderCount }} folders
      </div>
      <TreeNode
        :node="rootNode"
        :depth="0"
        @toggle-select="toggleNodeSelection"
        @toggle-flag="toggleNodeFlag"
        @file-click="handleFileClick"
      />
    </div>
    
    <div v-else-if="!rootNode && !isLoading && !error" class="text-muted-foreground">
      No folder selected. Click the button above to select a project folder.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFileSystemAccess } from '@vueuse/core'
import type { FileNode } from '@/types'
import Button from '@/components/ui/button.vue'
import TreeNode from '@/components/TreeNode.vue'
import ScanProgress from '@/components/ScanProgress.vue'

const rootNode = ref<FileNode | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const fileCount = ref(0)
const folderCount = ref(0)
const currentScanPath = ref('')
const scanningTree = ref<FileNode | null>(null)

const { isSupported, open } = useFileSystemAccess({
  dataType: 'Text',
  types: [{
    description: 'All Files',
    accept: { '*/*': ['*'] }
  }],
  excludeAcceptAllOption: false,
  multiple: false
})

async function selectFolder() {
  if (!isSupported.value) {
    error.value = 'File System Access API is not supported in this browser. Please use Chrome, Edge, or another compatible browser.'
    return
  }

  error.value = null
  isLoading.value = true
  fileCount.value = 0
  folderCount.value = 0

  try {
    // @ts-ignore - showDirectoryPicker is not in the types yet
    const directoryHandle = await window.showDirectoryPicker()
    console.log('Directory selected:', directoryHandle.name)
    
    // Initialize scanning tree
    scanningTree.value = {
      name: directoryHandle.name,
      path: directoryHandle.name,
      type: 'directory',
      children: []
    }
    
    rootNode.value = await scanDirectory(directoryHandle, '', scanningTree.value)
    console.log('Scan complete. Files:', fileCount.value, 'Folders:', folderCount.value)
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // User cancelled the dialog
      console.log('User cancelled folder selection')
    } else {
      console.error('Error selecting folder:', err)
      error.value = err.message || 'Failed to read folder'
    }
  } finally {
    isLoading.value = false
  }
}

async function scanDirectory(dirHandle: FileSystemDirectoryHandle, path = '', treeNode?: FileNode): Promise<FileNode> {
  const node: FileNode = {
    name: dirHandle.name,
    path: path ? `${path}/${dirHandle.name}` : dirHandle.name,
    type: 'directory',
    children: []
  }

  currentScanPath.value = node.path
  folderCount.value++

  // Update scanning tree if provided
  if (treeNode) {
    treeNode.path = node.path
    treeNode.children = []
  }

  try {
    console.log(`Scanning directory: ${node.path}`)
    let entryCount = 0
    
    for await (const entry of dirHandle.values()) {
      entryCount++
      console.log(`Processing ${entry.kind}: ${entry.name}`)
      
      if (entry.kind === 'file') {
        try {
          const file = await entry.getFile()
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
          
          fileCount.value++
        } catch (fileErr) {
          console.error(`Error reading file ${entry.name}:`, fileErr)
        }
      } else if (entry.kind === 'directory') {
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
          
          const childNode = await scanDirectory(entry, node.path, subTreeNode)
          node.children!.push(childNode)
        } catch (dirErr) {
          console.error(`Error scanning subdirectory ${entry.name}:`, dirErr)
        }
      }
    }
    
    console.log(`Finished scanning ${node.path}: ${entryCount} entries`)
  } catch (err) {
    console.error(`Error iterating directory ${node.path}:`, err)
    // Continue scanning even if one directory fails
  }

  // Sort: directories first, then alphabetically
  node.children!.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name)
    }
    return a.type === 'directory' ? -1 : 1
  })

  return node
}

function toggleNodeSelection(node: FileNode) {
  node.selected = !node.selected
  emit('node-selected', node)
}

function toggleNodeFlag(node: FileNode) {
  node.flagged = !node.flagged
  emit('node-flagged', node)
}

function handleFileClick(node: FileNode) {
  emit('file-clicked', node)
}

const emit = defineEmits<{
  'node-selected': [node: FileNode]
  'node-flagged': [node: FileNode]
  'file-clicked': [node: FileNode]
}>()
</script>

<style scoped>
.tree-container {
  max-height: 600px;
  overflow-y: auto;
}
</style>