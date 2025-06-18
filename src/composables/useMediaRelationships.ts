import { ref, computed } from 'vue'
import type { MediaAsset } from './useMediaAssets'

export interface MediaReference {
  id: string
  asset: MediaAsset
  fingerprint: MediaFingerprint
  relationships: PotentialRelationship[]
  confidence: number
}

export interface MediaFingerprint {
  // Core identifiers
  baseName: string
  timecode?: string
  duration?: number
  frameRate?: number
  resolution?: string
  
  // Probabilistic features
  nameTokens: string[]
  pathTokens: string[]
  sizeRatio?: number
  aspectRatio?: number
  
  // Temporal features
  creationTime?: Date
  modificationTime?: Date
  
  // Technical fingerprint
  codec?: string
  bitrate?: number
  
  // Contextual clues
  folderContext: string[]
  siblingFiles: string[]
}

export interface PotentialRelationship {
  targetId: string
  type: 'proxy' | 'offline' | 'online' | 'preview' | 'master' | 'alternate'
  confidence: number
  evidence: RelationshipEvidence[]
}

export interface RelationshipEvidence {
  type: 'name_similarity' | 'path_proximity' | 'temporal_proximity' | 'size_ratio' | 'duration_match' | 'metadata_correlation'
  strength: number
  details: any
}

export interface CollapsedGroup {
  id: string
  baseName: string
  canonical: MediaReference
  variants: MediaReference[]
  relationships: Map<string, string> // targetId -> relationship type
  confidence: number
}

export function useMediaRelationships() {
  const references = ref<MediaReference[]>([])
  const collapsedGroups = ref<CollapsedGroup[]>([])
  
  /**
   * Create comprehensive fingerprint for an asset
   */
  function createFingerprint(asset: MediaAsset, allAssets: MediaAsset[]): MediaFingerprint {
    const path = asset.primaryFile.path
    const name = asset.primaryFile.name
    const pathParts = path.split('/')
    const nameWithoutExt = name.replace(/\.[^.]+$/, '')
    
    // Extract all possible name tokens
    const nameTokens = extractTokens(nameWithoutExt)
    const pathTokens = pathParts.flatMap(part => extractTokens(part))
    
    // Get sibling files in same directory
    const siblingFiles = allAssets
      .filter(a => a.primaryFile.path.substring(0, a.primaryFile.path.lastIndexOf('/')) === 
                   path.substring(0, path.lastIndexOf('/')))
      .map(a => a.primaryFile.name)
    
    // Calculate folder context hierarchy
    const folderContext = pathParts.slice(0, -1).filter(p => p.length > 0)
    
    return {
      baseName: extractBaseName(nameWithoutExt),
      timecode: asset.metadata.timecode,
      duration: asset.metadata.duration,
      frameRate: asset.metadata.frameRate,
      resolution: asset.metadata.resolution,
      nameTokens,
      pathTokens,
      sizeRatio: calculateSizeRatio(asset, allAssets),
      aspectRatio: calculateAspectRatio(asset.metadata.resolution),
      creationTime: asset.primaryFile.lastModified,
      modificationTime: asset.primaryFile.lastModified,
      codec: asset.metadata.codec,
      bitrate: asset.metadata.bitRate,
      folderContext,
      siblingFiles
    }
  }
  
  /**
   * Extract meaningful tokens from text using multiple strategies
   */
  function extractTokens(text: string): string[] {
    const tokens = new Set<string>()
    
    // Split by common separators
    const separators = /[_\-\s\.]/g
    text.split(separators).forEach(token => {
      if (token.length > 0) tokens.add(token.toLowerCase())
    })
    
    // Extract patterns
    const patterns = [
      /([a-z]+)(\d+)/gi,        // letter+number combinations
      /(\d+)([a-z]+)/gi,        // number+letter combinations
      /scene?\s*(\d+)/gi,       // scene numbers
      /take?\s*(\d+)/gi,        // take numbers
      /shot?\s*(\d+)/gi,        // shot numbers
      /cam(?:era)?\s*([a-z\d]+)/gi, // camera identifiers
      /(\d{4}[\-_]\d{2}[\-_]\d{2})/g, // dates
      /(\d{2}:\d{2}:\d{2})/g,   // timecodes
      /(proxy|offline|online|master|edit|final)/gi // type indicators
    ]
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        match.slice(1).forEach(group => {
          if (group) tokens.add(group.toLowerCase())
        })
      }
    })
    
    return Array.from(tokens)
  }
  
  /**
   * Extract base name using probabilistic approach
   */
  function extractBaseName(name: string): string {
    // For RED clips, use the full name as the base name since they're already grouped
    // This prevents different RED metaclips from being merged
    if (name.includes('red_metaclip_')) {
      return name
    }
    
    // Check for standard naming conventions: [Capture Roll]_[Clip Number]_[Clip UUID]
    // Examples: A001_C001_0001A23B, ROLL_A_001_ABC123, etc.
    const standardConvention = name.match(/^([A-Z]\d{3}_[A-Z]?\d{3}_[A-F0-9]+)/i)
    if (standardConvention) {
      return standardConvention[1]
    }
    
    // Check for RED-style naming: ClipName_001, ClipName_002, etc.
    const redStyleMatch = name.match(/^(.+?)_\d{3}$/)
    if (redStyleMatch) {
      return redStyleMatch[1]
    }
    
    // Check for timecode-based naming: ClipName_01_00_00_00
    const timecodeMatch = name.match(/^(.+?)_\d{2}_\d{2}_\d{2}_\d{2}$/)
    if (timecodeMatch) {
      return timecodeMatch[1]
    }
    
    // Remove common suffixes with confidence scoring
    const suffixPatterns = [
      { pattern: /_(proxy|prx|low|edit|offline|prev|preview|thumb)$/i, confidence: 0.9 },
      { pattern: /_(online|master|final|hires|hi|high|source|orig|original)$/i, confidence: 0.8 },
      { pattern: /_(h264|prores|dnxhd|avid|mp4|mov|avi|mxf)$/i, confidence: 0.7 },
      { pattern: /_(1080p?|720p?|4k|uhd|2k|sd|hd)$/i, confidence: 0.85 },
      { pattern: /_(small|med|medium|large|xl)$/i, confidence: 0.6 },
      { pattern: /_v?\d{1,3}$/i, confidence: 0.4 }, // version numbers - lower confidence
      { pattern: /_\d{3,4}x\d{3,4}$/i, confidence: 0.8 } // resolution indicators
    ]
    
    let baseName = name
    let maxConfidence = 0
    
    for (const { pattern, confidence } of suffixPatterns) {
      const match = name.match(pattern)
      if (match && confidence > maxConfidence) {
        baseName = name.replace(pattern, '')
        maxConfidence = confidence
      }
    }
    
    return baseName
  }
  
  /**
   * Calculate size ratio compared to other variants
   */
  function calculateSizeRatio(asset: MediaAsset, allAssets: MediaAsset[]): number {
    const size = asset.primaryFile.size || 0
    if (size === 0) return 0
    
    const maxSize = Math.max(...allAssets.map(a => a.primaryFile.size || 0))
    return maxSize > 0 ? size / maxSize : 0
  }
  
  /**
   * Calculate aspect ratio from resolution string
   */
  function calculateAspectRatio(resolution?: string): number | undefined {
    if (!resolution) return undefined
    
    const match = resolution.match(/(\d+)\s*[x×]\s*(\d+)/i)
    if (match) {
      const width = parseInt(match[1])
      const height = parseInt(match[2])
      return width / height
    }
    
    return undefined
  }
  
  /**
   * Determine if two assets should skip relationship detection
   * because they're already properly grouped (e.g., RED metaclips)
   */
  function shouldSkipRelationshipDetection(ref1: MediaReference, ref2: MediaReference): boolean {
    const asset1 = ref1.asset
    const asset2 = ref2.asset
    
    // If both assets are RED clips, they should already be properly grouped
    // Don't merge different RED metaclips together
    if (asset1.format === 'red' && asset2.format === 'red') {
      // RED clips with different base names should remain separate
      if (ref1.fingerprint.baseName !== ref2.fingerprint.baseName) {
        return true
      }
      
      // RED clips with segments should already be complete metaclips
      if (asset1.metadata.segments && asset1.metadata.segments > 1 &&
          asset2.metadata.segments && asset2.metadata.segments > 1) {
        return true
      }
    }
    
    // If assets have the same exact name and format, they're likely duplicates
    // or the same content in different locations - don't merge
    if (asset1.name === asset2.name && asset1.format === asset2.format) {
      return true
    }
    
    // If assets are in completely different project contexts, don't merge
    const path1Parts = asset1.primaryFile.path.split('/')
    const path2Parts = asset2.primaryFile.path.split('/')
    const sharedDepth = path1Parts.findIndex((part, i) => part !== path2Parts[i])
    
    // If they don't share at least 2 levels of hierarchy, probably different projects
    if (sharedDepth < 2) {
      return true
    }
    
    return false
  }
  
  /**
   * Calculate relationship probability between two references
   */
  function calculateRelationshipProbability(ref1: MediaReference, ref2: MediaReference): PotentialRelationship[] {
    const relationships: PotentialRelationship[] = []
    const evidence: RelationshipEvidence[] = []
    const asset1 = ref1.asset
    const asset2 = ref2.asset
    
    // Skip relationship detection for assets that are already properly grouped
    // RED clips with segments should not be split apart
    if (shouldSkipRelationshipDetection(ref1, ref2)) {
      return relationships
    }
    
    // Name similarity - be more aggressive for proxy detection
    const nameSimilarity = calculateNameSimilarity(ref1.fingerprint, ref2.fingerprint)
    const similarityThreshold = (asset1.format === 'red' || asset2.format === 'red') ? 0.7 : 0.2
    
    if (nameSimilarity > similarityThreshold) {
      evidence.push({
        type: 'name_similarity',
        strength: nameSimilarity,
        details: { similarity: nameSimilarity }
      })
    }
    
    // Path proximity
    const pathProximity = calculatePathProximity(ref1.fingerprint, ref2.fingerprint)
    if (pathProximity > 0.5) {
      evidence.push({
        type: 'path_proximity',
        strength: pathProximity,
        details: { proximity: pathProximity }
      })
    }
    
    // Duration match
    if (ref1.fingerprint.duration && ref2.fingerprint.duration) {
      const durationSimilarity = 1 - Math.abs(ref1.fingerprint.duration - ref2.fingerprint.duration) / Math.max(ref1.fingerprint.duration, ref2.fingerprint.duration)
      if (durationSimilarity > 0.8) {
        evidence.push({
          type: 'duration_match',
          strength: durationSimilarity,
          details: { similarity: durationSimilarity }
        })
      }
    }
    
    // Size ratio analysis
    if (ref1.fingerprint.sizeRatio && ref2.fingerprint.sizeRatio) {
      const sizeRatioEvidence = analyzeSizeRatio(ref1.fingerprint.sizeRatio, ref2.fingerprint.sizeRatio)
      if (sizeRatioEvidence.strength > 0.3) {
        evidence.push(sizeRatioEvidence)
      }
    }
    
    // Temporal proximity
    if (ref1.fingerprint.creationTime && ref2.fingerprint.creationTime) {
      const timeDiff = Math.abs(ref1.fingerprint.creationTime.getTime() - ref2.fingerprint.creationTime.getTime())
      const hoursDiff = timeDiff / (1000 * 60 * 60)
      if (hoursDiff < 24) { // Within 24 hours
        const temporalStrength = Math.max(0, 1 - hoursDiff / 24)
        evidence.push({
          type: 'temporal_proximity',
          strength: temporalStrength,
          details: { hoursDiff }
        })
      }
    }
    
    // Require more evidence for already-grouped assets (like RED clips)
    const minEvidenceCount = (asset1.format === 'red' || asset2.format === 'red') ? 3 : 1
    const minConfidenceThreshold = (asset1.format === 'red' || asset2.format === 'red') ? 0.8 : 0.4
    
    // If we have sufficient evidence, determine relationship types
    if (evidence.length >= minEvidenceCount) {
      const overallConfidence = evidence.reduce((sum, e) => sum + e.strength, 0) / evidence.length
      
      // Only create relationships if confidence is high enough
      if (overallConfidence >= minConfidenceThreshold) {
        // Determine relationship type based on evidence
        const relationshipType = determineRelationshipType(ref1, ref2, evidence)
        
        relationships.push({
          targetId: ref2.id,
          type: relationshipType,
          confidence: overallConfidence,
          evidence
        })
      }
    }
    
    return relationships
  }
  
  /**
   * Calculate name similarity using multiple algorithms
   */
  function calculateNameSimilarity(fp1: MediaFingerprint, fp2: MediaFingerprint): number {
    // Base name exact match
    if (fp1.baseName === fp2.baseName) return 1.0
    
    // Check for proxy/source naming patterns with same base
    const name1 = fp1.asset.name.toLowerCase()
    const name2 = fp2.asset.name.toLowerCase()
    
    // Remove file extensions for comparison
    const cleanName1 = name1.replace(/\.[^.]+$/, '')
    const cleanName2 = name2.replace(/\.[^.]+$/, '')
    
    // Check if one is clearly a proxy/offline version of the other
    const proxyPatterns = [
      { from: '_proxy', to: '' },
      { from: '_prx', to: '' },
      { from: '_low', to: '' },
      { from: '_offline', to: '' },
      { from: '_edit', to: '' },
      { from: '_preview', to: '' },
      { from: '_thumb', to: '' },
      { from: '_h264', to: '' },
      { from: '_mp4', to: '' }
    ]
    
    for (const pattern of proxyPatterns) {
      // Check if name1 is proxy version of name2
      if (cleanName1.endsWith(pattern.from) && 
          cleanName1.replace(pattern.from, '') === cleanName2) {
        return 0.95
      }
      // Check if name2 is proxy version of name1
      if (cleanName2.endsWith(pattern.from) && 
          cleanName2.replace(pattern.from, '') === cleanName1) {
        return 0.95
      }
    }
    
    // Check for master/source patterns
    const masterPatterns = [
      { from: '_master', to: '' },
      { from: '_source', to: '' },
      { from: '_original', to: '' },
      { from: '_online', to: '' },
      { from: '_full', to: '' },
      { from: '_hires', to: '' }
    ]
    
    for (const pattern of masterPatterns) {
      if (cleanName1.endsWith(pattern.from) && 
          cleanName1.replace(pattern.from, '') === cleanName2) {
        return 0.95
      }
      if (cleanName2.endsWith(pattern.from) && 
          cleanName2.replace(pattern.from, '') === cleanName1) {
        return 0.95
      }
    }
    
    // Token overlap
    const tokens1 = new Set(fp1.nameTokens)
    const tokens2 = new Set(fp2.nameTokens)
    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)))
    const union = new Set([...tokens1, ...tokens2])
    const jaccardSimilarity = intersection.size / union.size
    
    // Levenshtein distance on base names
    const editDistance = levenshteinDistance(fp1.baseName, fp2.baseName)
    const maxLen = Math.max(fp1.baseName.length, fp2.baseName.length)
    const editSimilarity = 1 - editDistance / maxLen
    
    // Weighted combination
    return jaccardSimilarity * 0.6 + editSimilarity * 0.4
  }
  
  /**
   * Calculate path proximity
   */
  function calculatePathProximity(fp1: MediaFingerprint, fp2: MediaFingerprint): number {
    const common = fp1.folderContext.filter(folder => fp2.folderContext.includes(folder))
    const total = new Set([...fp1.folderContext, ...fp2.folderContext]).size
    return total > 0 ? common.length / total : 0
  }
  
  /**
   * Analyze size ratio to determine relationship type
   */
  function analyzeSizeRatio(ratio1: number, ratio2: number): RelationshipEvidence {
    const ratioRatio = Math.min(ratio1, ratio2) / Math.max(ratio1, ratio2)
    
    // Common proxy ratios
    const proxyRatios = [0.1, 0.2, 0.25, 0.3, 0.5] // Common proxy compression ratios
    const nearestProxyRatio = proxyRatios.reduce((nearest, ratio) => 
      Math.abs(ratioRatio - ratio) < Math.abs(ratioRatio - nearest) ? ratio : nearest
    )
    
    const proxyStrength = 1 - Math.abs(ratioRatio - nearestProxyRatio) / nearestProxyRatio
    
    return {
      type: 'size_ratio',
      strength: Math.max(0, proxyStrength),
      details: { ratio1, ratio2, ratioRatio, nearestProxyRatio }
    }
  }
  
  /**
   * Determine relationship type from evidence
   */
  function determineRelationshipType(ref1: MediaReference, ref2: MediaReference, evidence: RelationshipEvidence[]): PotentialRelationship['type'] {
    const sizeEvidence = evidence.find(e => e.type === 'size_ratio')
    const nameEvidence = evidence.find(e => e.type === 'name_similarity')
    
    const name1 = ref1.asset.name.toLowerCase()
    const name2 = ref2.asset.name.toLowerCase()
    const path1 = ref1.asset.primaryFile.path.toLowerCase()
    const path2 = ref2.asset.primaryFile.path.toLowerCase()
    
    // Check for explicit proxy indicators in name or path
    const proxyIndicators = ['proxy', 'prx', 'low', 'offline', 'edit', 'preview', 'thumb', 'h264', 'mp4']
    const masterIndicators = ['master', 'source', 'original', 'online', 'full', 'hires', 'raw', 'uncompressed']
    
    const ref1HasProxy = proxyIndicators.some(indicator => 
      name1.includes(indicator) || path1.includes(`/${indicator}/`) || path1.includes(`/${indicator}s/`)
    )
    const ref1HasMaster = masterIndicators.some(indicator => 
      name1.includes(indicator) || path1.includes(`/${indicator}/`) || path1.includes(`/${indicator}s/`)
    )
    
    const ref2HasProxy = proxyIndicators.some(indicator => 
      name2.includes(indicator) || path2.includes(`/${indicator}/`) || path2.includes(`/${indicator}s/`)
    )
    const ref2HasMaster = masterIndicators.some(indicator => 
      name2.includes(indicator) || path2.includes(`/${indicator}/`) || path2.includes(`/${indicator}s/`)
    )
    
    // Determine relationship based on clear indicators
    if (ref1HasProxy && !ref2HasProxy) {
      return 'proxy'
    }
    if (ref1HasMaster && !ref2HasMaster) {
      return 'master'
    }
    if (!ref1HasProxy && ref2HasProxy) {
      return 'online' // ref1 is the source, ref2 is proxy
    }
    if (!ref1HasMaster && ref2HasMaster) {
      return 'offline' // ref1 is derived, ref2 is master
    }
    
    // Fall back to size-based determination
    if (sizeEvidence && sizeEvidence.details.ratio1 < sizeEvidence.details.ratio2) {
      // ref1 is smaller, likely proxy/offline
      const tokens = ref1.fingerprint.nameTokens
      if (tokens.some(t => ['proxy', 'prx', 'low', 'preview'].includes(t))) return 'proxy'
      if (tokens.some(t => ['offline', 'edit', 'cut'].includes(t))) return 'offline'
      return 'proxy' // Default for smaller files
    } else if (sizeEvidence && sizeEvidence.details.ratio1 > sizeEvidence.details.ratio2) {
      // ref1 is larger, likely online/master
      const tokens = ref1.fingerprint.nameTokens
      if (tokens.some(t => ['master', 'original', 'source'].includes(t))) return 'master'
      if (tokens.some(t => ['online', 'full', 'hires'].includes(t))) return 'online'
      return 'online' // Default for larger files
    }
    
    // Check file extensions to infer relationship
    const ext1 = ref1.asset.primaryFile.name.split('.').pop()?.toLowerCase() || ''
    const ext2 = ref2.asset.primaryFile.name.split('.').pop()?.toLowerCase() || ''
    
    const proxyExtensions = ['mp4', 'mov', 'avi', 'h264']
    const masterExtensions = ['r3d', 'braw', 'mxf', 'dpx', 'exr']
    
    if (proxyExtensions.includes(ext1) && masterExtensions.includes(ext2)) {
      return 'proxy'
    }
    if (masterExtensions.includes(ext1) && proxyExtensions.includes(ext2)) {
      return 'master'
    }
    
    return 'alternate'
  }
  
  /**
   * Levenshtein distance implementation
   */
  function levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,         // deletion
          matrix[j - 1][i] + 1,         // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }
  
  /**
   * Collapse relationships using waveform function
   */
  function collapseRelationships(references: MediaReference[]): CollapsedGroup[] {
    const groups: CollapsedGroup[] = []
    const processed = new Set<string>()
    
    // Sort by confidence and relationship count
    const sortedRefs = [...references].sort((a, b) => 
      (b.relationships.length * b.confidence) - (a.relationships.length * a.confidence)
    )
    
    for (const ref of sortedRefs) {
      if (processed.has(ref.id)) continue
      
      // Find all related references
      const relatedRefs = new Set<MediaReference>([ref])
      const relationshipMap = new Map<string, string>()
      
      // Breadth-first search for all relationships
      const queue = [ref]
      const visited = new Set<string>([ref.id])
      
      while (queue.length > 0) {
        const current = queue.shift()!
        
        for (const relationship of current.relationships) {
          if (relationship.confidence > 0.5 && !visited.has(relationship.targetId)) {
            const target = references.find(r => r.id === relationship.targetId)
            if (target && !processed.has(target.id)) {
              relatedRefs.add(target)
              relationshipMap.set(target.id, relationship.type)
              visited.add(target.id)
              queue.push(target)
            }
          }
        }
      }
      
      // Mark all as processed
      relatedRefs.forEach(r => processed.add(r.id))
      
      // Determine canonical reference (highest quality/confidence)
      const canonical = Array.from(relatedRefs).reduce((best, current) => {
        const bestScore = (best.fingerprint.sizeRatio || 0) * best.confidence
        const currentScore = (current.fingerprint.sizeRatio || 0) * current.confidence
        return currentScore > bestScore ? current : best
      })
      
      const variants = Array.from(relatedRefs).filter(r => r.id !== canonical.id)
      
      // Calculate group confidence
      const groupConfidence = Array.from(relatedRefs).reduce((sum, r) => sum + r.confidence, 0) / relatedRefs.size
      
      groups.push({
        id: `group_${canonical.id}`,
        baseName: canonical.fingerprint.baseName,
        canonical,
        variants,
        relationships: relationshipMap,
        confidence: groupConfidence
      })
    }
    
    return groups
  }
  
  /**
   * Process all assets and build relationship graph
   */
  function processAssets(assets: MediaAsset[]): void {
    console.log('Processing relationships for', assets.length, 'assets')
    
    // Create fingerprints
    const newReferences: MediaReference[] = assets.map(asset => ({
      id: asset.id,
      asset,
      fingerprint: createFingerprint(asset, assets),
      relationships: [],
      confidence: 1.0 // Base confidence
    }))
    
    // Calculate all pairwise relationships
    for (let i = 0; i < newReferences.length; i++) {
      for (let j = i + 1; j < newReferences.length; j++) {
        const ref1 = newReferences[i]
        const ref2 = newReferences[j]
        
        const relationships1to2 = calculateRelationshipProbability(ref1, ref2)
        const relationships2to1 = calculateRelationshipProbability(ref2, ref1)
        
        ref1.relationships.push(...relationships1to2)
        ref2.relationships.push(...relationships2to1)
      }
    }
    
    // Update confidence based on relationship strength
    newReferences.forEach(ref => {
      const avgRelationshipConfidence = ref.relationships.length > 0 
        ? ref.relationships.reduce((sum, r) => sum + r.confidence, 0) / ref.relationships.length
        : 1.0
      ref.confidence = (ref.confidence + avgRelationshipConfidence) / 2
    })
    
    references.value = newReferences
    
    // Collapse into groups
    collapsedGroups.value = collapseRelationships(newReferences)
    
    console.log('Created', references.value.length, 'references and', collapsedGroups.value.length, 'collapsed groups')
    console.log('Groups:', collapsedGroups.value.map(g => ({
      name: g.baseName,
      variants: g.variants.length + 1,
      confidence: g.confidence.toFixed(2)
    })))
  }
  
  return {
    references,
    collapsedGroups,
    processAssets,
    createFingerprint,
    calculateRelationshipProbability,
    collapseRelationships
  }
}