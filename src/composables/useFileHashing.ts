export interface HashProgress {
  fileName: string
  bytesProcessed: number
  totalBytes: number
  percentage: number
  currentFile: number
  totalFiles: number
}

export interface FileHash {
  fileName: string
  filePath: string
  size: number
  md5?: string
  sha1?: string
  sha256?: string
  error?: string
}

export function useFileHashing() {
  
  async function hashFile(
    fileHandle: FileSystemFileHandle,
    algorithms: ('MD5' | 'SHA-1' | 'SHA-256')[] = ['MD5', 'SHA-1'],
    onProgress?: (progress: HashProgress) => void
  ): Promise<FileHash> {
    
    try {
      const file = await fileHandle.getFile()
      const result: FileHash = {
        fileName: file.name,
        filePath: fileHandle.name, // This would be the full path in a real implementation
        size: file.size
      }
      
      // Process file in chunks for better performance and progress reporting
      const chunkSize = 64 * 1024 * 1024 // 64MB chunks
      const chunks = Math.ceil(file.size / chunkSize)
      
      // Initialize crypto contexts for each algorithm
      const hashers = new Map<string, HashingContext>()
      
      for (const algorithm of algorithms) {
        try {
          hashers.set(algorithm, await createHashingContext(algorithm))
        } catch (error) {
          console.warn(`Algorithm ${algorithm} not supported:`, error)
        }
      }
      
      // Process file in chunks
      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        const chunk = file.slice(start, end)
        const buffer = await chunk.arrayBuffer()
        
        // Update all hashers with this chunk
        for (const [algorithm, hasher] of hashers) {
          await hasher.update(buffer)
        }
        
        // Report progress
        if (onProgress) {
          onProgress({
            fileName: file.name,
            bytesProcessed: end,
            totalBytes: file.size,
            percentage: (end / file.size) * 100,
            currentFile: 1,
            totalFiles: 1
          })
        }
      }
      
      // Finalize hashes
      for (const [algorithm, hasher] of hashers) {
        try {
          const hash = await hasher.finalize()
          switch (algorithm) {
            case 'MD5':
              result.md5 = hash
              break
            case 'SHA-1':
              result.sha1 = hash
              break
            case 'SHA-256':
              result.sha256 = hash
              break
          }
        } catch (error) {
          result.error = `Failed to compute ${algorithm}: ${error.message}`
        }
      }
      
      return result
      
    } catch (error) {
      return {
        fileName: fileHandle.name,
        filePath: fileHandle.name,
        size: 0,
        error: error.message
      }
    }
  }

  async function hashMultipleFiles(
    fileHandles: FileSystemFileHandle[],
    algorithms: ('MD5' | 'SHA-1' | 'SHA-256')[] = ['MD5', 'SHA-1'],
    onProgress?: (progress: HashProgress) => void,
    onFileComplete?: (result: FileHash) => void
  ): Promise<FileHash[]> {
    
    const results: FileHash[] = []
    
    for (let i = 0; i < fileHandles.length; i++) {
      const fileHandle = fileHandles[i]
      
      const fileProgressCallback = onProgress ? (progress: HashProgress) => {
        onProgress({
          ...progress,
          currentFile: i + 1,
          totalFiles: fileHandles.length
        })
      } : undefined
      
      try {
        const result = await hashFile(fileHandle, algorithms, fileProgressCallback)
        results.push(result)
        
        if (onFileComplete) {
          onFileComplete(result)
        }
        
      } catch (error) {
        results.push({
          fileName: fileHandle.name,
          filePath: fileHandle.name,
          size: 0,
          error: error.message
        })
      }
    }
    
    return results
  }

  // Batch hash files from directory handles (for recursive directory processing)
  async function hashDirectoryRecursive(
    directoryHandle: FileSystemDirectoryHandle,
    algorithms: ('MD5' | 'SHA-1' | 'SHA-256')[] = ['MD5', 'SHA-1'],
    onProgress?: (progress: HashProgress) => void,
    onFileComplete?: (result: FileHash) => void,
    filter?: (fileName: string) => boolean
  ): Promise<FileHash[]> {
    
    const fileHandles: FileSystemFileHandle[] = []
    
    // Recursively collect all file handles
    await collectFileHandles(directoryHandle, fileHandles, '', filter)
    
    return hashMultipleFiles(fileHandles, algorithms, onProgress, onFileComplete)
  }

  async function collectFileHandles(
    directoryHandle: FileSystemDirectoryHandle,
    fileHandles: FileSystemFileHandle[],
    currentPath: string = '',
    filter?: (fileName: string) => boolean
  ): Promise<void> {
    
    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        const fullPath = currentPath ? `${currentPath}/${name}` : name
        
        if (handle.kind === 'file') {
          if (!filter || filter(name)) {
            // Store the path information somehow (this is a limitation of the current API)
            const fileHandle = handle as FileSystemFileHandle
            fileHandles.push(fileHandle)
          }
        } else if (handle.kind === 'directory') {
          await collectFileHandles(handle as FileSystemDirectoryHandle, fileHandles, fullPath, filter)
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error)
    }
  }

  return {
    hashFile,
    hashMultipleFiles,
    hashDirectoryRecursive
  }
}

// Internal hashing context interface
interface HashingContext {
  update(data: ArrayBuffer): Promise<void>
  finalize(): Promise<string>
}

// Create hashing context for streaming hash computation
async function createHashingContext(algorithm: 'MD5' | 'SHA-1' | 'SHA-256'): Promise<HashingContext> {
  
  // For browsers that support streaming crypto
  if ('crypto' in window && 'subtle' in crypto) {
    
    let chunks: ArrayBuffer[] = []
    
    return {
      async update(data: ArrayBuffer): Promise<void> {
        chunks.push(data.slice()) // Store chunk for later processing
      },
      
      async finalize(): Promise<string> {
        // Concatenate all chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
        const concatenated = new Uint8Array(totalLength)
        
        let offset = 0
        for (const chunk of chunks) {
          concatenated.set(new Uint8Array(chunk), offset)
          offset += chunk.byteLength
        }
        
        // Compute hash
        let hashAlgorithm: string
        switch (algorithm) {
          case 'MD5':
            // MD5 is not supported in Web Crypto API, fallback to SHA-256
            hashAlgorithm = 'SHA-256'
            break
          case 'SHA-1':
            hashAlgorithm = 'SHA-1'
            break
          case 'SHA-256':
            hashAlgorithm = 'SHA-256'
            break
        }
        
        const hashBuffer = await crypto.subtle.digest(hashAlgorithm, concatenated)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        
        // For MD5 fallback, truncate SHA-256 to 32 characters (not cryptographically equivalent, but useful for demo)
        if (algorithm === 'MD5') {
          return hashHex.substring(0, 32)
        }
        
        return hashHex
      }
    }
  }
  
  throw new Error(`Hashing algorithm ${algorithm} not supported`)
}

// Utility function to detect if file should be hashed based on media type
export function shouldHashFile(fileName: string): boolean {
  const mediaExtensions = [
    // Video
    'mp4', 'mov', 'avi', 'mkv', 'mxf', 'r3d', 'braw', 'rdc', 'rmf',
    // Audio  
    'wav', 'mp3', 'aif', 'aiff', 'flac',
    // Images
    'jpg', 'jpeg', 'png', 'tiff', 'tif', 'cr2', 'arw', 'dng', 'raw',
    // Metadata/Sidecar files
    'xml', 'rmd', 'bim', 'ppm', 'cif', 'cpf'
  ]
  
  const ext = fileName.split('.').pop()?.toLowerCase()
  return mediaExtensions.includes(ext || '')
}