import type { MediaAsset } from './useMediaAssets'
import type { FileNode } from '@/types'

export interface ExtendedMetadata {
  // Basic info
  duration?: number
  resolution?: string
  frameRate?: number
  codec?: string
  timecode?: string
  
  // Camera specific
  cameraModel?: string
  lensInfo?: string
  sensorSize?: string
  
  // Technical specs
  bitRate?: number
  colorSpace?: string
  gamut?: string
  
  // RED specific
  segments?: number // For RED metaclips
  captureRoll?: string // For RED capture rolls
  totalSize?: number // Total size of all related files
  whiteBalance?: number
  iso?: number
  
  // RED specific
  redVersion?: string
  redResolution?: string
  redCompression?: string
  
  // Sony specific
  sonyFormat?: string
  sonyCodec?: string
  sonyFrameRate?: string
  
  // Canon specific
  canonProfile?: string
  canonColorGamut?: string
  
  // File info
  recordingDate?: Date
  location?: string
  
  // Calculated
  estimatedDuration?: number
  totalDataRate?: number
}

export function useMediaMetadata() {
  
  async function extractMetadata(asset: MediaAsset): Promise<ExtendedMetadata> {
    const metadata: ExtendedMetadata = { ...asset.metadata }
    
    switch (asset.format) {
      case 'red':
        return await extractREDMetadata(asset, metadata)
      case 'braw':
        return await extractBRAWMetadata(asset, metadata)
      case 'sony':
        return await extractSonyMetadata(asset, metadata)
      case 'canon':
        return await extractCanonMetadata(asset, metadata)
      default:
        return await extractStandardMetadata(asset, metadata)
    }
  }

  async function extractREDMetadata(asset: MediaAsset, baseMetadata: ExtendedMetadata): Promise<ExtendedMetadata> {
    const enhanced: ExtendedMetadata = { ...baseMetadata }
    
    // Extract info from filename patterns
    const rdcFile = asset.relatedFiles.find(f => /\.rdc$/i.test(f.name))
    if (rdcFile) {
      // Common RED filename patterns: CLIP_001_C001_01011A.RDC
      const namePattern = rdcFile.name.match(/([A-Z_]+)_?(\d+)_?([A-Z]\d+)?_?(.+)\.rdc$/i)
      if (namePattern) {
        enhanced.timecode = namePattern[4] // Timecode part
      }
      
      // Extract resolution from filename
      const resolutionMatch = rdcFile.name.match(/(4K|5K|6K|8K|2K)/i)
      if (resolutionMatch) {
        enhanced.redResolution = resolutionMatch[1]
        enhanced.resolution = getREDResolutionSpecs(resolutionMatch[1])
      }
      
      // Extract frame rate from filename
      const fpsMatch = rdcFile.name.match(/(\d+)fps/i)
      if (fpsMatch) {
        enhanced.frameRate = parseInt(fpsMatch[1])
      }
    }
    
    // Look for R3D chunks to estimate duration and data rate
    const r3dFiles = asset.relatedFiles.filter(f => /_\d{3}\.r3d$/i.test(f.name))
    if (r3dFiles.length > 0) {
      // Each R3D chunk is typically 4GB, estimate duration based on data rate
      const totalSize = r3dFiles.reduce((sum, f) => sum + (f.size || 0), 0)
      const estimatedBitRate = estimateREDBitRate(enhanced.redResolution, enhanced.frameRate)
      
      if (estimatedBitRate) {
        enhanced.bitRate = estimatedBitRate
        enhanced.estimatedDuration = Math.round(totalSize * 8 / estimatedBitRate) // Convert bytes to bits, then to seconds
        enhanced.totalDataRate = estimatedBitRate
      }
    }
    
    // Check for RMD sidecar files for additional metadata
    const rmdFile = asset.relatedFiles.find(f => /\.rmd$/i.test(f.name))
    if (rmdFile) {
      // RMD files contain camera settings - would need to parse binary format
      enhanced.cameraModel = 'RED Camera'
    }
    
    enhanced.codec = 'REDCODE RAW'
    enhanced.colorSpace = 'REDWideGamutRGB'
    enhanced.gamut = 'REDWideGamut'
    
    return enhanced
  }

  async function extractBRAWMetadata(asset: MediaAsset, baseMetadata: ExtendedMetadata): Promise<ExtendedMetadata> {
    const enhanced: ExtendedMetadata = { ...baseMetadata }
    
    const brawFile = asset.primaryFile
    
    // Extract info from filename patterns
    // Common BRAW patterns: BMPCC_20240101_001.braw
    const namePattern = brawFile.name.match(/([A-Z]+)_?(\d{8})?_?(\d+)\.braw$/i)
    if (namePattern) {
      enhanced.cameraModel = getCameraModelFromPrefix(namePattern[1])
      
      if (namePattern[2]) {
        // Date from filename
        const dateStr = namePattern[2]
        const year = parseInt(dateStr.substring(0, 4))
        const month = parseInt(dateStr.substring(4, 6))
        const day = parseInt(dateStr.substring(6, 8))
        enhanced.recordingDate = new Date(year, month - 1, day)
      }
    }
    
    // Estimate specs based on file size and typical BRAW characteristics
    if (brawFile.size) {
      const fileSizeMB = brawFile.size / (1024 * 1024)
      
      // BRAW typical data rates (MB/s): 
      // 6K: ~140 MB/s, 4K: ~80 MB/s, HD: ~35 MB/s
      let estimatedDataRate = 80 // Default to 4K
      let estimatedResolution = '4K UHD'
      
      if (fileSizeMB > 1000) { // Large file suggests higher resolution
        estimatedDataRate = 140
        estimatedResolution = '6K'
      } else if (fileSizeMB < 200) { // Small file suggests HD
        estimatedDataRate = 35
        estimatedResolution = '1080p'
      }
      
      enhanced.resolution = estimatedResolution
      enhanced.bitRate = estimatedDataRate * 8 * 1024 * 1024 // Convert to bits per second
      enhanced.estimatedDuration = Math.round(fileSizeMB / estimatedDataRate)
      enhanced.totalDataRate = enhanced.bitRate
    }
    
    enhanced.codec = 'Blackmagic RAW'
    enhanced.colorSpace = 'Blackmagic Design'
    enhanced.gamut = 'Rec. 2020'
    
    return enhanced
  }

  async function extractSonyMetadata(asset: MediaAsset, baseMetadata: ExtendedMetadata): Promise<ExtendedMetadata> {
    const enhanced: ExtendedMetadata = { ...baseMetadata }
    
    // Sony files are typically in XDROOT/CLIP/ structure
    const clipPath = asset.primaryFile.path
    const isXDCAM = /XDROOT[\/\\]CLIP/i.test(clipPath)
    
    if (isXDCAM) {
      enhanced.sonyFormat = 'XDCAM'
      
      // Look for XML metadata files
      const xmlFile = asset.relatedFiles.find(f => /\.xml$/i.test(f.name))
      if (xmlFile) {
        // XML files contain detailed metadata - would need to parse
        enhanced.cameraModel = detectSonyCameraModel(asset.primaryFile.name)
      }
      
      // Look for BIM files (thumbnail/metadata)
      const bimFile = asset.relatedFiles.find(f => /\.bim$/i.test(f.name))
      if (bimFile) {
        // BIM files contain binary metadata
      }
    }
    
    // Extract codec from file extension
    const ext = asset.primaryFile.name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'mxf':
        enhanced.sonyCodec = 'XAVC'
        enhanced.codec = 'XAVC'
        break
      case 'mp4':
        enhanced.sonyCodec = 'XAVC S'
        enhanced.codec = 'XAVC S'
        break
      case 'mov':
        enhanced.sonyCodec = 'XAVC'
        enhanced.codec = 'XAVC'
        break
    }
    
    enhanced.colorSpace = 'S-Gamut3.Cine'
    enhanced.gamut = 'S-Gamut3'
    
    return enhanced
  }

  async function extractCanonMetadata(asset: MediaAsset, baseMetadata: ExtendedMetadata): Promise<ExtendedMetadata> {
    const enhanced: ExtendedMetadata = { ...baseMetadata }
    
    // Look for XML sidecar files
    const xmlFile = asset.relatedFiles.find(f => /\.xml$/i.test(f.name))
    if (xmlFile) {
      // Canon XML files contain detailed camera settings
      enhanced.cameraModel = 'Canon Cinema Camera'
    }
    
    // Look for CIF/CPF files (Canon Image Format)
    const cifFile = asset.relatedFiles.find(f => /\.(cif|cpf)$/i.test(f.name))
    if (cifFile) {
      // These contain image processing metadata
    }
    
    // Extract codec from file extension and naming patterns
    const ext = asset.primaryFile.name.split('.').pop()?.toLowerCase()
    const filename = asset.primaryFile.name.toLowerCase()
    
    if (filename.includes('raw')) {
      enhanced.codec = 'Canon RAW'
      enhanced.canonProfile = 'Canon RAW'
    } else if (filename.includes('log')) {
      enhanced.codec = 'Canon Log'
      enhanced.canonProfile = 'Canon Log'
    } else {
      switch (ext) {
        case 'mxf':
          enhanced.codec = 'Canon XF-AVC'
          break
        case 'mp4':
          enhanced.codec = 'Canon MP4'
          break
        case 'mov':
          enhanced.codec = 'Canon Cinema RAW'
          break
      }
    }
    
    enhanced.colorSpace = 'Canon RGB'
    enhanced.canonColorGamut = 'Canon Cinema Gamut'
    
    return enhanced
  }

  async function extractStandardMetadata(asset: MediaAsset, baseMetadata: ExtendedMetadata): Promise<ExtendedMetadata> {
    const enhanced: ExtendedMetadata = { ...baseMetadata }
    
    // Basic file analysis
    const file = asset.primaryFile
    const ext = file.name.split('.').pop()?.toLowerCase()
    
    // Detect codec from extension
    switch (ext) {
      case 'mp4':
        enhanced.codec = 'H.264/H.265'
        break
      case 'mov':
        enhanced.codec = 'QuickTime'
        break
      case 'avi':
        enhanced.codec = 'Various'
        break
      case 'mkv':
        enhanced.codec = 'Matroska'
        break
    }
    
    // Estimate duration from file size (very rough)
    if (file.size) {
      const fileSizeMB = file.size / (1024 * 1024)
      // Assume average bitrate of 50 Mbps for estimation
      enhanced.estimatedDuration = Math.round(fileSizeMB / 6.25) // 50 Mbps = 6.25 MB/s
    }
    
    return enhanced
  }

  // Helper functions
  function getREDResolutionSpecs(redRes: string): string {
    const specs = {
      '2K': '2048 x 1152',
      '4K': '4096 x 2304', 
      '5K': '5120 x 2700',
      '6K': '6144 x 3456',
      '8K': '8192 x 4608'
    }
    return specs[redRes as keyof typeof specs] || redRes
  }

  function estimateREDBitRate(resolution?: string, frameRate?: number): number | undefined {
    const baseBitRates = {
      '2K': 100, // Mbps
      '4K': 200,
      '5K': 300,
      '6K': 400,
      '8K': 600
    }
    
    if (!resolution) return undefined
    
    let bitRate = baseBitRates[resolution as keyof typeof baseBitRates]
    if (!bitRate) return undefined
    
    // Adjust for frame rate
    if (frameRate) {
      bitRate = bitRate * (frameRate / 24) // Scale from 24fps base
    }
    
    return bitRate * 1000000 // Convert to bits per second
  }

  function getCameraModelFromPrefix(prefix: string): string {
    const models = {
      'BMPCC': 'Blackmagic Pocket Cinema Camera',
      'BMPC': 'Blackmagic Production Camera',
      'BMCC': 'Blackmagic Cinema Camera',
      'URSA': 'Blackmagic URSA',
      'STUDIO': 'Blackmagic Studio Camera'
    }
    return models[prefix as keyof typeof models] || 'Blackmagic Camera'
  }

  function detectSonyCameraModel(filename: string): string {
    const name = filename.toLowerCase()
    
    if (name.includes('fx9')) return 'Sony FX9'
    if (name.includes('fx6')) return 'Sony FX6'
    if (name.includes('fx3')) return 'Sony FX3'
    if (name.includes('a7s')) return 'Sony A7S III'
    if (name.includes('fs7')) return 'Sony FS7'
    if (name.includes('fs5')) return 'Sony FS5'
    
    return 'Sony Camera'
  }

  return {
    extractMetadata
  }
}