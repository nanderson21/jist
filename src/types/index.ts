export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  size?: number
  lastModified?: Date
  selected?: boolean
  flagged?: boolean
  metadata?: FileMetadata
}

export interface FileMetadata {
  mediaInfo?: MediaInfo
  exifData?: ExifData
}

export interface MediaInfo {
  format?: string
  duration?: number
  bitRate?: number
  videoCodec?: string
  audioCodec?: string
  resolution?: string
  frameRate?: number
  [key: string]: any
}

export interface ExifData {
  make?: string
  model?: string
  dateTime?: string
  exposureTime?: string
  fNumber?: number
  iso?: number
  [key: string]: any
}

export interface IngestRule {
  id: string
  name: string
  description?: string
  pathPatterns: PathPattern[]
  variables: CustomVariable[]
  actions: IngestAction[]
  createdAt: Date
  updatedAt: Date
}

export interface PathPattern {
  level: number
  pattern: string
  isRegex?: boolean
  flags: string[]
}

export interface CustomVariable {
  name: string
  source: 'path' | 'metadata' | 'custom'
  extraction?: string
  defaultValue?: string
}

export interface IngestAction {
  type: 'move' | 'copy' | 'rename' | 'transcode' | 'metadata'
  config: Record<string, any>
}