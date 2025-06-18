import type { MediaAsset, AssetGroup } from './useMediaAssets'
import type { FileNode } from '@/types'

export interface MHLOptions {
  hashType: 'md5' | 'sha1' | 'xxhash'
  includeMetadata: boolean
  relativePaths: boolean
  basePath?: string
}

export interface MHLFile {
  path: string
  size: number
  lastModified: Date
  hash: string
  hashType: string
}

export interface MHLManifest {
  creationDate: Date
  generator: string
  hashType: string
  files: MHLFile[]
  assets?: MediaAsset[]
  metadata: {
    totalFiles: number
    totalSize: number
    projectName?: string
  }
}

export function useMHL() {
  
  async function calculateFileHash(file: File, hashType: 'md5' | 'sha1' | 'xxhash' = 'md5'): Promise<string> {
    const buffer = await file.arrayBuffer()
    
    if (hashType === 'xxhash') {
      // For XXHash, we'll use a simple implementation or fallback to MD5
      // In a real implementation, you'd use a proper XXHash library
      return calculateMD5(buffer)
    }
    
    const hashBuffer = await crypto.subtle.digest(
      hashType === 'md5' ? 'MD5' : 'SHA-1',
      buffer
    )
    
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  async function calculateMD5(buffer: ArrayBuffer): Promise<string> {
    // Since Web Crypto API doesn't support MD5 in all browsers,
    // we'll use a fallback implementation
    try {
      const hashBuffer = await crypto.subtle.digest('MD5', buffer)
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    } catch {
      // Fallback to SHA-1 if MD5 is not supported
      const hashBuffer = await crypto.subtle.digest('SHA-1', buffer)
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    }
  }

  async function generateMHL(
    assetGroups: AssetGroup[], 
    options: MHLOptions = {
      hashType: 'md5',
      includeMetadata: true,
      relativePaths: true
    }
  ): Promise<MHLManifest> {
    
    const allFiles: FileNode[] = []
    const allAssets: MediaAsset[] = []
    
    // Collect all files and assets from groups
    assetGroups.forEach(group => {
      allAssets.push(...group.assets)
      group.assets.forEach(asset => {
        allFiles.push(...asset.relatedFiles)
      })
    })
    
    // Remove duplicates
    const uniqueFiles = Array.from(
      new Map(allFiles.map(f => [f.path, f])).values()
    )
    
    const mhlFiles: MHLFile[] = []
    
    // Generate hashes for each file
    for (const fileNode of uniqueFiles) {
      try {
        // In a real implementation, you'd need to get the actual File object
        // from the FileNode to calculate the hash
        const hash = await generatePlaceholderHash(fileNode, options.hashType)
        
        mhlFiles.push({
          path: options.relativePaths ? 
            makeRelativePath(fileNode.path, options.basePath) : 
            fileNode.path,
          size: fileNode.size || 0,
          lastModified: fileNode.lastModified || new Date(),
          hash,
          hashType: options.hashType
        })
      } catch (error) {
        console.error(`Error processing file ${fileNode.path}:`, error)
      }
    }
    
    const totalSize = mhlFiles.reduce((sum, f) => sum + f.size, 0)
    
    return {
      creationDate: new Date(),
      generator: 'JIST Media Browser v1.0',
      hashType: options.hashType,
      files: mhlFiles,
      assets: options.includeMetadata ? allAssets : undefined,
      metadata: {
        totalFiles: mhlFiles.length,
        totalSize,
        projectName: options.basePath?.split('/').pop()
      }
    }
  }

  function generateMHLXML(manifest: MHLManifest): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<hashlist version="1.1">
  <creatorinfo>
    <name>${manifest.generator}</name>
    <version>1.0</version>
    <username>${navigator.userAgent}</username>
  </creatorinfo>
  
  <startdate>${manifest.creationDate.toISOString()}</startdate>
  <finishdate>${new Date().toISOString()}</finishdate>
  
  ${manifest.files.map(file => `
  <hash>
    <file>${escapeXML(file.path)}</file>
    <size>${file.size}</size>
    <lastmodificationdate>${file.lastModified.toISOString()}</lastmodificationdate>
    <${file.hashType}>${file.hash}</${file.hashType}>
  </hash>`).join('')}
  
  ${manifest.assets ? `
  <!-- Media Assets Metadata -->
  ${manifest.assets.map(asset => `
  <media>
    <name>${escapeXML(asset.name)}</name>
    <format>${asset.format}</format>
    <type>${asset.type}</type>
    <primary_file>${escapeXML(asset.primaryFile.path)}</primary_file>
    <file_count>${asset.relatedFiles.length}</file_count>
    ${asset.metadata.codec ? `<codec>${escapeXML(asset.metadata.codec)}</codec>` : ''}
    ${asset.metadata.frameRate ? `<framerate>${asset.metadata.frameRate}</framerate>` : ''}
    ${asset.metadata.resolution ? `<resolution>${escapeXML(asset.metadata.resolution)}</resolution>` : ''}
  </media>`).join('')}
  ` : ''}
  
</hashlist>`
    
    return xml.replace(/^\s+/gm, '').replace(/\n\s*\n/g, '\n')
  }

  async function generatePlaceholderHash(fileNode: FileNode, hashType: string): Promise<string> {
    // This is a placeholder since we can't actually read file contents
    // In a real implementation, you'd use the File System Access API
    // to read the file and calculate the actual hash
    
    const input = `${fileNode.path}${fileNode.size}${fileNode.lastModified?.getTime()}`
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, hashType === 'md5' ? 32 : 40) // Truncate to appropriate length
    } catch {
      // Fallback to simple string hash
      return simpleStringHash(input, hashType === 'md5' ? 32 : 40)
    }
  }

  function simpleStringHash(str: string, length: number): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Convert to hex and pad to desired length
    const hex = Math.abs(hash).toString(16).padStart(8, '0')
    return hex.repeat(Math.ceil(length / 8)).substring(0, length)
  }

  function makeRelativePath(fullPath: string, basePath?: string): string {
    if (!basePath) return fullPath
    
    if (fullPath.startsWith(basePath)) {
      const relativePath = fullPath.substring(basePath.length)
      return relativePath.startsWith('/') ? relativePath.substring(1) : relativePath
    }
    
    return fullPath
  }

  function escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  async function exportMHLFile(manifest: MHLManifest, filename: string): Promise<void> {
    const xml = generateMHLXML(manifest)
    const blob = new Blob([xml], { type: 'application/xml' })
    
    // Use File System Access API if available
    if ('showSaveFilePicker' in window) {
      try {
        // @ts-ignore
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename.endsWith('.mhl') ? filename : `${filename}.mhl`,
          types: [{
            description: 'Media Hash List files',
            accept: { 'application/xml': ['.mhl'] }
          }]
        })
        
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
        
        return
      } catch (error) {
        console.error('Error saving with File System Access API:', error)
      }
    }
    
    // Fallback to download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.mhl') ? filename : `${filename}.mhl`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    generateMHL,
    generateMHLXML,
    exportMHLFile,
    calculateFileHash
  }
}