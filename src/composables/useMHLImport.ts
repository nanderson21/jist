import type { MHLManifest, MHLFile } from './useMHL'
import type { MediaAsset } from './useMediaAssets'

export interface ImportedMHLData {
  manifest: MHLManifest
  fileHashes: Map<string, string>
  assetHashes: Map<string, string>
  importDate: Date
  sourceFile: string
}

export function useMHLImport() {

  function parseMHLXML(content: string): MHLManifest {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'application/xml')
    
    // Check for parsing errors
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      throw new Error('Invalid MHL XML format')
    }
    
    // Extract basic manifest info
    const creatorInfo = doc.querySelector('creatorinfo')
    const generator = creatorInfo?.querySelector('name')?.textContent || 'Unknown'
    
    const startDate = doc.querySelector('startdate')?.textContent
    const finishDate = doc.querySelector('finishdate')?.textContent
    
    // Extract file hashes
    const hashElements = doc.querySelectorAll('hash')
    const files: MHLFile[] = []
    
    hashElements.forEach(hashEl => {
      const filePath = hashEl.querySelector('file')?.textContent
      const sizeText = hashEl.querySelector('size')?.textContent
      const lastModText = hashEl.querySelector('lastmodificationdate')?.textContent
      
      // Get hash values (check for MD5, SHA1, SHA256)
      const md5 = hashEl.querySelector('md5')?.textContent
      const sha1 = hashEl.querySelector('sha1')?.textContent
      const sha256 = hashEl.querySelector('sha256')?.textContent
      
      if (filePath) {
        const file: MHLFile = {
          path: filePath,
          size: sizeText ? parseInt(sizeText) : 0,
          lastModified: lastModText ? new Date(lastModText) : new Date(),
          hash: md5 || sha1 || sha256 || '',
          hashType: md5 ? 'md5' : sha1 ? 'sha1' : sha256 ? 'sha256' : 'unknown'
        }
        files.push(file)
      }
    })
    
    // Extract media assets if present
    const mediaElements = doc.querySelectorAll('media')
    const assets: MediaAsset[] = []
    
    mediaElements.forEach(mediaEl => {
      const name = mediaEl.querySelector('name')?.textContent
      const format = mediaEl.querySelector('format')?.textContent
      const type = mediaEl.querySelector('type')?.textContent
      const primaryFile = mediaEl.querySelector('primary_file')?.textContent
      const codec = mediaEl.querySelector('codec')?.textContent
      const frameRate = mediaEl.querySelector('framerate')?.textContent
      const resolution = mediaEl.querySelector('resolution')?.textContent
      
      if (name && format && type && primaryFile) {
        // Create a basic asset structure
        // Note: We can't fully reconstruct the FileNode objects from MHL alone
        const asset: Partial<MediaAsset> = {
          id: `imported_${name}_${Date.now()}`,
          name,
          type: type as 'clip' | 'sequence' | 'still',
          format: format as 'red' | 'braw' | 'canon' | 'sony' | 'standard',
          metadata: {
            codec,
            frameRate: frameRate ? parseFloat(frameRate) : undefined,
            resolution
          }
        }
        
        // We'll need to match this with actual files later
        assets.push(asset as MediaAsset)
      }
    })
    
    const totalFiles = files.length
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    
    const manifest: MHLManifest = {
      creationDate: startDate ? new Date(startDate) : new Date(),
      generator,
      hashType: files[0]?.hashType || 'unknown',
      files,
      assets: assets.length > 0 ? assets : undefined,
      metadata: {
        totalFiles,
        totalSize
      }
    }
    
    return manifest
  }

  function createHashMaps(manifest: MHLManifest): {
    fileHashes: Map<string, string>
    assetHashes: Map<string, string>
  } {
    const fileHashes = new Map<string, string>()
    const assetHashes = new Map<string, string>()
    
    // Map file paths to their hashes
    manifest.files.forEach(file => {
      // Normalize path for comparison (remove leading/trailing slashes)
      const normalizedPath = file.path.replace(/^\/+|\/+$/g, '')
      fileHashes.set(normalizedPath, file.hash)
    })
    
    // Map asset names to their primary file hashes
    if (manifest.assets) {
      manifest.assets.forEach(asset => {
        if (asset.primaryFile) {
          const normalizedPath = asset.primaryFile.path.replace(/^\/+|\/+$/g, '')
          const hash = fileHashes.get(normalizedPath)
          if (hash) {
            assetHashes.set(asset.name, hash)
          }
        }
      })
    }
    
    return { fileHashes, assetHashes }
  }

  function matchExistingFiles(
    manifest: MHLManifest, 
    currentAssets: MediaAsset[]
  ): {
    matched: MediaAsset[]
    unmatched: MediaAsset[]
    newFromMHL: MediaAsset[]
  } {
    const { fileHashes } = createHashMaps(manifest)
    const matched: MediaAsset[] = []
    const unmatched: MediaAsset[] = []
    const newFromMHL: MediaAsset[] = []
    
    // Check current assets against MHL
    currentAssets.forEach(asset => {
      let hasMatch = false
      
      // Check if any of the asset's files exist in the MHL
      for (const file of asset.relatedFiles) {
        const normalizedPath = file.path.replace(/^\/+|\/+$/g, '')
        if (fileHashes.has(normalizedPath)) {
          // File exists in MHL - mark as matched
          matched.push({
            ...asset,
            metadata: {
              ...asset.metadata,
              existingHash: fileHashes.get(normalizedPath),
              hashVerified: true,
              lastMHLCheck: new Date()
            }
          })
          hasMatch = true
          break
        }
      }
      
      if (!hasMatch) {
        unmatched.push(asset)
      }
    })
    
    // Find assets in MHL that don't exist in current project
    if (manifest.assets) {
      manifest.assets.forEach(mhlAsset => {
        const exists = currentAssets.some(asset => 
          asset.name === mhlAsset.name || 
          asset.primaryFile.path.includes(mhlAsset.name)
        )
        
        if (!exists) {
          newFromMHL.push(mhlAsset)
        }
      })
    }
    
    return { matched, unmatched, newFromMHL }
  }

  async function importMHLFile(
    content: string, 
    currentAssets: MediaAsset[],
    sourceFileName: string
  ): Promise<ImportedMHLData> {
    
    const manifest = parseMHLXML(content)
    const { fileHashes, assetHashes } = createHashMaps(manifest)
    
    console.log(`Imported MHL with ${manifest.files.length} files and ${manifest.assets?.length || 0} assets`)
    
    // Match against current assets
    const matchResults = matchExistingFiles(manifest, currentAssets)
    
    console.log(`Matched: ${matchResults.matched.length}, Unmatched: ${matchResults.unmatched.length}, New: ${matchResults.newFromMHL.length}`)
    
    return {
      manifest,
      fileHashes,
      assetHashes,
      importDate: new Date(),
      sourceFile: sourceFileName
    }
  }

  function shouldSkipHashing(filePath: string, fileHashes: Map<string, string>): boolean {
    const normalizedPath = filePath.replace(/^\/+|\/+$/g, '')
    return fileHashes.has(normalizedPath)
  }

  function getExistingHash(filePath: string, fileHashes: Map<string, string>): string | undefined {
    const normalizedPath = filePath.replace(/^\/+|\/+$/g, '')
    return fileHashes.get(normalizedPath)
  }

  function validateHashIntegrity(
    filePath: string, 
    calculatedHash: string, 
    existingHash: string
  ): {
    isValid: boolean
    message: string
  } {
    if (calculatedHash.toLowerCase() === existingHash.toLowerCase()) {
      return {
        isValid: true,
        message: 'Hash verified - file unchanged'
      }
    } else {
      return {
        isValid: false,
        message: 'Hash mismatch - file may have been modified'
      }
    }
  }

  return {
    parseMHLXML,
    createHashMaps,
    matchExistingFiles,
    importMHLFile,
    shouldSkipHashing,
    getExistingHash,
    validateHashIntegrity
  }
}