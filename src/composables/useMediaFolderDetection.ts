import type { FileNode } from '@/types'

export interface MediaFolderPattern {
  id: string
  name: string
  description: string
  pathPatterns: RegExp[]
  namePatterns: RegExp[]
  contentIndicators: string[]
  excludePatterns: RegExp[]
  confidence: number
  examples: string[]
}

export interface FolderClassification {
  type: 'media' | 'cache' | 'system' | 'unknown'
  confidence: number
  pattern?: MediaFolderPattern
  reasoning: string[]
  shouldScan: boolean
  priority: number
}

export interface UserFolderFlag {
  path: string
  type: 'media' | 'ignore' | 'system'
  userDefined: boolean
  timestamp: Date
}

export const BUILTIN_PATTERNS: MediaFolderPattern[] = [
  // RED Camera Patterns
  {
    id: 'red_camera',
    name: 'RED Camera Media',
    description: 'RED camera capture folders with RDC/R3D files',
    pathPatterns: [/RED.*CAPTURE/i, /RED.*MEDIA/i, /\d{4}-\d{2}-\d{2}/],
    namePatterns: [/^[A-Z]\d{3}$/i, /^RED_/i, /^CAPTURE/i],
    contentIndicators: ['.rdc', '.r3d', '.rmf', '.rmd'],
    excludePatterns: [/cache/i, /temp/i, /proxy/i],
    confidence: 0.95,
    examples: ['A001_C001_RED', 'CAPTURE_001', 'RED_2024-01-15']
  },

  // Sony Camera Patterns  
  {
    id: 'sony_xdcam',
    name: 'Sony XDCAM Media',
    description: 'Sony camera XDROOT/CLIP structure',
    pathPatterns: [/XDROOT[\/\\]CLIP/i, /PRIVATE[\/\\]M4ROOT/i],
    namePatterns: [/^CLIP$/i, /^SUB$/i, /^GENERAL$/i],
    contentIndicators: ['.mxf', '.xml', '.bim', '.ppm'],
    excludePatterns: [/thumbnail/i, /cache/i],
    confidence: 0.98,
    examples: ['XDROOT/CLIP', 'PRIVATE/M4ROOT/CLIP']
  },

  // Blackmagic Patterns
  {
    id: 'blackmagic_braw',
    name: 'Blackmagic RAW Media',
    description: 'Blackmagic camera BRAW folders',
    pathPatterns: [/BMPCC/i, /URSA/i, /Blackmagic/i],
    namePatterns: [/^[A-Z]\d{3}$/i, /BMPCC/i, /^\d{4}-\d{2}-\d{2}$/],
    contentIndicators: ['.braw'],
    excludePatterns: [/cache/i, /proxy/i],
    confidence: 0.92,
    examples: ['BMPCC_2024-01-15_001', 'URSA_A001']
  },

  // Canon Patterns
  {
    id: 'canon_cinema',
    name: 'Canon Cinema Media',
    description: 'Canon cinema camera folders',
    pathPatterns: [/CANON/i, /DCIM/i, /EOS/i],
    namePatterns: [/^[A-Z]\d{3}CANON$/i, /^\d{3}CANON$/i],
    contentIndicators: ['.mxf', '.mp4', '.mov', '.cif', '.cpf'],
    excludePatterns: [/thumbnail/i, /cache/i],
    confidence: 0.90,
    examples: ['100CANON', 'A001CANON', 'DCIM/100CANON']
  },

  // Standard Video Patterns
  {
    id: 'standard_video',
    name: 'Standard Video Media',
    description: 'Common video file folders',
    pathPatterns: [/video/i, /footage/i, /media/i, /clips/i],
    namePatterns: [/video/i, /footage/i, /media/i, /clips/i, /rushes/i],
    contentIndicators: ['.mp4', '.mov', '.avi', '.mkv', '.prores'],
    excludePatterns: [/cache/i, /proxy/i, /thumbnail/i, /temp/i],
    confidence: 0.75,
    examples: ['Video', 'Footage', 'Media', 'Clips']
  },

  // Audio Patterns
  {
    id: 'audio_media',
    name: 'Audio Media',
    description: 'Audio recording folders',
    pathPatterns: [/audio/i, /sound/i, /records/i],
    namePatterns: [/audio/i, /sound/i, /records/i, /wav/i],
    contentIndicators: ['.wav', '.aif', '.mp3', '.flac'],
    excludePatterns: [/cache/i, /temp/i],
    confidence: 0.80,
    examples: ['Audio', 'Sound', 'Records', 'WAV Files']
  }
]

export const IGNORE_PATTERNS: MediaFolderPattern[] = [
  // Cache/Temp Folders
  {
    id: 'cache_folders',
    name: 'Cache/Temp Folders',
    description: 'System cache and temporary folders to ignore',
    pathPatterns: [/cache/i, /temp/i, /tmp/i, /\.cache/i],
    namePatterns: [/cache/i, /temp/i, /tmp/i, /\.temp/i, /\.cache/i],
    contentIndicators: ['.tmp', '.cache', '.log'],
    excludePatterns: [],
    confidence: 0.95,
    examples: ['Cache', 'Temp', '.cache', 'tmp']
  },

  // System Folders
  {
    id: 'system_folders',
    name: 'System Folders',
    description: 'Operating system folders to ignore',
    pathPatterns: [/System/i, /Library/i, /Windows/i, /\.git/i],
    namePatterns: [/^System$/i, /^Library$/i, /^Windows$/i, /^\.git$/i, /^\.DS_Store$/i],
    contentIndicators: ['.sys', '.dll', '.exe'],
    excludePatterns: [],
    confidence: 0.98,
    examples: ['System', 'Library', 'Windows', '.git']
  },

  // Proxy/Preview Folders
  {
    id: 'proxy_folders',
    name: 'Proxy/Preview Folders',
    description: 'Low-resolution proxy and preview folders',
    pathPatterns: [/proxy/i, /preview/i, /thumbnail/i, /thumb/i],
    namePatterns: [/proxy/i, /preview/i, /thumbnail/i, /thumb/i],
    contentIndicators: ['.jpg', '.png', '.jpeg'],
    excludePatterns: [],
    confidence: 0.90,
    examples: ['Proxy', 'Preview', 'Thumbnails', 'Thumbs']
  }
]

export function useMediaFolderDetection() {
  
  function classifyFolder(
    folderNode: FileNode, 
    patterns: MediaFolderPattern[] = BUILTIN_PATTERNS,
    userFlags: UserFolderFlag[] = []
  ): FolderClassification {
    
    // Check user-defined flags first
    const userFlag = userFlags.find(flag => 
      folderNode.path.includes(flag.path) || flag.path.includes(folderNode.path)
    )
    
    if (userFlag) {
      return {
        type: userFlag.type === 'ignore' ? 'cache' : userFlag.type === 'system' ? 'system' : 'media',
        confidence: 1.0,
        reasoning: [`User-defined: ${userFlag.type}`],
        shouldScan: userFlag.type === 'media',
        priority: userFlag.type === 'media' ? 10 : 0
      }
    }

    // Check ignore patterns first
    for (const pattern of IGNORE_PATTERNS) {
      const score = calculatePatternScore(folderNode, pattern)
      if (score > 0.7) {
        return {
          type: 'cache',
          confidence: score,
          pattern,
          reasoning: [`Matches ignore pattern: ${pattern.name}`],
          shouldScan: false,
          priority: 0
        }
      }
    }

    // Check media patterns
    let bestMatch: { pattern: MediaFolderPattern, score: number } | null = null
    
    for (const pattern of patterns) {
      const score = calculatePatternScore(folderNode, pattern)
      if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { pattern, score }
      }
    }

    if (bestMatch) {
      return {
        type: 'media',
        confidence: bestMatch.score,
        pattern: bestMatch.pattern,
        reasoning: [`Matches pattern: ${bestMatch.pattern.name} (${Math.round(bestMatch.score * 100)}%)`],
        shouldScan: true,
        priority: Math.round(bestMatch.score * 10)
      }
    }

    // Default classification
    return {
      type: 'unknown',
      confidence: 0.5,
      reasoning: ['No clear pattern match'],
      shouldScan: true, // Scan unknowns but with low priority
      priority: 1
    }
  }

  function calculatePatternScore(folderNode: FileNode, pattern: MediaFolderPattern): number {
    let score = 0
    let factors = 0

    // Path pattern matching
    if (pattern.pathPatterns.length > 0) {
      factors++
      const pathMatches = pattern.pathPatterns.some(regex => regex.test(folderNode.path))
      if (pathMatches) score += 0.4
    }

    // Name pattern matching  
    if (pattern.namePatterns.length > 0) {
      factors++
      const nameMatches = pattern.namePatterns.some(regex => regex.test(folderNode.name))
      if (nameMatches) score += 0.3
    }

    // Content indicator matching (check file extensions in children)
    if (pattern.contentIndicators.length > 0 && folderNode.children) {
      factors++
      const childFiles = folderNode.children.filter(child => child.type === 'file')
      const hasIndicators = pattern.contentIndicators.some(indicator => 
        childFiles.some(file => file.name.toLowerCase().includes(indicator.toLowerCase()))
      )
      if (hasIndicators) score += 0.5
    }

    // Exclude pattern penalty
    if (pattern.excludePatterns.length > 0) {
      const excluded = pattern.excludePatterns.some(regex => 
        regex.test(folderNode.path) || regex.test(folderNode.name)
      )
      if (excluded) score -= 0.3
    }

    // Normalize score
    return Math.max(0, Math.min(1, score))
  }

  function generateScanPlan(rootNode: FileNode, userFlags: UserFolderFlag[] = []): {
    scanQueue: Array<{ node: FileNode, classification: FolderClassification }>
    skipQueue: Array<{ node: FileNode, classification: FolderClassification }>
    stats: { total: number, media: number, cache: number, unknown: number }
  } {
    const scanQueue: Array<{ node: FileNode, classification: FolderClassification }> = []
    const skipQueue: Array<{ node: FileNode, classification: FolderClassification }> = []
    const stats = { total: 0, media: 0, cache: 0, unknown: 0 }

    function processNode(node: FileNode) {
      if (node.type === 'directory') {
        const classification = classifyFolder(node, BUILTIN_PATTERNS, userFlags)
        stats.total++
        
        switch (classification.type) {
          case 'media':
            stats.media++
            scanQueue.push({ node, classification })
            break
          case 'cache':
          case 'system':
            stats.cache++
            skipQueue.push({ node, classification })
            return // Don't process children of ignored folders
          default:
            stats.unknown++
            scanQueue.push({ node, classification })
        }

        // Process children
        if (node.children) {
          node.children.forEach(processNode)
        }
      }
    }

    processNode(rootNode)

    // Sort scan queue by priority (highest first)
    scanQueue.sort((a, b) => b.classification.priority - a.classification.priority)

    return { scanQueue, skipQueue, stats }
  }

  function learnFromUserAction(
    folderPath: string, 
    userAction: 'media' | 'ignore' | 'system',
    existingFlags: UserFolderFlag[]
  ): UserFolderFlag[] {
    
    // Remove any existing flags for this path
    const filteredFlags = existingFlags.filter(flag => flag.path !== folderPath)
    
    // Add new flag
    const newFlag: UserFolderFlag = {
      path: folderPath,
      type: userAction,
      userDefined: true,
      timestamp: new Date()
    }
    
    return [...filteredFlags, newFlag]
  }

  function suggestPatternUpdates(
    userFlags: UserFolderFlag[]
  ): { suggestions: string[], newPatterns: Partial<MediaFolderPattern>[] } {
    const suggestions: string[] = []
    const newPatterns: Partial<MediaFolderPattern>[] = []

    // Group user flags by type
    const mediaFlags = userFlags.filter(f => f.type === 'media')
    const ignoreFlags = userFlags.filter(f => f.type === 'ignore')

    // Analyze media folder patterns
    if (mediaFlags.length >= 3) {
      const commonPaths = findCommonPatterns(mediaFlags.map(f => f.path))
      if (commonPaths.length > 0) {
        suggestions.push(`Detected new media folder pattern: ${commonPaths.join(', ')}`)
        
        newPatterns.push({
          id: `user_media_${Date.now()}`,
          name: 'User-Defined Media Pattern',
          pathPatterns: commonPaths.map(pattern => new RegExp(pattern, 'i')),
          confidence: 0.85
        })
      }
    }

    // Analyze ignore folder patterns
    if (ignoreFlags.length >= 3) {
      const commonPaths = findCommonPatterns(ignoreFlags.map(f => f.path))
      if (commonPaths.length > 0) {
        suggestions.push(`Detected folders to always ignore: ${commonPaths.join(', ')}`)
      }
    }

    return { suggestions, newPatterns }
  }

  function findCommonPatterns(paths: string[]): string[] {
    const patterns: string[] = []
    
    // Find common path segments
    const segments = paths.map(path => path.split('/').filter(Boolean))
    
    if (segments.length < 2) return patterns

    // Find segments that appear in most paths
    const segmentCounts = new Map<string, number>()
    
    segments.forEach(pathSegments => {
      const uniqueSegments = new Set(pathSegments)
      uniqueSegments.forEach(segment => {
        segmentCounts.set(segment, (segmentCounts.get(segment) || 0) + 1)
      })
    })

    // Extract patterns that appear in at least 60% of paths
    const threshold = Math.ceil(paths.length * 0.6)
    
    segmentCounts.forEach((count, segment) => {
      if (count >= threshold) {
        patterns.push(segment)
      }
    })

    return patterns
  }

  return {
    classifyFolder,
    generateScanPlan,
    learnFromUserAction,
    suggestPatternUpdates,
    BUILTIN_PATTERNS,
    IGNORE_PATTERNS
  }
}