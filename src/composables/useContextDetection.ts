import { ref, computed } from 'vue'
import type { FileNode } from '@/types'

export interface DetectedContext {
  id: string
  name: string
  type: 'project' | 'status' | 'category' | 'format' | 'temporal' | 'semantic' | 'technical'
  confidence: number
  files: FileNode[]
  pattern: string
  description: string
  hierarchy: string[]
  tags: string[]
  crossReferences: string[]
}

export interface ContextObservation {
  id: string
  title: string
  description: string
  context: DetectedContext
  relatedContexts: DetectedContext[]
  suggestedActions: string[]
  confidence: number
  createdAt: Date
}

export interface FileContextProfile {
  file: FileNode
  contexts: DetectedContext[]
  primaryContext: DetectedContext | null
  tags: string[]
  hierarchy: string[]
  relationships: {
    siblings: FileNode[]
    variants: FileNode[]
    dependencies: FileNode[]
  }
}

const detectedContexts = ref<DetectedContext[]>([])
const contextObservations = ref<ContextObservation[]>([])
const fileProfiles = ref<Map<string, FileContextProfile>>(new Map())

export function useContextDetection() {
  
  // Context detection patterns
  const contextPatterns = {
    // Project patterns
    project: [
      { pattern: /(\w+)_service|(\w+)_project|(\w+)_event/i, type: 'project' },
      { pattern: /\b(easter|christmas|wedding|concert|sunday)\b/i, type: 'project' },
      { pattern: /\b(q[1-4]|quarter_[1-4]|fy\d{4})\b/i, type: 'project' }
    ],
    
    // Status patterns
    status: [
      { pattern: /\b(final|approved|ready|draft|wip|review)\b/i, type: 'status' },
      { pattern: /\b(mixed|mastered|edited|raw|unprocessed)\b/i, type: 'status' },
      { pattern: /\b(published|archived|delivered|pending)\b/i, type: 'status' }
    ],
    
    // Category patterns
    category: [
      { pattern: /\b(vocal|lead|backing|harmony|choir)\b/i, type: 'category' },
      { pattern: /\b(instruments|drums|bass|guitar|piano|keys)\b/i, type: 'category' },
      { pattern: /\b(wide|close|medium|detail|establishing)\b/i, type: 'category' },
      { pattern: /\b(interior|exterior|stage|sanctuary|lobby)\b/i, type: 'category' }
    ],
    
    // Format patterns
    format: [
      { pattern: /\b(stereo|mono|5\.1|surround)\b/i, type: 'format' },
      { pattern: /\b(4k|hd|uhd|1080p|720p)\b/i, type: 'format' },
      { pattern: /\b(raw|jpeg|tiff|png|r3d|mov|mp4)\b/i, type: 'format' }
    ],
    
    // Technical patterns
    technical: [
      { pattern: /\b(\d+hz|\d+khz|48khz|44\.1khz)\b/i, type: 'technical' },
      { pattern: /\b(\d+bit|16bit|24bit|32bit)\b/i, type: 'technical' },
      { pattern: /\b(\d+fps|23\.98|24|25|29\.97|30|50|59\.94|60)\b/i, type: 'technical' },
      { pattern: /\b(canon|sony|red|arri|blackmagic)\b/i, type: 'technical' }
    ],
    
    // Temporal patterns
    temporal: [
      { pattern: /\b(\d{4}[-_]\d{2}[-_]\d{2})\b/i, type: 'temporal' },
      { pattern: /\b(morning|afternoon|evening|night)\b/i, type: 'temporal' },
      { pattern: /\b(pre|post|during|after|before)\b/i, type: 'temporal' }
    ],
    
    // Semantic patterns
    semantic: [
      { pattern: /\b(people|crowd|congregation|audience)\b/i, type: 'semantic' },
      { pattern: /\b(worship|prayer|sermon|music|song)\b/i, type: 'semantic' },
      { pattern: /\b(celebration|ceremony|ritual|service)\b/i, type: 'semantic' }
    ]
  }

  function analyzeFileForContexts(file: FileNode): DetectedContext[] {
    const contexts: DetectedContext[] = []
    const fullPath = file.path + '/' + file.name
    const textToAnalyze = fullPath.toLowerCase()
    
    // Skip very short or common terms
    const skipTerms = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'since', 'without', 'near'])
    
    for (const [categoryName, patterns] of Object.entries(contextPatterns)) {
      for (const patternDef of patterns) {
        const matches = textToAnalyze.match(patternDef.pattern)
        if (matches) {
          const contextName = (matches[1] || matches[2] || matches[0]).trim()
          
          // Skip if too short, common word, or mostly numbers
          if (contextName.length < 2 || 
              skipTerms.has(contextName) || 
              /^\d+$/.test(contextName)) {
            continue
          }
          
          const existingContext = contexts.find(c => c.name.toLowerCase() === contextName.toLowerCase())
          
          if (!existingContext) {
            const confidence = calculateConfidence(matches, textToAnalyze)
            
            // Only create contexts with reasonable confidence
            if (confidence >= 0.3) {
              contexts.push({
                id: `${patternDef.type}-${contextName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: contextName,
                type: patternDef.type as any,
                confidence,
                files: [file],
                pattern: patternDef.pattern.source,
                description: generateContextDescription(contextName, patternDef.type, categoryName),
                hierarchy: generateHierarchy(file, contextName, patternDef.type),
                tags: extractTags(textToAnalyze, contextName),
                crossReferences: []
              })
            }
          }
        }
      }
    }
    
    return contexts
  }

  function processFilesBatch(files: FileNode[]) {
    const contextMap = new Map<string, DetectedContext>()
    const newObservations: ContextObservation[] = []
    
    // Analyze each file
    files.forEach(file => {
      const fileContexts = analyzeFileForContexts(file)
      
      // Update file profile
      const profile: FileContextProfile = {
        file,
        contexts: fileContexts,
        primaryContext: fileContexts.length > 0 ? fileContexts[0] : null,
        tags: extractAllTags(file),
        hierarchy: generateFileHierarchy(file),
        relationships: {
          siblings: [],
          variants: [],
          dependencies: []
        }
      }
      
      fileProfiles.value.set(file.path + '/' + file.name, profile)
      
      // Merge contexts with proper deduplication
      fileContexts.forEach(context => {
        const contextKey = `${context.type}:${context.name.toLowerCase()}`
        const existing = contextMap.get(contextKey)
        
        if (existing) {
          // Add file if not already present
          if (!existing.files.some(f => f.path === file.path && f.name === file.name)) {
            existing.files.push(file)
          }
          // Update confidence to highest value
          existing.confidence = Math.max(existing.confidence, context.confidence)
          // Merge tags
          existing.tags = [...new Set([...existing.tags, ...context.tags])]
          // Merge cross-references
          existing.crossReferences = [...new Set([...existing.crossReferences, ...context.crossReferences])]
        } else {
          contextMap.set(contextKey, { ...context })
        }
      })
    })
    
    const newContexts = Array.from(contextMap.values())
    
    // Merge with existing contexts to avoid global duplicates
    newContexts.forEach(newContext => {
      const contextKey = `${newContext.type}:${newContext.name.toLowerCase()}`
      const existingGlobal = detectedContexts.value.find(c => 
        `${c.type}:${c.name.toLowerCase()}` === contextKey
      )
      
      if (existingGlobal) {
        // Merge files
        newContext.files.forEach(file => {
          if (!existingGlobal.files.some(f => f.path === file.path && f.name === file.name)) {
            existingGlobal.files.push(file)
          }
        })
        // Update confidence
        existingGlobal.confidence = Math.max(existingGlobal.confidence, newContext.confidence)
        // Merge tags
        existingGlobal.tags = [...new Set([...existingGlobal.tags, ...newContext.tags])]
      } else {
        detectedContexts.value.push(newContext)
      }
    })
    
    // Detect cross-context relationships from all contexts
    const relationships = detectContextRelationships(Array.from(contextMap.values()))
    
    // Generate observations (avoid duplicates)
    relationships.forEach(relationship => {
      const existingObs = contextObservations.value.find(obs => 
        obs.title === relationship.title && 
        obs.context.id === relationship.primaryContext.id
      )
      
      if (!existingObs) {
        const observation: ContextObservation = {
          id: `obs-${Date.now()}-${Math.random()}`,
          title: relationship.title,
          description: relationship.description,
          context: relationship.primaryContext,
          relatedContexts: relationship.relatedContexts,
          suggestedActions: relationship.suggestedActions,
          confidence: relationship.confidence,
          createdAt: new Date()
        }
        newObservations.push(observation)
      }
    })
    
    // Update observations
    contextObservations.value = [...contextObservations.value, ...newObservations]
    
    return {
      contexts: newContexts,
      observations: newObservations
    }
  }

  function detectContextRelationships(contexts: DetectedContext[]) {
    const relationships: any[] = []
    
    // Group contexts by type
    const contextsByType = contexts.reduce((acc, context) => {
      if (!acc[context.type]) acc[context.type] = []
      acc[context.type].push(context)
      return acc
    }, {} as Record<string, DetectedContext[]>)
    
    // Detect project-wide patterns
    if (contextsByType.project && contextsByType.status) {
      const projectContext = contextsByType.project[0]
      const statusContexts = contextsByType.status
      
      relationships.push({
        title: `${projectContext.name} Production Pipeline`,
        description: `Detected ${statusContexts.length} production stages for ${projectContext.name} project`,
        primaryContext: projectContext,
        relatedContexts: statusContexts,
        suggestedActions: [
          'Create production timeline view',
          'Set up approval workflow',
          'Configure status-based filters'
        ],
        confidence: 0.85
      })
    }
    
    // Detect format families
    if (contextsByType.format && contextsByType.technical) {
      const formatContexts = contextsByType.format
      const technicalContexts = contextsByType.technical
      
      relationships.push({
        title: 'Technical Format Standards',
        description: `Consistent technical specs across ${formatContexts.length} format types`,
        primaryContext: formatContexts[0],
        relatedContexts: technicalContexts,
        suggestedActions: [
          'Create technical specification views',
          'Set up quality control rules',
          'Generate format compatibility matrix'
        ],
        confidence: 0.75
      })
    }
    
    // Detect content themes
    if (contextsByType.semantic && contextsByType.category) {
      const semanticContexts = contextsByType.semantic
      const categoryContexts = contextsByType.category
      
      relationships.push({
        title: 'Content Thematic Structure',
        description: `Identified ${semanticContexts.length} content themes across ${categoryContexts.length} categories`,
        primaryContext: semanticContexts[0],
        relatedContexts: categoryContexts,
        suggestedActions: [
          'Create thematic content views',
          'Set up content type hierarchies',
          'Configure semantic search filters'
        ],
        confidence: 0.70
      })
    }
    
    return relationships
  }

  function calculateConfidence(matches: RegExpMatchArray, text: string): number {
    let confidence = 0.5
    
    // Higher confidence for exact matches
    if (matches[0] === matches.input) confidence += 0.2
    
    // Higher confidence for multiple occurrences
    const occurrences = (text.match(new RegExp(matches[0], 'gi')) || []).length
    confidence += Math.min(occurrences * 0.1, 0.3)
    
    // Higher confidence for position in filename vs deep in path
    const position = text.indexOf(matches[0].toLowerCase())
    const pathLength = text.length
    if (position > pathLength * 0.7) confidence += 0.1
    
    return Math.min(confidence, 1.0)
  }

  function generateContextDescription(name: string, type: string, category: string): string {
    const descriptions = {
      project: `Project identifier: ${name}`,
      status: `Production status: ${name}`,
      category: `Content category: ${name}`,
      format: `Media format: ${name}`,
      temporal: `Time reference: ${name}`,
      semantic: `Content theme: ${name}`,
      technical: `Technical specification: ${name}`
    }
    
    return descriptions[type] || `${category}: ${name}`
  }

  function generateHierarchy(file: FileNode, contextName: string, type: string): string[] {
    const pathParts = file.path.split('/').filter(part => part)
    const hierarchy = [...pathParts]
    
    // Add context-specific hierarchy levels
    if (type === 'project') {
      hierarchy.unshift('Projects')
    } else if (type === 'status') {
      hierarchy.unshift('Production Pipeline')
    } else if (type === 'category') {
      hierarchy.unshift('Content Categories')
    }
    
    hierarchy.push(contextName)
    return hierarchy
  }

  function generateFileHierarchy(file: FileNode): string[] {
    const pathParts = file.path.split('/').filter(part => part)
    return ['Root', ...pathParts, file.name]
  }

  function extractTags(text: string, contextName: string): string[] {
    const tags: string[] = [contextName]
    
    // Extract additional descriptive terms near the context
    const words = text.split(/[\s_\-\.]+/)
    const contextIndex = words.findIndex(word => word.toLowerCase().includes(contextName.toLowerCase()))
    
    if (contextIndex >= 0) {
      // Add surrounding words as potential tags
      for (let i = Math.max(0, contextIndex - 2); i <= Math.min(words.length - 1, contextIndex + 2); i++) {
        const word = words[i]
        if (word && word.length > 2 && !tags.includes(word)) {
          tags.push(word)
        }
      }
    }
    
    return tags.slice(0, 5) // Limit to 5 tags
  }

  function extractAllTags(file: FileNode): string[] {
    const fullText = (file.path + '/' + file.name).toLowerCase()
    const words = fullText.split(/[\s_\-\.]+/)
    
    return words
      .filter(word => word.length > 2)
      .filter(word => !/^\d+$/.test(word)) // Exclude pure numbers
      .slice(0, 10)
  }

  // Computed properties for easy access
  const contextsByType = computed(() => {
    return detectedContexts.value.reduce((acc, context) => {
      if (!acc[context.type]) acc[context.type] = []
      acc[context.type].push(context)
      return acc
    }, {} as Record<string, DetectedContext[]>)
  })

  const recentObservations = computed(() => {
    return contextObservations.value
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
  })

  const filesByContext = computed(() => {
    return detectedContexts.value.reduce((acc, context) => {
      acc[context.id] = context.files
      return acc
    }, {} as Record<string, FileNode[]>)
  })

  function getFileProfile(file: FileNode): FileContextProfile | null {
    return fileProfiles.value.get(file.path + '/' + file.name) || null
  }

  function getContextsForFolder(folderPath: string): DetectedContext[] {
    return detectedContexts.value.filter(context => 
      context.files.some(file => file.path.startsWith(folderPath))
    )
  }

  function clearContexts() {
    detectedContexts.value = []
    contextObservations.value = []
    fileProfiles.value.clear()
  }

  function deduplicateExistingContexts() {
    const contextMap = new Map<string, DetectedContext>()
    
    // Group contexts by type:name key
    detectedContexts.value.forEach(context => {
      const key = `${context.type}:${context.name.toLowerCase()}`
      const existing = contextMap.get(key)
      
      if (existing) {
        // Merge files
        context.files.forEach(file => {
          if (!existing.files.some(f => f.path === file.path && f.name === file.name)) {
            existing.files.push(file)
          }
        })
        // Take highest confidence
        existing.confidence = Math.max(existing.confidence, context.confidence)
        // Merge tags
        existing.tags = [...new Set([...existing.tags, ...context.tags])]
        // Merge cross-references
        existing.crossReferences = [...new Set([...existing.crossReferences, ...context.crossReferences])]
      } else {
        contextMap.set(key, { ...context })
      }
    })
    
    // Replace with deduplicated contexts
    detectedContexts.value = Array.from(contextMap.values())
    
    // Also deduplicate observations
    const observationMap = new Map<string, ContextObservation>()
    contextObservations.value.forEach(obs => {
      const key = `${obs.title}:${obs.context.type}:${obs.context.name.toLowerCase()}`
      if (!observationMap.has(key)) {
        observationMap.set(key, obs)
      }
    })
    contextObservations.value = Array.from(observationMap.values())
    
    return {
      removedContexts: detectedContexts.value.length - contextMap.size,
      removedObservations: contextObservations.value.length - observationMap.size
    }
  }

  return {
    // State
    detectedContexts: computed(() => detectedContexts.value),
    contextObservations: computed(() => contextObservations.value),
    contextsByType,
    recentObservations,
    filesByContext,
    
    // Methods
    processFilesBatch,
    analyzeFileForContexts,
    getFileProfile,
    getContextsForFolder,
    clearContexts,
    deduplicateExistingContexts,
    
    // Utility functions
    detectContextRelationships,
    calculateConfidence
  }
}