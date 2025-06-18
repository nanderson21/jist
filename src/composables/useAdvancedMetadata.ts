import { ref, computed } from 'vue'
import type { FileNode } from '@/types'

// Import MediaInfo.js types and factory
declare global {
  interface Window {
    MediaInfoLib: any
  }
}

export interface MetadataProperty {
  id: string
  category: 'general' | 'video' | 'audio' | 'image' | 'camera' | 'technical' | 'custom'
  key: string
  value: any
  displayName: string
  description?: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'duration' | 'size' | 'resolution'
  unit?: string
  source: 'mediainfo' | 'filename' | 'filepath' | 'filesystem' | 'exif' | 'estimated'
}

export interface ExtractedMetadata {
  properties: MetadataProperty[]
  technical: {
    duration?: number
    bitrate?: number
    resolution?: string
    frameRate?: number
    codec?: string
    container?: string
    colorSpace?: string
    channels?: number
    sampleRate?: number
  }
  camera: {
    make?: string
    model?: string
    lens?: string
    settings?: Record<string, any>
  }
  production: {
    project?: string
    scene?: string
    take?: string
    timecode?: string
    roll?: string
  }
  file: {
    format: string
    size: number
    created?: Date
    modified?: Date
    checksum?: string
  }
  raw?: any // Raw MediaInfo output for advanced users
}

export interface InspectionRule {
  id: string
  name: string
  description: string
  enabled: boolean
  conditions: InspectionCondition[]
  actions: InspectionAction[]
  priority: number
  triggers: ('scan' | 'select' | 'manual')[]
}

export interface InspectionCondition {
  type: 'file_extension' | 'file_path' | 'metadata_property' | 'file_size' | 'metadata_exists'
  property?: string
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'greater_than' | 'less_than' | 'exists'
  value: any
  caseSensitive?: boolean
}

export interface InspectionAction {
  type: 'extract_metadata' | 'create_hierarchy' | 'set_property' | 'run_script' | 'notify'
  target?: string
  property?: string
  value?: any
  mapping?: Record<string, string>
}

export function useAdvancedMetadata() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const mediaInfoInstance = ref<any>(null)
  const inspectionRules = ref<InspectionRule[]>([])
  
  // Load MediaInfo.js library
  async function loadMediaInfo() {
    if (mediaInfoInstance.value) return mediaInfoInstance.value
    
    try {
      console.log('Loading MediaInfo.js...')
      
      // Dynamic import of MediaInfo.js
      const MediaInfoLib = await import('mediainfo.js')
      console.log('MediaInfo.js module loaded:', MediaInfoLib)
      
      const mediainfo = await MediaInfoLib.default({
        format: 'object',
        chunkSize: 64 * 1024, // 64KB chunks for efficient streaming
        locateFile: (path: string, prefix: string) => {
          console.log('MediaInfo locateFile:', path, prefix)
          // Try multiple CDN sources for reliability
          const sources = [
            `https://unpkg.com/mediainfo.js@0.3.5/dist/${path}`,
            `https://cdn.jsdelivr.net/npm/mediainfo.js@0.3.5/dist/${path}`,
            `/node_modules/mediainfo.js/dist/${path}`
          ]
          return sources[0]
        }
      })
      
      console.log('MediaInfo.js initialized successfully:', mediainfo)
      mediaInfoInstance.value = mediainfo
      return mediainfo
    } catch (err) {
      console.error('Failed to load MediaInfo.js:', err)
      error.value = `MediaInfo.js failed to load: ${err}`
      return null
    }
  }

  // Extract comprehensive metadata from file
  async function extractMetadata(file: FileNode): Promise<ExtractedMetadata> {
    isLoading.value = true
    error.value = null
    
    console.log('Starting metadata extraction for:', file.name, file)
    
    const metadata: ExtractedMetadata = {
      properties: [],
      technical: {},
      camera: {},
      production: {},
      file: {
        format: getFileFormat(file.name),
        size: file.size || 0,
        created: file.lastModified ? new Date(file.lastModified) : undefined,
        modified: file.lastModified ? new Date(file.lastModified) : undefined
      }
    }

    try {
      // First, always extract filename and path metadata
      extractFilenameMetadata(file, metadata)
      extractPathMetadata(file, metadata)
      estimateBasicMetadata(file, metadata)
      
      console.log('Basic metadata extracted, properties:', metadata.properties.length)
      
      // Try MediaInfo.js extraction for supported file types
      const isMediaFile = /\.(mp4|mov|avi|mkv|mxf|r3d|braw|wav|mp3|aif|m4a|flac)$/i.test(file.name)
      
      if (isMediaFile) {
        console.log('Attempting MediaInfo.js extraction...')
        
        const mediaInfo = await loadMediaInfo()
        if (mediaInfo) {
          let fileBlob: File | null = null
          
          // Try different methods to get the file content
          if (file.handle && 'getFile' in file.handle) {
            console.log('Using FileSystemFileHandle...')
            try {
              const fileHandle = file.handle as FileSystemFileHandle
              fileBlob = await fileHandle.getFile()
              console.log('Got file blob from handle:', fileBlob.size, 'bytes')
            } catch (handleError) {
              console.warn('Failed to get file from handle:', handleError)
            }
          }
          
          // Fallback: try using the file directly if it's already a File object
          if (!fileBlob && file.file) {
            console.log('Using direct file object...')
            fileBlob = file.file
          }
          
          if (fileBlob) {
            console.log('Analyzing file with MediaInfo.js...')
            
            try {
              const result = await mediaInfo.analyzeData(
                () => fileBlob!.size,
                (chunkSize: number, offset: number) => {
                  console.log(`Reading chunk: ${offset}-${offset + chunkSize} of ${fileBlob!.size}`)
                  return fileBlob!.slice(offset, offset + chunkSize).arrayBuffer()
                    .then(buffer => new Uint8Array(buffer))
                }
              )
              
              console.log('MediaInfo.js analysis result:', result)
              metadata.raw = result
              
              // Parse MediaInfo output into structured metadata
              if (result?.media?.track) {
                console.log('Parsing MediaInfo tracks:', result.media.track.length)
                for (const track of result.media.track) {
                  parseMediaInfoTrack(track, metadata)
                }
                addProperty(metadata, 'technical', 'mediainfo_status', 'success', 'MediaInfo Status', 'string', 'mediainfo')
              } else {
                console.warn('No tracks found in MediaInfo result')
                addProperty(metadata, 'technical', 'mediainfo_status', 'analyzed_no_tracks', 'MediaInfo Status', 'string', 'mediainfo')
                
                // Try HTML5 fallback if MediaInfo didn't find tracks
                await tryHTML5MediaExtraction(fileBlob, metadata)
              }
            } catch (mediaInfoError) {
              console.warn('MediaInfo.js analysis failed:', mediaInfoError)
              addProperty(metadata, 'technical', 'mediainfo_status', 'analysis_failed', 'MediaInfo Status', 'string', 'mediainfo')
              addProperty(metadata, 'technical', 'mediainfo_error', String(mediaInfoError), 'MediaInfo Error', 'string', 'mediainfo')
              
              // Try HTML5 fallback when MediaInfo fails
              await tryHTML5MediaExtraction(fileBlob, metadata)
            }
          } else {
            console.warn('Could not access file content for MediaInfo analysis')
            addProperty(metadata, 'technical', 'mediainfo_status', 'no_file_access', 'MediaInfo Status', 'string', 'mediainfo')
          }
        } else {
          console.warn('MediaInfo.js not available')
          addProperty(metadata, 'technical', 'mediainfo_status', 'not_available', 'MediaInfo Status', 'string', 'mediainfo')
        }
      } else {
        console.log('File type not supported by MediaInfo.js:', file.name)
        addProperty(metadata, 'technical', 'mediainfo_status', 'unsupported_format', 'MediaInfo Status', 'string', 'mediainfo')
      }
      
      // Apply inspection rules
      applyInspectionRules(file, metadata)
      
      console.log('Metadata extraction completed. Total properties:', metadata.properties.length)
      
    } catch (err) {
      error.value = `Failed to extract metadata: ${err}`
      console.error('Metadata extraction error:', err)
      
      // Even on error, ensure we have some basic properties
      if (metadata.properties.length === 0) {
        addProperty(metadata, 'general', 'extraction_error', String(err), 'Extraction Error', 'string', 'estimated')
      }
    } finally {
      isLoading.value = false
    }
    
    return metadata
  }

  // Parse MediaInfo track data into structured metadata
  function parseMediaInfoTrack(track: any, metadata: ExtractedMetadata) {
    const trackType = track['@type']?.toLowerCase()
    
    // Add all properties as individual metadata properties
    for (const [key, value] of Object.entries(track)) {
      if (key.startsWith('@') || !value) continue
      
      const property: MetadataProperty = {
        id: `${trackType}_${key}`,
        category: getPropertyCategory(trackType, key),
        key: key,
        value: value,
        displayName: formatPropertyName(key),
        type: detectPropertyType(value),
        source: 'mediainfo'
      }
      
      metadata.properties.push(property)
    }
    
    // Map to technical metadata
    if (trackType === 'general') {
      metadata.technical.duration = parseFloat(track.Duration) || undefined
      metadata.technical.bitrate = parseFloat(track.OverallBitRate) || undefined
      metadata.file.format = track.Format || metadata.file.format
    } else if (trackType === 'video') {
      metadata.technical.resolution = `${track.Width}x${track.Height}`
      metadata.technical.frameRate = parseFloat(track.FrameRate) || undefined
      metadata.technical.codec = track.Format || undefined
      metadata.technical.colorSpace = track.ColorSpace || undefined
    } else if (trackType === 'audio') {
      metadata.technical.channels = parseInt(track.Channels) || undefined
      metadata.technical.sampleRate = parseInt(track.SamplingRate) || undefined
    }
    
    // Extract camera information
    if (track.Make || track.Model) {
      metadata.camera.make = track.Make
      metadata.camera.model = track.Model
    }
  }

  // Extract metadata from filename patterns
  function extractFilenameMetadata(file: FileNode, metadata: ExtractedMetadata) {
    const filename = file.name
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
    const extension = filename.split('.').pop()?.toLowerCase() || ''
    
    console.log('Extracting filename metadata from:', filename)
    
    // Add basic file information
    addProperty(metadata, 'general', 'filename', filename, 'Filename', 'string', 'filename')
    addProperty(metadata, 'general', 'name_without_extension', nameWithoutExt, 'Name Without Extension', 'string', 'filename')
    addProperty(metadata, 'general', 'file_extension', extension, 'File Extension', 'string', 'filename')
    
    // RED camera pattern: A001_C001_20240315_001.R3D
    const redPattern = /([A-Z])(\d{3})_([A-Z])(\d{3})_(\d{8})_(\d{3})/
    const redMatch = nameWithoutExt.match(redPattern)
    if (redMatch) {
      addProperty(metadata, 'production', 'red_reel', redMatch[1], 'RED Reel', 'string', 'filename')
      addProperty(metadata, 'production', 'red_reel_number', redMatch[2], 'RED Reel Number', 'string', 'filename')
      addProperty(metadata, 'production', 'red_camera', redMatch[3], 'RED Camera', 'string', 'filename')
      addProperty(metadata, 'production', 'red_camera_number', redMatch[4], 'RED Camera Number', 'string', 'filename')
      addProperty(metadata, 'production', 'red_date', redMatch[5], 'RED Capture Date', 'date', 'filename')
      addProperty(metadata, 'production', 'red_clip_number', redMatch[6], 'RED Clip Number', 'string', 'filename')
      
      metadata.production.roll = `${redMatch[1]}${redMatch[2]}`
      metadata.production.scene = redMatch[5]
      metadata.production.take = redMatch[6]
      
      console.log('Detected RED pattern:', redMatch)
    }
    
    // Blackmagic pattern: BMPCC_20240315_001.braw
    const brawPattern = /([A-Z]+)_?(\d{8})?_?(\d+)\.braw$/i
    const brawMatch = filename.match(brawPattern)
    if (brawMatch) {
      addProperty(metadata, 'camera', 'blackmagic_model', brawMatch[1], 'Blackmagic Model', 'string', 'filename')
      if (brawMatch[2]) {
        addProperty(metadata, 'production', 'capture_date', brawMatch[2], 'Capture Date', 'date', 'filename')
      }
      addProperty(metadata, 'production', 'clip_number', brawMatch[3], 'Clip Number', 'string', 'filename')
      
      console.log('Detected BRAW pattern:', brawMatch)
    }
    
    // Date patterns (various formats)
    const datePatterns = [
      /(\d{4}[-_]\d{2}[-_]\d{2})/,           // 2024-03-15 or 2024_03_15
      /(\d{2}[-_]\d{2}[-_]\d{4})/,           // 15-03-2024 or 15_03_2024
      /(\d{8})/,                             // 20240315
      /(\d{4}\d{2}\d{2})/                    // 20240315
    ]
    
    datePatterns.forEach((pattern, index) => {
      const match = filename.match(pattern)
      if (match) {
        addProperty(metadata, 'general', `date_${index}`, match[1], `Date Pattern ${index + 1}`, 'date', 'filename')
        console.log('Detected date pattern:', match[1])
      }
    })
    
    // Time patterns
    const timePatterns = [
      /(\d{2}[-_:]\d{2}[-_:]\d{2})/,         // 14:30:22 or 14_30_22
      /(\d{6})/                              // 143022
    ]
    
    timePatterns.forEach((pattern, index) => {
      const match = filename.match(pattern)
      if (match) {
        addProperty(metadata, 'general', `time_${index}`, match[1], `Time Pattern ${index + 1}`, 'string', 'filename')
        console.log('Detected time pattern:', match[1])
      }
    })
    
    // Sequence patterns
    const sequencePatterns = [
      /([A-Z]\d{3})/g,                       // A001, B002, C003
      /(\d{3,4})/g,                          // 001, 002, 1234
      /(take|shot|clip)[-_]?(\d+)/gi         // take_1, shot_001, clip_05
    ]
    
    sequencePatterns.forEach((pattern, patternIndex) => {
      const matches = [...filename.matchAll(pattern)]
      matches.forEach((match, index) => {
        const value = match[2] || match[1] // For patterns with capture groups
        addProperty(metadata, 'production', `sequence_${patternIndex}_${index}`, value, `Sequence ${patternIndex + 1}.${index + 1}`, 'string', 'filename')
        console.log('Detected sequence pattern:', value)
      })
    })
    
    // Camera/equipment patterns
    const cameraPatterns = [
      /(red|braw|arri|canon|sony|blackmagic|panasonic)/gi,
      /(helium|monstro|komodo|venice|fx[369]|gh[56]|a7[sr]?)/gi,
      /(cam[a-z]?|camera[a-z]?)/gi
    ]
    
    cameraPatterns.forEach((pattern, index) => {
      const matches = [...filename.matchAll(pattern)]
      matches.forEach((match, matchIndex) => {
        addProperty(metadata, 'camera', `detected_equipment_${index}_${matchIndex}`, match[1], `Equipment ${index + 1}.${matchIndex + 1}`, 'string', 'filename')
        console.log('Detected camera pattern:', match[1])
      })
    })
    
    // Technical patterns
    const technicalPatterns = [
      /(\d+fps)/gi,                          // 24fps, 60fps
      /(\d+p)/gi,                            // 1080p, 4K
      /(4k|8k|hd|uhd)/gi,                    // Resolution indicators
      /(iso\d+)/gi,                          // ISO800, ISO1600
      /(log|rec709|srgb)/gi                  // Color profiles
    ]
    
    technicalPatterns.forEach((pattern, index) => {
      const matches = [...filename.matchAll(pattern)]
      matches.forEach((match, matchIndex) => {
        addProperty(metadata, 'technical', `tech_spec_${index}_${matchIndex}`, match[1], `Technical Spec ${index + 1}.${matchIndex + 1}`, 'string', 'filename')
        console.log('Detected technical pattern:', match[1])
      })
    })
    
    console.log('Filename metadata extraction completed')
  }

  // Extract metadata from file path structure
  function extractPathMetadata(file: FileNode, metadata: ExtractedMetadata) {
    const pathSegments = file.path.split('/').filter(Boolean)
    
    console.log('Extracting path metadata from:', file.path)
    
    // Add full path info
    addProperty(metadata, 'general', 'full_path', file.path, 'Full Path', 'string', 'filepath')
    addProperty(metadata, 'general', 'path_depth', pathSegments.length, 'Path Depth', 'number', 'filepath')
    
    // Add each path segment as a potential metadata property
    pathSegments.forEach((segment, index) => {
      addProperty(metadata, 'general', `path_level_${index}`, segment, `Path Level ${index + 1}`, 'string', 'filepath')
      
      // Analyze each segment for patterns
      if (/\d{4}[-_]\d{2}[-_]\d{2}/.test(segment)) {
        addProperty(metadata, 'general', `path_date_${index}`, segment, `Path Date Level ${index + 1}`, 'date', 'filepath')
      }
      
      if (/project|show|prod/i.test(segment)) {
        addProperty(metadata, 'production', `project_indicator_${index}`, segment, `Project Indicator ${index + 1}`, 'string', 'filepath')
      }
      
      if (/cam|camera/i.test(segment)) {
        addProperty(metadata, 'camera', `camera_indicator_${index}`, segment, `Camera Indicator ${index + 1}`, 'string', 'filepath')
      }
    })
    
    // Detect common production structures
    const productionStructures = [
      { pattern: /RED|R3D/i, system: 'RED Digital Cinema' },
      { pattern: /BRAW|Blackmagic/i, system: 'Blackmagic Design' },
      { pattern: /XDROOT|XDCAM/i, system: 'Sony XDCAM' },
      { pattern: /DCIM/i, system: 'Camera Card' },
      { pattern: /Canon|EOS/i, system: 'Canon' },
      { pattern: /Sony|FX[369]/i, system: 'Sony' },
      { pattern: /ARRI|Alexa/i, system: 'ARRI' }
    ]
    
    productionStructures.forEach(({ pattern, system }) => {
      if (pathSegments.some(s => pattern.test(s))) {
        addProperty(metadata, 'technical', 'camera_system', system, 'Camera System', 'string', 'filepath')
        console.log('Detected camera system:', system)
      }
    })
    
    // Detect folder structure patterns
    const structurePatterns = [
      { pattern: /\d{4}[-_]\d{2}[-_]\d{2}/, type: 'date_organized', description: 'Date-based organization' },
      { pattern: /project|show|prod/i, type: 'project_organized', description: 'Project-based organization' },
      { pattern: /cam[a-z]?|camera/i, type: 'camera_organized', description: 'Camera-based organization' },
      { pattern: /[A-Z]\d{3}/, type: 'roll_organized', description: 'Roll-based organization' }
    ]
    
    structurePatterns.forEach(({ pattern, type, description }) => {
      const matchingSegments = pathSegments.filter(s => pattern.test(s))
      if (matchingSegments.length > 0) {
        addProperty(metadata, 'general', `structure_${type}`, matchingSegments.length, `${description} (${matchingSegments.length} levels)`, 'number', 'filepath')
      }
    })
    
    console.log('Path metadata extraction completed')
  }

  // Estimate basic metadata for unsupported formats
  function estimateBasicMetadata(file: FileNode, metadata: ExtractedMetadata) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const size = file.size || 0
    
    console.log('Estimating basic metadata for:', file.name, 'size:', size, 'ext:', ext)
    
    // Add file system metadata
    addProperty(metadata, 'general', 'file_size', size, 'File Size (bytes)', 'size', 'filesystem')
    addProperty(metadata, 'general', 'file_size_formatted', formatFileSize(size), 'File Size', 'string', 'filesystem')
    
    if (file.lastModified) {
      addProperty(metadata, 'general', 'last_modified', file.lastModified, 'Last Modified', 'date', 'filesystem')
      addProperty(metadata, 'general', 'modification_date', new Date(file.lastModified).toISOString(), 'Modification Date', 'date', 'filesystem')
    }
    
    // Estimate duration based on file size for known formats
    if (['mp4', 'mov', 'avi', 'mkv', 'mxf'].includes(ext || '')) {
      const estimatedBitrate = 50 * 1000000 // 50 Mbps average
      const estimatedDuration = size * 8 / estimatedBitrate
      if (!metadata.technical.duration && size > 0) {
        metadata.technical.duration = estimatedDuration
        addProperty(metadata, 'technical', 'estimated_duration', Math.round(estimatedDuration), 'Estimated Duration (seconds)', 'duration', 'estimated')
        addProperty(metadata, 'technical', 'estimated_bitrate', estimatedBitrate, 'Estimated Bitrate (bps)', 'number', 'estimated')
      }
    }
    
    // Audio file estimations
    if (['mp3', 'wav', 'aif', 'aiff', 'm4a', 'flac'].includes(ext || '')) {
      const estimatedBitrate = 1.4 * 1000000 // 1.4 Mbps average for audio
      const estimatedDuration = size * 8 / estimatedBitrate
      if (!metadata.technical.duration && size > 0) {
        metadata.technical.duration = estimatedDuration
        addProperty(metadata, 'technical', 'estimated_duration', Math.round(estimatedDuration), 'Estimated Duration (seconds)', 'duration', 'estimated')
        addProperty(metadata, 'technical', 'estimated_bitrate', estimatedBitrate, 'Estimated Bitrate (bps)', 'number', 'estimated')
      }
      addProperty(metadata, 'technical', 'media_type', 'audio', 'Media Type', 'string', 'estimated')
    }
    
    // Video file categorization
    if (['mp4', 'mov', 'avi', 'mkv', 'mxf', 'r3d', 'braw'].includes(ext || '')) {
      addProperty(metadata, 'technical', 'media_type', 'video', 'Media Type', 'string', 'estimated')
    }
    
    // Image file categorization
    if (['jpg', 'jpeg', 'png', 'tiff', 'tif', 'cr2', 'cr3', 'nef', 'arw', 'dng'].includes(ext || '')) {
      addProperty(metadata, 'technical', 'media_type', 'image', 'Media Type', 'string', 'estimated')
    }
    
    // Professional format detection
    const professionalFormats = {
      'r3d': { system: 'RED Digital Cinema', codec: 'REDCODE RAW' },
      'braw': { system: 'Blackmagic Design', codec: 'Blackmagic RAW' },
      'mxf': { system: 'Professional Broadcast', codec: 'Various' },
      'arriraw': { system: 'ARRI', codec: 'ARRIRAW' },
      'cdng': { system: 'Adobe/Various', codec: 'CinemaDNG' }
    }
    
    if (ext && professionalFormats[ext]) {
      const format = professionalFormats[ext]
      addProperty(metadata, 'camera', 'camera_system', format.system, 'Camera System', 'string', 'estimated')
      addProperty(metadata, 'technical', 'codec', format.codec, 'Codec', 'string', 'estimated')
      addProperty(metadata, 'technical', 'professional_format', true, 'Professional Format', 'boolean', 'estimated')
    }
    
    // Add file format information
    if (ext) {
      addProperty(metadata, 'technical', 'file_extension', ext, 'File Extension', 'string', 'filesystem')
      addProperty(metadata, 'technical', 'format_category', getFormatCategory(ext), 'Format Category', 'string', 'estimated')
    }
    
    console.log('Basic metadata estimation completed')
  }

  // Try to extract metadata using HTML5 media elements as fallback
  async function tryHTML5MediaExtraction(fileBlob: File, metadata: ExtractedMetadata): Promise<void> {
    return new Promise((resolve) => {
      console.log('Attempting HTML5 media extraction...')
      
      const ext = fileBlob.name.split('.').pop()?.toLowerCase()
      const isVideo = ['mp4', 'mov', 'webm', 'avi'].includes(ext || '')
      const isAudio = ['mp3', 'wav', 'm4a', 'webm'].includes(ext || '')
      
      if (!isVideo && !isAudio) {
        console.log('File type not supported by HTML5 media elements')
        resolve()
        return
      }
      
      const url = URL.createObjectURL(fileBlob)
      const element = isVideo ? document.createElement('video') : document.createElement('audio')
      
      const cleanup = () => {
        URL.revokeObjectURL(url)
        element.remove()
      }
      
      const timeout = setTimeout(() => {
        console.log('HTML5 media extraction timed out')
        cleanup()
        resolve()
      }, 5000) // 5 second timeout
      
      element.addEventListener('loadedmetadata', () => {
        console.log('HTML5 media metadata loaded')
        
        try {
          // Extract duration
          if (element.duration && !isNaN(element.duration) && isFinite(element.duration)) {
            metadata.technical.duration = element.duration
            addProperty(metadata, 'technical', 'html5_duration', element.duration, 'Duration (HTML5)', 'duration', 'html5')
          }
          
          // Extract video-specific metadata
          if (isVideo && 'videoWidth' in element && 'videoHeight' in element) {
            const video = element as HTMLVideoElement
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              const resolution = `${video.videoWidth}x${video.videoHeight}`
              metadata.technical.resolution = resolution
              addProperty(metadata, 'technical', 'html5_resolution', resolution, 'Resolution (HTML5)', 'resolution', 'html5')
              addProperty(metadata, 'technical', 'html5_width', video.videoWidth, 'Width (HTML5)', 'number', 'html5')
              addProperty(metadata, 'technical', 'html5_height', video.videoHeight, 'Height (HTML5)', 'number', 'html5')
            }
          }
          
          // Calculate estimated bitrate
          if (element.duration > 0 && fileBlob.size > 0) {
            const bitrate = (fileBlob.size * 8) / element.duration
            addProperty(metadata, 'technical', 'html5_calculated_bitrate', Math.round(bitrate), 'Calculated Bitrate (HTML5)', 'number', 'html5')
          }
          
          addProperty(metadata, 'technical', 'html5_extraction_success', true, 'HTML5 Extraction Success', 'boolean', 'html5')
          
        } catch (error) {
          console.warn('Error extracting HTML5 metadata:', error)
          addProperty(metadata, 'technical', 'html5_extraction_error', String(error), 'HTML5 Extraction Error', 'string', 'html5')
        }
        
        clearTimeout(timeout)
        cleanup()
        resolve()
      })
      
      element.addEventListener('error', (error) => {
        console.warn('HTML5 media element error:', error)
        addProperty(metadata, 'technical', 'html5_extraction_failed', true, 'HTML5 Extraction Failed', 'boolean', 'html5')
        clearTimeout(timeout)
        cleanup()
        resolve()
      })
      
      // Mute and hide the element
      element.muted = true
      element.style.display = 'none'
      document.body.appendChild(element)
      
      // Start loading
      element.src = url
      element.load()
    })
  }

  // Helper function to categorize file formats
  function getFormatCategory(ext: string): string {
    const categories = {
      video: ['mp4', 'mov', 'avi', 'mkv', 'mxf', 'webm', 'm4v'],
      audio: ['mp3', 'wav', 'aif', 'aiff', 'm4a', 'flac', 'ogg'],
      image: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'gif', 'bmp', 'webp'],
      raw_video: ['r3d', 'braw', 'arriraw', 'cdng'],
      raw_image: ['cr2', 'cr3', 'nef', 'arw', 'dng', 'raf', 'orf'],
      archive: ['zip', '7z', 'rar', 'tar', 'gz'],
      document: ['pdf', 'doc', 'docx', 'txt', 'rtf']
    }
    
    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.includes(ext)) {
        return category
      }
    }
    
    return 'unknown'
  }

  // Helper function to format file size
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Apply inspection rules to extract additional metadata
  function applyInspectionRules(file: FileNode, metadata: ExtractedMetadata) {
    for (const rule of inspectionRules.value) {
      if (!rule.enabled || !rule.triggers.includes('scan')) continue
      
      const matchesConditions = rule.conditions.every(condition => 
        evaluateCondition(condition, file, metadata)
      )
      
      if (matchesConditions) {
        for (const action of rule.actions) {
          executeAction(action, file, metadata)
        }
      }
    }
  }

  // Helper function to add metadata property
  function addProperty(
    metadata: ExtractedMetadata, 
    category: MetadataProperty['category'], 
    key: string, 
    value: any, 
    displayName: string, 
    type: MetadataProperty['type'], 
    source: MetadataProperty['source']
  ) {
    metadata.properties.push({
      id: `${category}_${key}`,
      category,
      key,
      value,
      displayName,
      type,
      source
    })
  }

  // Helper functions
  function getFileFormat(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    const formats: Record<string, string> = {
      'r3d': 'RED R3D',
      'braw': 'Blackmagic RAW',
      'mp4': 'MPEG-4',
      'mov': 'QuickTime',
      'mxf': 'Material Exchange Format',
      'avi': 'Audio Video Interleave',
      'mkv': 'Matroska Video'
    }
    return formats[ext || ''] || ext?.toUpperCase() || 'Unknown'
  }

  function getPropertyCategory(trackType: string, key: string): MetadataProperty['category'] {
    if (['make', 'model', 'lens'].some(k => key.toLowerCase().includes(k))) return 'camera'
    if (['project', 'scene', 'take', 'roll'].some(k => key.toLowerCase().includes(k))) return 'production'
    if (trackType === 'video' || trackType === 'audio') return 'technical'
    if (trackType === 'image') return 'image'
    return 'general'
  }

  function formatPropertyName(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
  }

  function detectPropertyType(value: any): MetadataProperty['type'] {
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
      if (/^\d+x\d+$/.test(value)) return 'resolution'
      if (/^\d+:\d+:\d+/.test(value)) return 'duration'
      if (/^\d+\s*(KB|MB|GB|TB)$/i.test(value)) return 'size'
    }
    return 'string'
  }

  function evaluateCondition(condition: InspectionCondition, file: FileNode, metadata: ExtractedMetadata): boolean {
    switch (condition.type) {
      case 'file_extension':
        const ext = file.name.split('.').pop()?.toLowerCase()
        return ext === condition.value.toLowerCase()
      
      case 'file_path':
        const path = condition.caseSensitive ? file.path : file.path.toLowerCase()
        const value = condition.caseSensitive ? condition.value : condition.value.toLowerCase()
        
        switch (condition.operator) {
          case 'contains': return path.includes(value)
          case 'starts_with': return path.startsWith(value)
          case 'ends_with': return path.endsWith(value)
          case 'regex': return new RegExp(condition.value).test(file.path)
          default: return path === value
        }
      
      case 'metadata_property':
        const prop = metadata.properties.find(p => p.key === condition.property)
        if (!prop) return false
        
        switch (condition.operator) {
          case 'exists': return true
          case 'equals': return prop.value === condition.value
          case 'contains': return String(prop.value).includes(String(condition.value))
          case 'greater_than': return Number(prop.value) > Number(condition.value)
          case 'less_than': return Number(prop.value) < Number(condition.value)
          default: return false
        }
      
      default:
        return false
    }
  }

  function executeAction(action: InspectionAction, file: FileNode, metadata: ExtractedMetadata) {
    switch (action.type) {
      case 'set_property':
        if (action.property && action.value) {
          addProperty(metadata, 'custom', action.property, action.value, action.property, 'string', 'custom')
        }
        break
      
      case 'extract_metadata':
        // Additional custom extraction logic could go here
        break
    }
  }

  // Add inspection rule
  function addInspectionRule(rule: InspectionRule) {
    inspectionRules.value.push(rule)
  }

  // Remove inspection rule
  function removeInspectionRule(ruleId: string) {
    const index = inspectionRules.value.findIndex(r => r.id === ruleId)
    if (index >= 0) {
      inspectionRules.value.splice(index, 1)
    }
  }

  return {
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    inspectionRules: computed(() => inspectionRules.value),
    extractMetadata,
    addInspectionRule,
    removeInspectionRule,
    loadMediaInfo
  }
}