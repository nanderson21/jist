import { ref, computed } from 'vue'
import type { MediaAsset } from './useMediaAssets'
import { useMediaRelationships, type CollapsedGroup } from './useMediaRelationships'

export interface MediaRepresentation {
  type: 'online' | 'offline' | 'proxy' | 'preview' | 'thumbnail'
  resolution?: string
  codec?: string
  bitrate?: number
  asset: MediaAsset
}

export interface MediaGroup {
  id: string
  baseName: string
  representations: MediaRepresentation[]
  primaryRepresentation: MediaRepresentation
  tags: string[]
  metadata: {
    captureDate?: Date
    location?: string
    camera?: string
    project?: string
    scene?: string
    take?: string
    [key: string]: any
  }
}

export interface SmartCollection {
  id: string
  name: string
  query: TagQuery
  assets: MediaGroup[]
  icon: string
  color: string
}

export interface TagQuery {
  include?: string[]
  exclude?: string[]
  format?: string[]
  resolution?: string[]
  dateRange?: { start: Date; end: Date }
  customFilters?: { [key: string]: any }
}

export function useMediaRepresentations() {
  const mediaGroups = ref<MediaGroup[]>([])
  const smartCollections = ref<SmartCollection[]>([])
  const availableTags = ref<Set<string>>(new Set())
  const { processAssets, collapsedGroups } = useMediaRelationships()

  /**
   * Detect representation type from file path and name
   */
  function detectRepresentationType(asset: MediaAsset): 'online' | 'offline' | 'proxy' | 'preview' {
    const path = asset.primaryFile.path.toLowerCase()
    const name = asset.primaryFile.name.toLowerCase()
    const ext = asset.primaryFile.name.split('.').pop()?.toLowerCase() || ''
    
    // Check for explicit proxy paths and naming patterns
    const proxyPatterns = [
      '/proxy/', '/proxies/', '/proxy_', 
      '_proxy', '_prx', '_low', '_preview', '_thumb',
      '_h264', '_mp4', '_comp', '_compressed'
    ]
    
    const offlinePatterns = [
      '/offline/', '/edit/', '/rough_cut/', '/assembly/',
      '_offline', '_edit', '_cut', '_rough', '_assembly'
    ]
    
    const onlinePatterns = [
      '/online/', '/master/', '/source/', '/original/', '/raw/',
      '/full/', '/hires/', '/hi_res/', '/uncompressed/',
      '_master', '_source', '_original', '_online', '_full', '_hires'
    ]
    
    // Check proxy patterns
    if (proxyPatterns.some(pattern => path.includes(pattern) || name.includes(pattern))) {
      return 'proxy'
    }
    
    // Check offline patterns
    if (offlinePatterns.some(pattern => path.includes(pattern) || name.includes(pattern))) {
      return 'offline'
    }
    
    // Check online/master patterns
    if (onlinePatterns.some(pattern => path.includes(pattern) || name.includes(pattern))) {
      return 'online'
    }
    
    // Preview patterns
    if (path.includes('/preview/') || name.includes('_preview') || name.includes('_prev')) {
      return 'preview'
    }
    
    // Extension-based detection
    const proxyExtensions = ['mp4', 'h264', 'avi', 'wmv', 'webm']
    const masterExtensions = ['r3d', 'braw', 'mxf', 'dpx', 'exr', 'tiff', 'tif']
    
    if (proxyExtensions.includes(ext)) {
      return 'proxy'
    }
    
    if (masterExtensions.includes(ext)) {
      return 'online'
    }
    
    // File size heuristics - smaller files are likely proxies
    const sizeGB = (asset.primaryFile.size || 0) / (1024 * 1024 * 1024)
    if (sizeGB < 0.5 && ['mov', 'mp4'].includes(ext)) {
      return 'proxy'
    }
    
    // Default to online for full resolution media
    return 'online'
  }

  /**
   * Extract base name for grouping representations
   */
  function extractBaseName(asset: MediaAsset): string {
    let baseName = asset.name
    
    // Remove common suffixes
    baseName = baseName.replace(/_(proxy|prx|offline|edit|preview|online|master)$/i, '')
    baseName = baseName.replace(/_(low|med|high|full)$/i, '')
    baseName = baseName.replace(/_(h264|prores|dnxhd|avid)$/i, '')
    baseName = baseName.replace(/_(1080p|720p|4k|uhd|2k)$/i, '')
    
    return baseName
  }

  /**
   * Generate automatic tags from asset metadata and path
   */
  function generateAutomaticTags(asset: MediaAsset): string[] {
    const tags: string[] = []
    const path = asset.primaryFile.path
    const pathParts = path.split('/')
    
    // Format tags
    tags.push(`format:${asset.format}`)
    if (asset.metadata.codec) {
      tags.push(`codec:${asset.metadata.codec.toLowerCase()}`)
    }
    
    // Resolution tags
    if (asset.metadata.resolution) {
      const res = asset.metadata.resolution.toLowerCase()
      if (res.includes('4k') || res.includes('3840')) tags.push('resolution:4k')
      else if (res.includes('2k') || res.includes('1920')) tags.push('resolution:2k')
      else if (res.includes('1080')) tags.push('resolution:1080p')
      else if (res.includes('720')) tags.push('resolution:720p')
      else tags.push(`resolution:${res}`)
    }
    
    // Frame rate tags
    if (asset.metadata.frameRate) {
      tags.push(`fps:${asset.metadata.frameRate}`)
      if (asset.metadata.frameRate >= 60) tags.push('fps:highspeed')
      if (asset.metadata.frameRate <= 25) tags.push('fps:cinema')
    }
    
    // Path-based tags (project structure)
    pathParts.forEach((part, index) => {
      if (part && index > 0) { // Skip root
        // Detect common folder patterns
        if (/^(scene|sc)[\s_-]*\d+/i.test(part)) {
          tags.push(`scene:${part.toLowerCase()}`)
        } else if (/^(take|tk|shot)[\s_-]*\d+/i.test(part)) {
          tags.push(`take:${part.toLowerCase()}`)
        } else if (/^(cam|camera)[\s_-]*[a-z]/i.test(part)) {
          tags.push(`camera:${part.toLowerCase()}`)
        } else if (/^\d{4}[-_]\d{2}[-_]\d{2}/.test(part)) {
          tags.push(`date:${part}`)
        } else if (part.length < 20) { // Avoid very long folder names
          tags.push(`folder:${part.toLowerCase()}`)
        }
      }
    })
    
    // Capture roll tags (for RED)
    if (asset.metadata.captureRoll) {
      tags.push(`roll:${asset.metadata.captureRoll.toLowerCase()}`)
    }
    
    // File size tags
    const sizeGB = (asset.metadata.totalSize || asset.primaryFile.size || 0) / (1024 * 1024 * 1024)
    if (sizeGB > 10) tags.push('size:large')
    else if (sizeGB > 1) tags.push('size:medium')
    else tags.push('size:small')
    
    // Representation type
    const repType = detectRepresentationType(asset)
    tags.push(`type:${repType}`)
    
    return tags
  }

  /**
   * Group assets using proper relationship detection and waveform collapse
   */
  function createMediaGroups(assets: MediaAsset[]): MediaGroup[] {
    // Process assets through relationship detection
    processAssets(assets)
    
    // Convert collapsed groups to media groups
    const groups: MediaGroup[] = collapsedGroups.value.map(collapsedGroup => {
      const allRefs = [collapsedGroup.canonical, ...collapsedGroup.variants]
      const representations: MediaRepresentation[] = []
      const allTags = new Set<string>()
      
      // Create representations from all references
      allRefs.forEach(ref => {
        const asset = ref.asset
        const tags = generateAutomaticTags(asset)
        
        // Determine representation type from relationship or fingerprint
        let repType: MediaRepresentation['type'] = 'online'
        
        if (ref.id !== collapsedGroup.canonical.id) {
          // This is a variant, check relationship type
          const relationshipType = collapsedGroup.relationships.get(ref.id)
          if (relationshipType) {
            repType = relationshipType as MediaRepresentation['type']
          } else {
            // Fallback to pattern detection
            repType = detectRepresentationType(asset)
          }
        } else {
          // This is canonical, likely the highest quality
          repType = 'online'
        }
        
        representations.push({
          type: repType,
          resolution: asset.metadata.resolution,
          codec: asset.metadata.codec,
          bitrate: asset.metadata.bitRate,
          asset
        })
        
        // Collect all tags
        tags.forEach(tag => {
          allTags.add(tag)
          availableTags.value.add(tag)
        })
      })
      
      // Set primary representation (canonical)
      const primaryRepresentation = representations.find(rep => 
        rep.asset.id === collapsedGroup.canonical.id
      ) || representations[0]
      
      // Extract metadata from canonical asset
      const canonicalAsset = collapsedGroup.canonical.asset
      const metadata = {
        captureRoll: canonicalAsset.metadata.captureRoll,
        project: canonicalAsset.metadata.captureRoll
      }
      
      return {
        id: collapsedGroup.id,
        baseName: collapsedGroup.baseName,
        representations,
        primaryRepresentation,
        tags: Array.from(allTags),
        metadata
      }
    })
    
    console.log('Created media groups from relationships:', {
      inputAssets: assets.length,
      collapsedGroups: collapsedGroups.value.length,
      outputGroups: groups.length,
      totalRepresentations: groups.reduce((sum, g) => sum + g.representations.length, 0)
    })
    
    return groups
  }

  /**
   * Create default smart collections
   */
  function createDefaultSmartCollections(groups: MediaGroup[]): SmartCollection[] {
    return [
      {
        id: 'all_media',
        name: 'All Media',
        query: {},
        assets: groups,
        icon: '🎬',
        color: '#3b82f6'
      },
      {
        id: 'proxies',
        name: 'Proxy Media',
        query: { include: ['type:proxy'] },
        assets: filterGroupsByQuery(groups, { include: ['type:proxy'] }),
        icon: '📱',
        color: '#10b981'
      },
      {
        id: 'online_clips',
        name: 'Online/Master',
        query: { include: ['type:online', 'type:master'] },
        assets: filterGroupsByQuery(groups, { include: ['type:online', 'type:master'] }),
        icon: '💎',
        color: '#8b5cf6'
      },
      {
        id: 'offline_clips',
        name: 'Offline/Edit',
        query: { include: ['type:offline'] },
        assets: filterGroupsByQuery(groups, { include: ['type:offline'] }),
        icon: '✂️',
        color: '#f59e0b'
      },
      {
        id: 'red_clips',
        name: 'RED Clips',
        query: { format: ['red'] },
        assets: filterGroupsByQuery(groups, { format: ['red'] }),
        icon: '🔴',
        color: '#ef4444'
      },
      {
        id: 'braw_clips',
        name: 'BRAW Clips',
        query: { format: ['braw'] },
        assets: filterGroupsByQuery(groups, { format: ['braw'] }),
        icon: '⚫',
        color: '#1f2937'
      },
      {
        id: 'high_res',
        name: '4K+ Media',
        query: { include: ['resolution:4k', 'resolution:uhd'] },
        assets: filterGroupsByQuery(groups, { include: ['resolution:4k', 'resolution:uhd'] }),
        icon: '📺',
        color: '#8b5cf6'
      },
      {
        id: 'proxy_pairs',
        name: 'Proxy Pairs',
        query: {},
        assets: groups.filter(group => 
          group.representations.some(rep => rep.type === 'proxy') &&
          group.representations.some(rep => rep.type === 'online' || rep.type === 'master')
        ),
        icon: '🔗',
        color: '#06b6d4'
      },
      {
        id: 'recent',
        name: 'Recently Added',
        query: {},
        assets: groups.slice().sort((a, b) => {
          const aTime = Math.max(...a.representations.map(r => r.asset.primaryFile.lastModified?.getTime() || 0))
          const bTime = Math.max(...b.representations.map(r => r.asset.primaryFile.lastModified?.getTime() || 0))
          return bTime - aTime
        }).slice(0, 50),
        icon: '⏰',
        color: '#f59e0b'
      }
    ]
  }

  /**
   * Filter media groups by tag query
   */
  function filterGroupsByQuery(groups: MediaGroup[], query: TagQuery): MediaGroup[] {
    return groups.filter(group => {
      // Include filters
      if (query.include && query.include.length > 0) {
        const hasRequiredTag = query.include.some(tag => group.tags.includes(tag))
        if (!hasRequiredTag) return false
      }
      
      // Exclude filters
      if (query.exclude && query.exclude.length > 0) {
        const hasExcludedTag = query.exclude.some(tag => group.tags.includes(tag))
        if (hasExcludedTag) return false
      }
      
      // Format filters
      if (query.format && query.format.length > 0) {
        const hasFormat = query.format.some(format => 
          group.tags.includes(`format:${format}`)
        )
        if (!hasFormat) return false
      }
      
      // Resolution filters
      if (query.resolution && query.resolution.length > 0) {
        const hasResolution = query.resolution.some(res => 
          group.tags.includes(`resolution:${res}`)
        )
        if (!hasResolution) return false
      }
      
      return true
    })
  }

  /**
   * Update media groups from assets
   */
  function updateMediaGroups(assets: MediaAsset[]): void {
    mediaGroups.value = createMediaGroups(assets)
    smartCollections.value = createDefaultSmartCollections(mediaGroups.value)
  }

  /**
   * Get all unique tag categories
   */
  const tagCategories = computed(() => {
    const categories = new Map<string, string[]>()
    
    for (const tag of availableTags.value) {
      const [category, value] = tag.split(':')
      if (category && value) {
        if (!categories.has(category)) {
          categories.set(category, [])
        }
        if (!categories.get(category)!.includes(value)) {
          categories.get(category)!.push(value)
        }
      }
    }
    
    return categories
  })

  return {
    mediaGroups,
    smartCollections,
    availableTags,
    tagCategories,
    updateMediaGroups,
    filterGroupsByQuery,
    createMediaGroups,
    generateAutomaticTags,
    detectRepresentationType
  }
}