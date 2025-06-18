import { ref, computed } from 'vue'
import type { FileNode } from '@/types'

// Level 1: Atomic Files (base level)
export interface AtomicFile extends FileNode {
  id: string
  checksum?: string
  metadata?: Record<string, any>
  technicalSpecs?: {
    resolution?: string
    frameRate?: number
    duration?: number
    codec?: string
    colorSpace?: string
  }
}

// Level 2: Assets (logical groupings of files)
export interface Asset {
  id: string
  type: 'clip' | 'sequence' | 'media-group' | 'document'
  name: string
  primaryFile: AtomicFile
  relatedFiles: AtomicFile[] // proxies, audio, metadata files
  metadata: Record<string, any>
  relationships: {
    parent?: Asset
    children: Asset[]
    variants: Asset[] // different formats/resolutions
    dependencies: Asset[] // required assets
  }
  labels: MetadataLabel[]
  createdAt: Date
  updatedAt: Date
}

// Level 3: Asset Groups (RED clips, sequences, projects)
export interface AssetGroup {
  id: string
  type: 'red-clip' | 'sequence' | 'scene' | 'project' | 'collection'
  name: string
  assets: Asset[]
  primaryAsset: Asset
  metadata: Record<string, any>
  labels: MetadataLabel[]
  rules: GroupingRule[]
}

// Metadata Label System (class-like system for hierarchies)
export interface MetadataLabel {
  id: string
  key: string // e.g., 'project', 'camera', 'shoot-date'
  value: string // e.g., 'Easter Service', 'Camera A', '2024-03-15'
  type: 'project' | 'camera' | 'date' | 'status' | 'location' | 'technical' | 'content' | 'custom'
  confidence: number
  source: 'auto-detected' | 'user-assigned' | 'inherited' | 'rule-based'
  hierarchy: string[] // e.g., ['Projects', 'Easter Service', 'Main Sanctuary']
  appliedAt: Date
}

// Grouping Rules (defines how files become assets and asset groups)
export interface GroupingRule {
  id: string
  name: string
  type: 'file-to-asset' | 'asset-to-group' | 'labeling'
  condition: RuleCondition
  action: RuleAction
  priority: number
  active: boolean
}

export interface RuleCondition {
  type: 'filename-pattern' | 'path-pattern' | 'metadata' | 'file-relationship' | 'temporal'
  pattern?: string | RegExp
  field?: string
  operator?: 'equals' | 'contains' | 'matches' | 'exists' | 'greater-than' | 'less-than'
  value?: any
  conditions?: RuleCondition[] // for complex AND/OR logic
  logic?: 'AND' | 'OR'
}

export interface RuleAction {
  type: 'create-asset' | 'group-assets' | 'assign-label' | 'create-relationship'
  assetType?: Asset['type']
  groupType?: AssetGroup['type']
  label?: Partial<MetadataLabel>
  relationshipType?: 'parent' | 'child' | 'variant' | 'dependency'
  targetAsset?: string
}

// Virtual Hierarchy (appears in multiple places without duplication)
export interface VirtualHierarchy {
  id: string
  name: string
  type: 'project' | 'camera' | 'date' | 'status' | 'location' | 'content'
  rootLabel: MetadataLabel
  structure: HierarchyNode[]
  rules: MetadataLabel[] // labels that define this hierarchy
}

export interface HierarchyNode {
  id: string
  label: MetadataLabel
  children: HierarchyNode[]
  assets: Asset[]
  assetGroups: AssetGroup[]
  depth: number
}

// State
const atomicFiles = ref<AtomicFile[]>([])
const assets = ref<Asset[]>([])
const assetGroups = ref<AssetGroup[]>([])
const metadataLabels = ref<MetadataLabel[]>([])
const groupingRules = ref<GroupingRule[]>([])
const virtualHierarchies = ref<VirtualHierarchy[]>([])

export function useAssetHierarchy() {
  
  // RED Clip Detection and Grouping
  const redClipRules: GroupingRule[] = [
    {
      id: 'red-r3d-grouping',
      name: 'RED R3D Clip Grouping',
      type: 'file-to-asset',
      condition: {
        type: 'filename-pattern',
        pattern: /^([A-Z]\d{3}_[A-Z]\d{3}_\d{8}_)\d{3}\.R3D$/i
      },
      action: {
        type: 'create-asset',
        assetType: 'clip'
      },
      priority: 100,
      active: true
    },
    {
      id: 'red-metaclip-grouping',
      name: 'RED MetaClip Creation',
      type: 'asset-to-group',
      condition: {
        type: 'metadata',
        field: 'redClipBase',
        operator: 'exists'
      },
      action: {
        type: 'group-assets',
        groupType: 'red-clip'
      },
      priority: 90,
      active: true
    }
  ]

  // Process files through the hierarchy
  function processFiles(files: FileNode[]): void {
    // Step 1: Convert files to atomic files
    const processedFiles = files.map(file => convertToAtomicFile(file))
    atomicFiles.value = processedFiles

    // Step 2: Apply grouping rules to create assets
    const generatedAssets = applyFileToAssetRules(processedFiles)
    assets.value = generatedAssets

    // Step 3: Create asset groups (RED clips, sequences, etc.)
    const generatedGroups = applyAssetToGroupRules(generatedAssets)
    assetGroups.value = generatedGroups

    // Step 4: Auto-detect and assign metadata labels
    const detectedLabels = detectMetadataLabels(processedFiles, generatedAssets, generatedGroups)
    metadataLabels.value = detectedLabels

    // Step 5: Create virtual hierarchies
    virtualHierarchies.value = createVirtualHierarchies(detectedLabels)
  }

  function convertToAtomicFile(file: FileNode): AtomicFile {
    return {
      ...file,
      id: `file-${file.path}-${file.name}`,
      metadata: extractFileMetadata(file),
      technicalSpecs: extractTechnicalSpecs(file)
    }
  }

  function applyFileToAssetRules(files: AtomicFile[]): Asset[] {
    const assets: Asset[] = []
    const processedFiles = new Set<string>()

    // Apply RED R3D grouping
    const redClipGroups = new Map<string, AtomicFile[]>()
    
    files.forEach(file => {
      if (file.name.endsWith('.R3D')) {
        const match = file.name.match(/^([A-Z]\d{3}_[A-Z]\d{3}_\d{8}_)\d{3}\.R3D$/i)
        if (match) {
          const clipBase = match[1]
          if (!redClipGroups.has(clipBase)) {
            redClipGroups.set(clipBase, [])
          }
          redClipGroups.get(clipBase)!.push(file)
          processedFiles.add(file.id)
        }
      }
    })

    // Create RED MetaClip assets
    redClipGroups.forEach((clipFiles, clipBase) => {
      const primaryFile = clipFiles.sort((a, b) => a.name.localeCompare(b.name))[0]
      const relatedFiles = clipFiles.slice(1)

      const asset: Asset = {
        id: `red-clip-${clipBase}`,
        type: 'clip',
        name: `RED Clip ${clipBase}`,
        primaryFile,
        relatedFiles,
        metadata: {
          redClipBase: clipBase,
          frameCount: clipFiles.length,
          isREDClip: true,
          ...extractREDMetadata(clipBase)
        },
        relationships: {
          children: [],
          variants: [],
          dependencies: []
        },
        labels: generateREDLabels(clipBase),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      assets.push(asset)
    })

    // Process remaining files as individual assets
    files.forEach(file => {
      if (!processedFiles.has(file.id)) {
        const asset: Asset = {
          id: `asset-${file.id}`,
          type: getAssetType(file),
          name: file.name,
          primaryFile: file,
          relatedFiles: [],
          metadata: file.metadata || {},
          relationships: {
            children: [],
            variants: [],
            dependencies: []
          },
          labels: generateFileLabels(file),
          createdAt: new Date(),
          updatedAt: new Date()
        }

        assets.push(asset)
      }
    })

    return assets
  }

  function applyAssetToGroupRules(assets: Asset[]): AssetGroup[] {
    const groups: AssetGroup[] = []

    // Group RED clips by shoot day
    const redClipsByShoot = new Map<string, Asset[]>()
    assets.forEach(asset => {
      if (asset.metadata.isREDClip) {
        const shootDate = asset.metadata.shootDate || 'unknown'
        if (!redClipsByShoot.has(shootDate)) {
          redClipsByShoot.set(shootDate, [])
        }
        redClipsByShoot.get(shootDate)!.push(asset)
      }
    })

    redClipsByShoot.forEach((shootAssets, shootDate) => {
      const group: AssetGroup = {
        id: `red-shoot-${shootDate}`,
        type: 'red-clip',
        name: `RED Shoot ${shootDate}`,
        assets: shootAssets,
        primaryAsset: shootAssets[0],
        metadata: {
          shootDate,
          clipCount: shootAssets.length
        },
        labels: [
          {
            id: `label-${Date.now()}`,
            key: 'shoot-date',
            value: shootDate,
            type: 'date',
            confidence: 0.9,
            source: 'auto-detected',
            hierarchy: ['Shoots', shootDate],
            appliedAt: new Date()
          }
        ],
        rules: []
      }

      groups.push(group)
    })

    return groups
  }

  function detectMetadataLabels(files: AtomicFile[], assets: Asset[], groups: AssetGroup[]): MetadataLabel[] {
    const labels: MetadataLabel[] = []

    // Extract labels from all levels
    files.forEach(file => {
      const fileLabels = extractLabelsFromPath(file.path, file.name)
      labels.push(...fileLabels)
    })

    assets.forEach(asset => {
      labels.push(...asset.labels)
    })

    groups.forEach(group => {
      labels.push(...group.labels)
    })

    // Deduplicate and consolidate
    return consolidateLabels(labels)
  }

  function createVirtualHierarchies(labels: MetadataLabel[]): VirtualHierarchy[] {
    const hierarchies: VirtualHierarchy[] = []

    // Group labels by type
    const labelsByType = labels.reduce((acc, label) => {
      if (!acc[label.type]) acc[label.type] = []
      acc[label.type].push(label)
      return acc
    }, {} as Record<string, MetadataLabel[]>)

    // Create hierarchy for each type
    Object.entries(labelsByType).forEach(([type, typeLabels]) => {
      const hierarchy: VirtualHierarchy = {
        id: `hierarchy-${type}`,
        name: formatHierarchyName(type),
        type: type as VirtualHierarchy['type'],
        rootLabel: typeLabels[0], // Most common or highest confidence
        structure: buildHierarchyStructure(typeLabels),
        rules: typeLabels
      }

      hierarchies.push(hierarchy)
    })

    return hierarchies
  }

  // Utility functions
  function extractFileMetadata(file: FileNode): Record<string, any> {
    const metadata: Record<string, any> = {}

    // Extract from filename patterns
    const redMatch = file.name.match(/^([A-Z]\d{3})_([A-Z]\d{3})_(\d{8})_(\d{3})\.R3D$/i)
    if (redMatch) {
      metadata.reelId = redMatch[1]
      metadata.cameraId = redMatch[2]
      metadata.shootDate = redMatch[3]
      metadata.clipNumber = redMatch[4]
      metadata.isREDClip = true
    }

    // Extract from path
    const pathSegments = file.path.split('/').filter(Boolean)
    pathSegments.forEach((segment, index) => {
      if (/\d{4}[-_]\d{2}[-_]\d{2}/.test(segment)) {
        metadata.shootDate = segment
      }
      if (/project|show|event/i.test(segment)) {
        metadata.projectName = segment
      }
      if (/cam|camera/i.test(segment)) {
        metadata.cameraUnit = segment
      }
    })

    return metadata
  }

  function extractTechnicalSpecs(file: FileNode): any {
    const ext = file.name.split('.').pop()?.toLowerCase()
    
    // Mock technical specs - in real app would read from actual metadata
    const specs: any = {}
    
    if (ext === 'r3d') {
      specs.resolution = '8K'
      specs.frameRate = 24
      specs.codec = 'REDCODE'
      specs.colorSpace = 'REDWideGamutRGB'
    } else if (['mov', 'mp4'].includes(ext || '')) {
      specs.resolution = '4K'
      specs.frameRate = 24
      specs.codec = 'ProRes 422'
    }

    return specs
  }

  function extractREDMetadata(clipBase: string): Record<string, any> {
    const parts = clipBase.split('_')
    return {
      reelId: parts[0],
      cameraId: parts[1],
      shootDate: parts[2],
      formattedDate: formatShootDate(parts[2])
    }
  }

  function generateREDLabels(clipBase: string): MetadataLabel[] {
    const metadata = extractREDMetadata(clipBase)
    const labels: MetadataLabel[] = []

    labels.push({
      id: `label-reel-${clipBase}`,
      key: 'reel-id',
      value: metadata.reelId,
      type: 'technical',
      confidence: 0.95,
      source: 'auto-detected',
      hierarchy: ['Technical', 'Reels', metadata.reelId],
      appliedAt: new Date()
    })

    labels.push({
      id: `label-camera-${clipBase}`,
      key: 'camera-id',
      value: metadata.cameraId,
      type: 'camera',
      confidence: 0.95,
      source: 'auto-detected',
      hierarchy: ['Cameras', metadata.cameraId],
      appliedAt: new Date()
    })

    labels.push({
      id: `label-date-${clipBase}`,
      key: 'shoot-date',
      value: metadata.formattedDate,
      type: 'date',
      confidence: 0.95,
      source: 'auto-detected',
      hierarchy: ['Dates', metadata.formattedDate],
      appliedAt: new Date()
    })

    return labels
  }

  function generateFileLabels(file: AtomicFile): MetadataLabel[] {
    const labels: MetadataLabel[] = []
    
    // Extract labels from path and filename
    if (file.metadata) {
      Object.entries(file.metadata).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          labels.push({
            id: `label-${key}-${file.id}`,
            key,
            value,
            type: detectLabelType(key),
            confidence: 0.7,
            source: 'auto-detected',
            hierarchy: [formatHierarchyName(detectLabelType(key)), value],
            appliedAt: new Date()
          })
        }
      })
    }

    return labels
  }

  function extractLabelsFromPath(path: string, filename: string): MetadataLabel[] {
    const labels: MetadataLabel[] = []
    const segments = path.split('/').filter(Boolean)

    segments.forEach((segment, index) => {
      const labelType = detectSegmentType(segment)
      
      labels.push({
        id: `path-label-${path}-${index}`,
        key: `level-${index}`,
        value: segment,
        type: labelType,
        confidence: 0.6,
        source: 'auto-detected',
        hierarchy: ['Folders', ...segments.slice(0, index + 1)],
        appliedAt: new Date()
      })
    })

    return labels
  }

  // Helper functions
  function getAssetType(file: AtomicFile): Asset['type'] {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (['r3d', 'mov', 'mp4', 'avi'].includes(ext || '')) return 'clip'
    if (['jpg', 'png', 'tiff'].includes(ext || '')) return 'media-group'
    return 'document'
  }

  function detectLabelType(key: string): MetadataLabel['type'] {
    if (['project', 'show', 'event'].some(k => key.includes(k))) return 'project'
    if (['camera', 'cam'].some(k => key.includes(k))) return 'camera'
    if (['date', 'shoot'].some(k => key.includes(k))) return 'date'
    if (['reel', 'roll', 'card'].some(k => key.includes(k))) return 'technical'
    if (['status', 'state'].some(k => key.includes(k))) return 'status'
    if (['location', 'venue', 'room'].some(k => key.includes(k))) return 'location'
    return 'custom'
  }

  function detectSegmentType(segment: string): MetadataLabel['type'] {
    if (/\d{4}[-_]\d{2}[-_]\d{2}/.test(segment)) return 'date'
    if (/project|show|event/i.test(segment)) return 'project'
    if (/cam|camera/i.test(segment)) return 'camera'
    if (/location|venue|room/i.test(segment)) return 'location'
    return 'content'
  }

  function formatShootDate(dateStr: string): string {
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
    }
    return dateStr
  }

  function formatHierarchyName(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/[-_]/g, ' ')
  }

  function consolidateLabels(labels: MetadataLabel[]): MetadataLabel[] {
    const labelMap = new Map<string, MetadataLabel>()

    labels.forEach(label => {
      const key = `${label.key}:${label.value}`
      const existing = labelMap.get(key)

      if (existing) {
        // Merge labels, taking higher confidence
        if (label.confidence > existing.confidence) {
          labelMap.set(key, label)
        }
      } else {
        labelMap.set(key, label)
      }
    })

    return Array.from(labelMap.values())
  }

  function buildHierarchyStructure(labels: MetadataLabel[]): HierarchyNode[] {
    // Build tree structure from hierarchy paths
    const rootNodes: HierarchyNode[] = []
    const nodeMap = new Map<string, HierarchyNode>()

    labels.forEach(label => {
      label.hierarchy.forEach((level, depth) => {
        const nodeKey = label.hierarchy.slice(0, depth + 1).join('/')
        
        if (!nodeMap.has(nodeKey)) {
          const node: HierarchyNode = {
            id: `node-${nodeKey}`,
            label: {
              ...label,
              value: level
            },
            children: [],
            assets: [],
            assetGroups: [],
            depth
          }

          nodeMap.set(nodeKey, node)

          if (depth === 0) {
            rootNodes.push(node)
          } else {
            const parentKey = label.hierarchy.slice(0, depth).join('/')
            const parent = nodeMap.get(parentKey)
            if (parent) {
              parent.children.push(node)
            }
          }
        }
      })
    })

    return rootNodes
  }

  // Initialize with default RED rules
  groupingRules.value = redClipRules

  // Computed values
  const redClips = computed(() => 
    assetGroups.value.filter(group => group.type === 'red-clip')
  )

  const projectHierarchy = computed(() =>
    virtualHierarchies.value.find(h => h.type === 'project')
  )

  const cameraHierarchy = computed(() =>
    virtualHierarchies.value.find(h => h.type === 'camera')
  )

  const dateHierarchy = computed(() =>
    virtualHierarchies.value.find(h => h.type === 'date')
  )

  return {
    // State
    atomicFiles: computed(() => atomicFiles.value),
    assets: computed(() => assets.value),
    assetGroups: computed(() => assetGroups.value),
    metadataLabels: computed(() => metadataLabels.value),
    virtualHierarchies: computed(() => virtualHierarchies.value),
    
    // Computed hierarchies
    redClips,
    projectHierarchy,
    cameraHierarchy,
    dateHierarchy,
    
    // Methods
    processFiles,
    
    // Advanced methods for UI
    getAssetsByLabel: (key: string, value: string) => 
      assets.value.filter(asset => 
        asset.labels.some(label => label.key === key && label.value === value)
      ),
    
    getVirtualLocation: (asset: Asset, hierarchyType: VirtualHierarchy['type']) => {
      const hierarchy = virtualHierarchies.value.find(h => h.type === hierarchyType)
      const relevantLabel = asset.labels.find(label => label.type === hierarchyType)
      return relevantLabel?.hierarchy || []
    }
  }
}