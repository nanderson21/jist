// RED Camera and Industry Standard Naming Convention Reference

export interface NamingPattern {
  id: string
  name: string
  pattern: RegExp
  segments: NamingSegment[]
  description: string
  examples: string[]
  confidence: number
}

export interface NamingSegment {
  name: string
  position: number
  type: 'reel' | 'camera' | 'card' | 'clip' | 'take' | 'date' | 'time' | 'project' | 'scene' | 'shot' | 'version'
  pattern: string
  description: string
  optional?: boolean
}

export const redNamingPatterns: NamingPattern[] = [
  // Standard RED R3D Naming
  {
    id: 'red-standard',
    name: 'RED Standard R3D',
    pattern: /^([A-Z])(\d{3})_([A-Z])(\d{3})_(\d{8})_(\d{3})\.R3D$/i,
    segments: [
      { name: 'Reel Letter', position: 1, type: 'reel', pattern: '[A-Z]', description: 'Camera reel identifier (A, B, C...)' },
      { name: 'Reel Number', position: 2, type: 'reel', pattern: '\\d{3}', description: 'Sequential reel number (001, 002...)' },
      { name: 'Camera Letter', position: 3, type: 'camera', pattern: '[A-Z]', description: 'Camera unit identifier (A, B, C...)' },
      { name: 'Camera Number', position: 4, type: 'camera', pattern: '\\d{3}', description: 'Camera number (001, 002...)' },
      { name: 'Date', position: 5, type: 'date', pattern: '\\d{8}', description: 'Shoot date YYYYMMDD' },
      { name: 'Clip Number', position: 6, type: 'clip', pattern: '\\d{3}', description: 'Sequential clip number' }
    ],
    description: 'Standard RED camera R3D file naming convention',
    examples: ['A001_C001_20240315_001.R3D', 'B002_A003_20240315_042.R3D'],
    confidence: 0.95
  },

  // Alternative RED Naming
  {
    id: 'red-extended',
    name: 'RED Extended Naming',
    pattern: /^([A-Z]\d{3})_([A-Z]\d{3})_(\d{6})_(\d{4})\.R3D$/i,
    segments: [
      { name: 'Reel ID', position: 1, type: 'reel', pattern: '[A-Z]\\d{3}', description: 'Combined reel identifier' },
      { name: 'Camera ID', position: 2, type: 'camera', pattern: '[A-Z]\\d{3}', description: 'Combined camera identifier' },
      { name: 'Time Code', position: 3, type: 'time', pattern: '\\d{6}', description: 'Time code HHMMSS' },
      { name: 'Frame Number', position: 4, type: 'clip', pattern: '\\d{4}', description: 'Frame or clip number' }
    ],
    description: 'Extended RED naming with timecode',
    examples: ['A001_C001_143022_0001.R3D'],
    confidence: 0.90
  },

  // Custom Project Naming
  {
    id: 'project-scene-take',
    name: 'Project Scene Take',
    pattern: /^(.+)_S(\d+)_T(\d+)_(.+)$/i,
    segments: [
      { name: 'Project Name', position: 1, type: 'project', pattern: '.+', description: 'Project identifier' },
      { name: 'Scene Number', position: 2, type: 'scene', pattern: '\\d+', description: 'Scene number' },
      { name: 'Take Number', position: 3, type: 'take', pattern: '\\d+', description: 'Take number' },
      { name: 'Additional Info', position: 4, type: 'version', pattern: '.+', description: 'Camera, version, or other info' }
    ],
    description: 'Project-based scene and take naming',
    examples: ['EasterService_S001_T003_CamA.mov', 'Wedding2024_S012_T001_Wide.mp4'],
    confidence: 0.85
  },

  // Date-based Naming
  {
    id: 'date-sequence',
    name: 'Date Sequence',
    pattern: /^(\d{4}[-_]\d{2}[-_]\d{2}).*?(\d{3,4})$/i,
    segments: [
      { name: 'Date', position: 1, type: 'date', pattern: '\\d{4}[-_]\\d{2}[-_]\\d{2}', description: 'Shoot date YYYY-MM-DD' },
      { name: 'Sequence', position: 2, type: 'clip', pattern: '\\d{3,4}', description: 'Sequential number' }
    ],
    description: 'Date-based sequential naming',
    examples: ['2024-03-15_EasterService_001.mov', '2024_01_20_Wedding_0042.mp4'],
    confidence: 0.80
  },

  // Camera Card Structure
  {
    id: 'card-structure',
    name: 'Camera Card Structure',
    pattern: /DCIM\/(\d{3}[A-Z]+)\/(.+)/i,
    segments: [
      { name: 'Card Directory', position: 1, type: 'card', pattern: '\\d{3}[A-Z]+', description: 'Camera card directory (100MEDIA, 101CANON, etc.)' },
      { name: 'Filename', position: 2, type: 'clip', pattern: '.+', description: 'Original camera filename' }
    ],
    description: 'Standard camera card directory structure',
    examples: ['DCIM/100MEDIA/IMG_1234.JPG', 'DCIM/101CANON/MVI_5678.MOV'],
    confidence: 0.75
  },

  // Capture Roll Pattern (A001, B001, C001...)
  {
    id: 'capture-roll',
    name: 'Capture Roll Identifier',
    pattern: /.*([A-Z])(\d{3}).*[_-]?.*\.(?:R3D|mov|mp4|avi)$/i,
    segments: [
      { name: 'Roll Letter', position: 1, type: 'reel', pattern: '[A-Z]', description: 'Capture roll letter (A, B, C...)' },
      { name: 'Roll Number', position: 2, type: 'reel', pattern: '\\d{3}', description: 'Roll sequence number (001, 002...)' }
    ],
    description: 'Capture roll naming pattern identifying media cards or reels',
    examples: ['A001_clip.R3D', 'B002_scene1.mov', 'C003_take5.mp4'],
    confidence: 0.88
  },

  // Clip Sequence within Roll (C001, C002, C003...)
  {
    id: 'clip-sequence',
    name: 'Clip Sequence in Roll',
    pattern: /.*[A-Z]\d{3}.*?([C])(\d{3}).*\.(?:R3D|mov|mp4|avi)$/i,
    segments: [
      { name: 'Clip Prefix', position: 1, type: 'clip', pattern: 'C', description: 'Clip identifier prefix' },
      { name: 'Clip Number', position: 2, type: 'clip', pattern: '\\d{3}', description: 'Sequential clip number within roll' }
    ],
    description: 'Sequential clip numbering within a capture roll',
    examples: ['A001_C001_take.R3D', 'B002_C015_scene.mov'],
    confidence: 0.92
  },

  // Timecode Pattern (HHMMSS)
  {
    id: 'timecode-pattern',
    name: 'Timecode Sequence',
    pattern: /.*(\d{2})(\d{2})(\d{2}).*\.(?:R3D|mov|mp4|avi)$/i,
    segments: [
      { name: 'Hours', position: 1, type: 'time', pattern: '\\d{2}', description: 'Timecode hours' },
      { name: 'Minutes', position: 2, type: 'time', pattern: '\\d{2}', description: 'Timecode minutes' },
      { name: 'Seconds', position: 3, type: 'time', pattern: '\\d{2}', description: 'Timecode seconds' }
    ],
    description: 'Timecode-based clip identification',
    examples: ['clip_143022.R3D', 'scene_091545.mov'],
    confidence: 0.85
  },

  // Advanced Format Detection (ISO, Shutter, etc.)
  {
    id: 'technical-metadata',
    name: 'Technical Metadata Pattern',
    pattern: /.*(ISO)(\d+).*?(\d+)fps.*\.(?:R3D|mov|mp4)$/i,
    segments: [
      { name: 'ISO Prefix', position: 1, type: 'technical', pattern: 'ISO', description: 'ISO sensitivity identifier' },
      { name: 'ISO Value', position: 2, type: 'technical', pattern: '\\d+', description: 'ISO sensitivity value' },
      { name: 'Frame Rate', position: 3, type: 'technical', pattern: '\\d+', description: 'Frames per second' }
    ],
    description: 'Technical shooting parameters in filename',
    examples: ['scene_ISO800_24fps.R3D', 'take_ISO1600_60fps.mov'],
    confidence: 0.90
  }
]

export const commonSegmentTypes = {
  project: {
    patterns: [
      /\b(easter|christmas|wedding|concert|sunday|service)\b/i,
      /\b([a-z]+(?:project|prod|show))\b/i,
      /\b(q[1-4]|quarter[1-4])\b/i,
      /\b(commercial|documentary|narrative|corporate)\b/i
    ],
    description: 'Project or event identifier'
  },
  
  camera: {
    patterns: [
      /\b(cam[a-z]?|camera[a-z]?)\b/i,
      /\b([a-z]\d{3})\b/i,
      /\b(wide|close|medium|tight|master|establishing)\b/i,
      /\b(red|arri|canon|sony|blackmagic)\b/i,
      /\b(helium|monstro|komodo|venice|fx[369])\b/i
    ],
    description: 'Camera unit, shot type, or camera model'
  },
  
  captureRoll: {
    patterns: [
      /\b([A-Z])(\d{3})\b/,  // A001, B002, C003 pattern
      /\b(roll|reel|card)[-_]?([A-Z]?\d+)\b/i,
      /\b([A-Z])\d{3}[-_][A-Z]\d{3}\b/,  // A001_C001 pattern
      /\b(mag|magazine)[-_]?(\d+)\b/i
    ],
    description: 'Capture roll, reel, or media card identifier'
  },

  clipSequence: {
    patterns: [
      /\b[A-Z]\d{3}[-_]([C])(\d{3})\b/,  // A001_C001 pattern
      /\b(clip|take|shot)[-_]?(\d{3,4})\b/i,
      /\b([C])(\d{3})[-_]/,  // C001_ pattern
      /[-_](\d{3,4})(?:\.|$)/  // ending with _001 or _0001
    ],
    description: 'Sequential clip numbering within capture media'
  },

  format: {
    patterns: [
      /\b(r3d|braw|arriraw|cdng|prores|dnxh[rd]|h26[45])\b/i,
      /\b(8k|6k|4k|2k|hd|uhd|cinema4k)\b/i,
      /\b(24p|25p|30p|50p|60p|120p|240p)\b/i,
      /\b(\d+fps)\b/i,
      /\b(log|rec709|rec2020|srgb|dci-p3)\b/i,
      /\b(iso\d+|f\d+\.?\d*|t\d+\.?\d*)\b/i
    ],
    description: 'Media format, resolution, frame rate, and technical specs'
  },
  
  status: {
    patterns: [
      /\b(final|approved|ready|draft|wip|review)\b/i,
      /\b(raw|edited|color|mixed|mastered|graded)\b/i,
      /\b(v\d+|version\d+|_v\d+|rev\d+)\b/i,
      /\b(offline|online|conform|finish)\b/i
    ],
    description: 'Production status or workflow stage'
  },
  
  location: {
    patterns: [
      /\b(sanctuary|lobby|stage|exterior|interior)\b/i,
      /\b(room\d+|studio[a-z]?|stage[a-z]?)\b/i,
      /\b(backstage|balcony|floor|booth)\b/i,
      /\b(location|loc)[-_]?(\d+|[a-z]+)\b/i
    ],
    description: 'Shooting location or venue'
  },
  
  technical: {
    patterns: [
      /\b(\d+fps|\d+p|4k|hd|uhd)\b/i,
      /\b(\d+bit|\d+khz|stereo|mono)\b/i,
      /\b(prores|h264|raw|log)\b/i,
      /\b(lut|gamma|colorspace)\b/i,
      /\b(handheld|steadicam|tripod|dolly|crane)\b/i
    ],
    description: 'Technical specifications and equipment'
  },

  temporal: {
    patterns: [
      /\b(\d{4}[-_]\d{2}[-_]\d{2})\b/,  // Date patterns
      /\b(\d{2}:\d{2}:\d{2})\b/,  // Time patterns
      /\b(morning|afternoon|evening|night)\b/i,
      /\b(rehearsal|soundcheck|performance|setup)\b/i
    ],
    description: 'Time-based organization and scheduling'
  }
}

export function analyzeFilename(filename: string): {
  pattern: NamingPattern | null
  segments: { segment: NamingSegment; value: string; confidence: number }[]
  additionalContexts: { type: keyof typeof commonSegmentTypes; value: string; confidence: number }[]
} {
  const result = {
    pattern: null as NamingPattern | null,
    segments: [] as { segment: NamingSegment; value: string; confidence: number }[],
    additionalContexts: [] as { type: keyof typeof commonSegmentTypes; value: string; confidence: number }[]
  }

  // Try to match against known patterns
  for (const pattern of redNamingPatterns) {
    const match = filename.match(pattern.pattern)
    if (match) {
      result.pattern = pattern
      
      pattern.segments.forEach((segment, index) => {
        if (match[index + 1]) {
          result.segments.push({
            segment,
            value: match[index + 1],
            confidence: pattern.confidence
          })
        }
      })
      break
    }
  }

  // Look for additional context patterns
  for (const [type, config] of Object.entries(commonSegmentTypes)) {
    for (const pattern of config.patterns) {
      const match = filename.match(pattern)
      if (match) {
        result.additionalContexts.push({
          type: type as keyof typeof commonSegmentTypes,
          value: match[1] || match[0],
          confidence: 0.7
        })
      }
    }
  }

  return result
}

export function analyzeFolderPath(path: string): {
  segments: { name: string; type: string; confidence: number; level: number }[]
  projectContext: string | null
  shootDate: string | null
} {
  const segments = path.split('/').filter(Boolean)
  const result = {
    segments: [] as { name: string; type: string; confidence: number; level: number }[],
    projectContext: null as string | null,
    shootDate: null as string | null
  }

  segments.forEach((segment, index) => {
    // Check for common folder patterns
    if (/\d{4}[-_]\d{2}[-_]\d{2}/.test(segment)) {
      result.segments.push({
        name: segment,
        type: 'date',
        confidence: 0.9,
        level: index
      })
      result.shootDate = segment
    } else if (/cam|camera/i.test(segment)) {
      result.segments.push({
        name: segment,
        type: 'camera',
        confidence: 0.8,
        level: index
      })
    } else if (/project|prod|show/i.test(segment)) {
      result.segments.push({
        name: segment,
        type: 'project',
        confidence: 0.85,
        level: index
      })
      result.projectContext = segment
    } else if (/roll|reel|card/i.test(segment)) {
      result.segments.push({
        name: segment,
        type: 'roll',
        confidence: 0.8,
        level: index
      })
    } else if (/DCIM|clips?|footage/i.test(segment)) {
      result.segments.push({
        name: segment,
        type: 'media',
        confidence: 0.7,
        level: index
      })
    } else {
      // Generic folder - could be project, location, or other
      result.segments.push({
        name: segment,
        type: 'folder',
        confidence: 0.5,
        level: index
      })
    }
  })

  return result
}

// Advanced NLP Analysis for Capture Roll and Clip Relationships
export function analyzeFileRelationships(files: { name: string; path: string; [key: string]: any }[]): {
  captureRolls: Map<string, { files: any[]; rollId: string; clips: Map<string, any[]> }>
  clipSequences: Map<string, { files: any[]; sequencePattern: string }>
  formatGroups: Map<string, { files: any[]; format: string; specs: string[] }>
  temporalGroups: Map<string, { files: any[]; timeContext: string }>
} {
  const captureRolls = new Map()
  const clipSequences = new Map()
  const formatGroups = new Map()
  const temporalGroups = new Map()

  files.forEach(file => {
    // Analyze capture roll patterns (A001, B002, etc.)
    const rollMatch = file.name.match(/([A-Z])(\d{3})/g)
    if (rollMatch) {
      rollMatch.forEach(match => {
        const rollId = match
        if (!captureRolls.has(rollId)) {
          captureRolls.set(rollId, {
            files: [],
            rollId,
            clips: new Map()
          })
        }
        
        const roll = captureRolls.get(rollId)
        roll.files.push(file)
        
        // Look for clip sequences within this roll (C001, C002, etc.)
        const clipMatch = file.name.match(/[A-Z]\d{3}[-_]?([C])(\d{3})/i)
        if (clipMatch) {
          const clipId = `${clipMatch[1]}${clipMatch[2]}`
          if (!roll.clips.has(clipId)) {
            roll.clips.set(clipId, [])
          }
          roll.clips.get(clipId).push(file)
        }
      })
    }

    // Analyze format and technical patterns
    const formatAnalysis = analyzeFilename(file.name)
    if (formatAnalysis.additionalContexts.length > 0) {
      formatAnalysis.additionalContexts.forEach(context => {
        if (context.type === 'format' || context.type === 'technical') {
          const key = `${context.type}:${context.value}`
          if (!formatGroups.has(key)) {
            formatGroups.set(key, {
              files: [],
              format: context.value,
              specs: []
            })
          }
          formatGroups.get(key).files.push(file)
        }
      })
    }

    // Analyze temporal patterns
    const timeMatch = file.name.match(/(\d{4}[-_]\d{2}[-_]\d{2})|(\d{2}:\d{2}:\d{2})|(\d{6})/)
    if (timeMatch) {
      const timeContext = timeMatch[0]
      if (!temporalGroups.has(timeContext)) {
        temporalGroups.set(timeContext, {
          files: [],
          timeContext
        })
      }
      temporalGroups.get(timeContext).files.push(file)
    }
  })

  return {
    captureRolls,
    clipSequences,
    formatGroups,
    temporalGroups
  }
}

// Intelligent Context Inference using NLP
export function inferContextFromPatterns(segment: string, type: 'folder' | 'filename' | 'pattern', files: any[]): {
  suggestedContext: string
  contextType: keyof typeof commonSegmentTypes
  confidence: number
  reasoning: string[]
} {
  const reasoning: string[] = []
  let suggestedContext = segment
  let contextType: keyof typeof commonSegmentTypes = 'project'
  let confidence = 0.5

  // Analyze against all segment types
  for (const [typeKey, typeConfig] of Object.entries(commonSegmentTypes)) {
    for (const pattern of typeConfig.patterns) {
      const match = segment.match(pattern)
      if (match) {
        reasoning.push(`Matches ${typeKey} pattern: ${pattern.source}`)
        
        // Calculate confidence based on pattern specificity and file count
        let patternConfidence = 0.7
        if (files.length > 10) patternConfidence += 0.1
        if (match[1] && match[1].length > 2) patternConfidence += 0.1
        
        if (patternConfidence > confidence) {
          confidence = patternConfidence
          contextType = typeKey as keyof typeof commonSegmentTypes
          suggestedContext = match[1] || match[0]
        }
      }
    }
  }

  // Special handling for capture roll relationships
  if (segment.match(/[A-Z]\d{3}/)) {
    const rollFiles = files.filter(f => f.name.includes(segment))
    if (rollFiles.length > 5) {
      contextType = 'captureRoll'
      confidence = 0.85
      reasoning.push(`Strong capture roll pattern with ${rollFiles.length} files`)
      
      // Check for clip sequences within this roll
      const clipCount = rollFiles.filter(f => f.name.match(/[C]\d{3}/i)).length
      if (clipCount > 0) {
        confidence = 0.92
        reasoning.push(`Contains ${clipCount} sequential clips`)
      }
    }
  }

  // Format detection enhancement
  const formatTerms = ['r3d', 'braw', 'prores', '4k', '8k', 'log', 'rec709']
  if (formatTerms.some(term => segment.toLowerCase().includes(term))) {
    contextType = 'format'
    confidence = 0.88
    reasoning.push('Contains format-specific terminology')
  }

  // Technical metadata detection
  if (segment.match(/\d+fps|iso\d+|f\d+\.?\d*/i)) {
    contextType = 'technical'
    confidence = 0.90
    reasoning.push('Contains technical shooting parameters')
  }

  return {
    suggestedContext,
    contextType,
    confidence: Math.min(confidence, 0.95), // Cap at 95%
    reasoning
  }
}