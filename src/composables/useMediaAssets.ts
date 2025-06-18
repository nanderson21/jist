import type { FileNode } from '@/types'
import { useMediaMetadata, type ExtendedMetadata } from './useMediaMetadata'

export interface MediaAsset {
  id: string
  name: string
  type: 'clip' | 'sequence' | 'still'
  format: 'red' | 'braw' | 'canon' | 'sony' | 'standard'
  primaryFile: FileNode
  relatedFiles: FileNode[]
  metadata: ExtendedMetadata
  thumbnail?: string
  spriteUrl?: string
  spriteRows?: number
  spriteColumns?: number
}

export interface AssetGroup {
  id: string
  name: string
  assets: MediaAsset[]
  totalSize: number
  fileCount: number
}

// Professional camera format patterns
const CAMERA_PATTERNS = {
  red: {
    clips: /\.rdc$/i,
    metadata: /\.rdm$/i,
    chunks: /_\d{3}\.r3d$/i,
    sidecars: /\.rmd$/i
  },
  braw: {
    clips: /\.braw$/i
  },
  canon: {
    clips: /\.(mxf|mp4|mov)$/i,
    metadata: /\.xml$/i,
    sidecars: /\.(cif|cpf)$/i
  },
  sony: {
    clips: /\.(mxf|mp4|mov)$/i,
    metadata: /\.(xml|bim|ppm)$/i,
    structure: /^XDROOT[\/\\]CLIP[\/\\]/i
  }
}

export function useMediaAssets() {
  const { extractMetadata } = useMediaMetadata()
  
  function detectCameraFormat(files: FileNode[]): string {
    const filePaths = files.map(f => f.path.toLowerCase())
    const fileNames = files.map(f => f.name.toLowerCase())
    
    // Check for Sony XDROOT structure
    if (filePaths.some(path => CAMERA_PATTERNS.sony.structure.test(path))) {
      return 'sony'
    }
    
    // Check for RED files
    if (fileNames.some(name => CAMERA_PATTERNS.red.clips.test(name) || 
                             CAMERA_PATTERNS.red.chunks.test(name))) {
      return 'red'
    }
    
    // Check for BRAW files
    if (fileNames.some(name => CAMERA_PATTERNS.braw.clips.test(name))) {
      return 'braw'
    }
    
    // Check for Canon files with XML sidecars
    const hasMXF = fileNames.some(name => /\.mxf$/i.test(name))
    const hasXML = fileNames.some(name => /\.xml$/i.test(name))
    if (hasMXF && hasXML) {
      return 'canon'
    }
    
    return 'standard'
  }

  function groupREDAssets(files: FileNode[]): MediaAsset[] {
    const assets: MediaAsset[] = []
    const processedFiles = new Set<string>()
    
    // Debug: Check what RED files we have
    const redFiles = files.filter(f => 
      /\.(r3d|rdc|rdm|rmd)$/i.test(f.name)
    )
    console.log('RED files found:', {
      total: redFiles.length,
      types: redFiles.reduce((acc, f) => {
        const ext = f.name.split('.').pop()?.toLowerCase()
        acc[ext || 'unknown'] = (acc[ext || 'unknown'] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    })
    
    // Find all R3D files and group them into metaclips
    const r3dFiles = files.filter(f => /\.r3d$/i.test(f.name))
    console.log('R3D files found:', r3dFiles.length)
    
    // Group R3D files by their base name (everything before _001, _002, etc.)
    const metaclipGroups = new Map<string, FileNode[]>()
    
    for (const r3dFile of r3dFiles) {
      if (processedFiles.has(r3dFile.path)) continue
      
      // Extract base name from R3D file
      // Format: clipname_001.R3D, clipname_002.R3D, etc.
      const match = r3dFile.name.match(/^(.+?)_(\d{3})\.r3d$/i)
      if (!match) {
        // Single R3D file without segments
        const baseName = r3dFile.name.replace(/\.r3d$/i, '')
        if (!metaclipGroups.has(baseName)) {
          metaclipGroups.set(baseName, [])
        }
        metaclipGroups.get(baseName)!.push(r3dFile)
        continue
      }
      
      const [, baseName, segmentNum] = match
      
      if (!metaclipGroups.has(baseName)) {
        metaclipGroups.set(baseName, [])
      }
      metaclipGroups.get(baseName)!.push(r3dFile)
    }
    
    console.log('Metaclip groups found:', metaclipGroups.size)
    
    // Create assets for each metaclip
    for (const [clipName, r3dSegments] of metaclipGroups) {
      // Sort segments by number
      r3dSegments.sort((a, b) => {
        const aMatch = a.name.match(/_(\d{3})\.r3d$/i)
        const bMatch = b.name.match(/_(\d{3})\.r3d$/i)
        const aNum = aMatch ? parseInt(aMatch[1]) : 0
        const bNum = bMatch ? parseInt(bMatch[1]) : 0
        return aNum - bNum
      })
      
      const primaryFile = r3dSegments[0] // First segment is primary
      const relatedFiles: FileNode[] = [...r3dSegments]
      
      // Look for RDC folder metadata
      const clipDir = primaryFile.path.substring(0, primaryFile.path.lastIndexOf('/'))
      const rdcFiles = files.filter(f => 
        f.path.startsWith(clipDir) && /\.rdc$/i.test(f.name) &&
        f.name.replace(/\.rdc$/i, '') === clipName
      )
      
      // Look for sidecar metadata files (.RMD, .RDM)
      const sidecarFiles = files.filter(f => {
        const sameDir = f.path.substring(0, f.path.lastIndexOf('/')) === clipDir
        const nameMatch = f.name.replace(/\.(rmd|rdm)$/i, '') === clipName
        return sameDir && nameMatch && /\.(rmd|rdm)$/i.test(f.name)
      })
      
      relatedFiles.push(...rdcFiles, ...sidecarFiles)
      
      // Look for RDM folder (Capture Roll) metadata
      const parentDir = clipDir.substring(0, clipDir.lastIndexOf('/'))
      const rdmFiles = files.filter(f => 
        f.path.startsWith(parentDir) && /\.rdm$/i.test(f.name)
      )
      
      relatedFiles.push(...rdmFiles)
      
      // Mark all related files as processed
      relatedFiles.forEach(f => processedFiles.add(f.path))
      
      // Extract metadata from path structure and filenames
      const captureRoll = extractCaptureRollFromPath(primaryFile.path) || 
                         extractCaptureRollFromFilename(clipName)
      
      const asset: MediaAsset = {
        id: `red_metaclip_${clipName}_${Date.now()}`,
        name: clipName,
        type: 'clip',
        format: 'red',
        primaryFile: primaryFile,
        relatedFiles,
        metadata: {
          codec: 'REDCODE',
          frameRate: extractREDFrameRate(primaryFile.name),
          segments: r3dSegments.length,
          captureRoll: captureRoll,
          totalSize: relatedFiles.reduce((sum, f) => sum + (f.size || 0), 0)
        }
      }
      
      assets.push(asset)
    }
    
    console.log('RED metaclip assets created:', {
      totalAssets: assets.length,
      exampleAssets: assets.slice(0, 3).map(a => ({
        name: a.name,
        segments: a.metadata.segments,
        totalFiles: a.relatedFiles.length
      }))
    })
    return assets
  }
  
  function extractCaptureRollFromPath(filePath: string): string | undefined {
    // Look for RDM folder in path hierarchy
    const pathParts = filePath.split('/')
    const rdmIndex = pathParts.findIndex(part => /\.rdm$/i.test(part))
    return rdmIndex >= 0 ? pathParts[rdmIndex].replace(/\.rdm$/i, '') : undefined
  }
  
  function extractCaptureRollFromFilename(clipName: string): string | undefined {
    // Extract capture roll from clip naming conventions
    // Common patterns: A001_C001_001, ROLL_A_001, etc.
    const rollMatch = clipName.match(/^([A-Z]\d{3})/i) || 
                     clipName.match(/ROLL[_-]([A-Z]+)/i) ||
                     clipName.match(/^([A-Z]+\d*)/i)
    return rollMatch ? rollMatch[1] : undefined
  }

  function groupBRAWAssets(files: FileNode[]): MediaAsset[] {
    const assets: MediaAsset[] = []
    
    const brawFiles = files.filter(f => CAMERA_PATTERNS.braw.clips.test(f.name))
    
    for (const brawFile of brawFiles) {
      const baseName = brawFile.name.replace(/\.braw$/i, '')
      
      assets.push({
        id: `braw_${baseName}_${Date.now()}`,
        name: baseName,
        type: 'clip',
        format: 'braw',
        primaryFile: brawFile,
        relatedFiles: [brawFile],
        metadata: {
          codec: 'Blackmagic RAW'
        }
      })
    }
    
    return assets
  }

  function groupSonyAssets(files: FileNode[]): MediaAsset[] {
    const assets: MediaAsset[] = []
    const processedFiles = new Set<string>()
    
    // Group files by directory (Sony clips are folder-based)
    const clipFolders = new Map<string, FileNode[]>()
    
    files.forEach(file => {
      const folderPath = file.path.substring(0, file.path.lastIndexOf('/'))
      if (!clipFolders.has(folderPath)) {
        clipFolders.set(folderPath, [])
      }
      clipFolders.get(folderPath)!.push(file)
    })
    
    clipFolders.forEach((folderFiles, folderPath) => {
      // Group by base name (files with same name but different extensions)
      const baseNameGroups = new Map<string, FileNode[]>()
      
      folderFiles.forEach(file => {
        const baseName = file.name.replace(/\.[^.]+$/, '')
        if (!baseNameGroups.has(baseName)) {
          baseNameGroups.set(baseName, [])
        }
        baseNameGroups.get(baseName)!.push(file)
      })
      
      baseNameGroups.forEach((groupFiles, baseName) => {
        // Find the primary video file
        const primaryFile = groupFiles.find(f => 
          CAMERA_PATTERNS.sony.clips.test(f.name)
        )
        
        if (primaryFile && !processedFiles.has(primaryFile.path)) {
          groupFiles.forEach(f => processedFiles.add(f.path))
          
          assets.push({
            id: `sony_${baseName}_${Date.now()}`,
            name: baseName,
            type: 'clip',
            format: 'sony',
            primaryFile,
            relatedFiles: groupFiles,
            metadata: {
              codec: detectSonyCodec(primaryFile.name)
            }
          })
        }
      })
    })
    
    return assets
  }

  function groupCanonAssets(files: FileNode[]): MediaAsset[] {
    const assets: MediaAsset[] = []
    const processedFiles = new Set<string>()
    
    const videoFiles = files.filter(f => CAMERA_PATTERNS.canon.clips.test(f.name))
    
    for (const videoFile of videoFiles) {
      if (processedFiles.has(videoFile.path)) continue
      
      const baseName = videoFile.name.replace(/\.[^.]+$/, '')
      const relatedFiles: FileNode[] = [videoFile]
      
      // Find related metadata files
      const metadata = files.filter(f => {
        const fileBaseName = f.name.replace(/\.[^.]+$/, '')
        return (CAMERA_PATTERNS.canon.metadata.test(f.name) || 
                CAMERA_PATTERNS.canon.sidecars.test(f.name)) && 
               fileBaseName === baseName
      })
      
      relatedFiles.push(...metadata)
      relatedFiles.forEach(f => processedFiles.add(f.path))
      
      assets.push({
        id: `canon_${baseName}_${Date.now()}`,
        name: baseName,
        type: 'clip',
        format: 'canon',
        primaryFile: videoFile,
        relatedFiles,
        metadata: {
          codec: detectCanonCodec(videoFile.name)
        }
      })
    }
    
    return assets
  }

  function createAssetGroups(files: FileNode[]): AssetGroup[] {
    const format = detectCameraFormat(files)
    return createAssetGroupsWithFormat(files, format)
  }

  function createAssetGroupsWithFormat(files: FileNode[], format: string): AssetGroup[] {
    let assets: MediaAsset[] = []
    
    switch (format) {
      case 'red':
        assets = groupREDAssets(files)
        break
      case 'braw':
        assets = groupBRAWAssets(files)
        break
      case 'sony':
        assets = groupSonyAssets(files)
        break
      case 'canon':
        assets = groupCanonAssets(files)
        break
      default:
        // Standard file handling - each video file is its own asset
        assets = files
          .filter(f => isVideoFile(f.name))
          .map(f => ({
            id: `std_${f.name}_${Date.now()}`,
            name: f.name.replace(/\.[^.]+$/, ''),
            type: 'clip' as const,
            format: 'standard' as const,
            primaryFile: f,
            relatedFiles: [f],
            metadata: {}
          }))
    }
    
    // Group assets by directory or logical grouping
    const groups = new Map<string, MediaAsset[]>()
    
    assets.forEach(asset => {
      const groupKey = asset.primaryFile.path.substring(0, asset.primaryFile.path.lastIndexOf('/'))
      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(asset)
    })
    
    return Array.from(groups.entries()).map(([path, groupAssets]) => {
      const totalSize = groupAssets.reduce((sum, asset) => 
        sum + asset.relatedFiles.reduce((fileSum, file) => fileSum + (file.size || 0), 0), 0)
      
      const fileCount = groupAssets.reduce((sum, asset) => sum + asset.relatedFiles.length, 0)
      
      return {
        id: `group_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        name: path.split('/').pop() || 'Root',
        assets: groupAssets,
        totalSize,
        fileCount
      }
    })
  }

  // Helper functions
  function extractREDFrameRate(filename: string): number | undefined {
    const match = filename.match(/(\d+)fps/i)
    return match ? parseInt(match[1]) : undefined
  }

  function detectSonyCodec(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'mxf': return 'XAVC'
      case 'mp4': return 'XAVC S'
      case 'mov': return 'ProRes'
      default: return 'Unknown'
    }
  }

  function detectCanonCodec(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'mxf': return 'Canon RAW'
      case 'mp4': return 'Canon Log'
      case 'mov': return 'Canon Cinema RAW'
      default: return 'Unknown'
    }
  }

  function isVideoFile(filename: string): boolean {
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'mxf', 'r3d', 'braw', 'rdc']
    const ext = filename.split('.').pop()?.toLowerCase()
    return videoExts.includes(ext || '')
  }

  async function createEnhancedAssetGroups(files: FileNode[]): Promise<AssetGroup[]> {
    // First create basic asset groups
    const basicGroups = createAssetGroups(files)
    
    // Then enhance each asset with detailed metadata
    const enhancedGroups: AssetGroup[] = []
    
    for (const group of basicGroups) {
      const enhancedAssets: MediaAsset[] = []
      
      for (const asset of group.assets) {
        try {
          const enhancedMetadata = await extractMetadata(asset)
          const enhancedAsset: MediaAsset = {
            ...asset,
            metadata: enhancedMetadata
          }
          enhancedAssets.push(enhancedAsset)
        } catch (error) {
          console.error(`Error extracting metadata for ${asset.name}:`, error)
          enhancedAssets.push(asset) // Keep original if extraction fails
        }
      }
      
      enhancedGroups.push({
        ...group,
        assets: enhancedAssets
      })
    }
    
    return enhancedGroups
  }

  return {
    createAssetGroups,
    createAssetGroupsWithFormat,
    createEnhancedAssetGroups,
    detectCameraFormat,
    extractMetadata,
    CAMERA_PATTERNS
  }
}