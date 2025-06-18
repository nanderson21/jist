import { ref, computed } from 'vue'
import type { MediaAsset } from '@/composables/useMediaAssets'
import { useThumbnailGeneration } from '@/composables/useThumbnailGeneration'

interface ThumbnailCache {
  [assetId: string]: {
    thumbnail?: string
    spriteUrl?: string
    spriteRows?: number
    spriteColumns?: number
    isGenerating?: boolean
  }
}

export function useAssetThumbnails() {
  const { generateThumbnail, isThumbnailSupported, isGenerating } = useThumbnailGeneration()
  const thumbnailCache = ref<ThumbnailCache>({})
  const totalProgress = ref(0)
  const currentAsset = ref<string>('')

  /**
   * Get file handle from File System Access API
   */
  async function getFileHandle(filePath: string): Promise<File | null> {
    // In a real implementation, you would need to store file handles
    // or re-request directory access to get the file
    // This is a placeholder that shows the concept
    try {
      // For now, we'll need to request the user to select the file again
      // In a production app, you'd cache file handles or use a different approach
      console.warn('File handle access not implemented for:', filePath)
      return null
    } catch (error) {
      console.error('Error getting file handle:', error)
      return null
    }
  }

  /**
   * Generate thumbnail for a single asset
   */
  async function generateAssetThumbnail(
    asset: MediaAsset,
    fileHandle?: File
  ): Promise<void> {
    if (!isThumbnailSupported(asset.primaryFile as any)) {
      return
    }

    thumbnailCache.value[asset.id] = {
      ...thumbnailCache.value[asset.id],
      isGenerating: true
    }

    try {
      currentAsset.value = asset.name
      
      // Use provided file handle or try to get one
      const file = fileHandle || await getFileHandle(asset.primaryFile.path)
      
      if (!file) {
        console.warn('No file handle available for:', asset.primaryFile.path)
        return
      }

      const isVideo = file.type.startsWith('video/')
      const options = {
        width: 300,
        height: 200,
        frameCount: isVideo ? 50 : 1, // Generate sprite sheet for videos
        quality: 0.8
      }

      const result = await generateThumbnail(file, options)
      
      thumbnailCache.value[asset.id] = {
        thumbnail: result.thumbnail,
        spriteUrl: result.spriteUrl,
        spriteRows: result.rows,
        spriteColumns: result.columns,
        isGenerating: false
      }

      // Update the asset object if it has reactive properties
      if (asset.thumbnail !== undefined) {
        asset.thumbnail = result.thumbnail
        asset.spriteUrl = result.spriteUrl
        asset.spriteRows = result.rows
        asset.spriteColumns = result.columns
      }

    } catch (error) {
      console.error('Error generating thumbnail for', asset.name, ':', error)
      thumbnailCache.value[asset.id] = {
        ...thumbnailCache.value[asset.id],
        isGenerating: false
      }
    }
  }

  /**
   * Generate thumbnails for multiple assets
   */
  async function generateAssetThumbnails(
    assets: MediaAsset[],
    fileHandles?: Map<string, File>
  ): Promise<void> {
    const supportedAssets = assets.filter(asset => 
      isThumbnailSupported(asset.primaryFile as any)
    )

    if (supportedAssets.length === 0) {
      return
    }

    totalProgress.value = 0
    
    for (let i = 0; i < supportedAssets.length; i++) {
      const asset = supportedAssets[i]
      const fileHandle = fileHandles?.get(asset.primaryFile.path)
      
      await generateAssetThumbnail(asset, fileHandle)
      
      totalProgress.value = ((i + 1) / supportedAssets.length) * 100
    }

    currentAsset.value = ''
  }

  /**
   * Get cached thumbnail data for an asset
   */
  function getAssetThumbnail(assetId: string) {
    return computed(() => thumbnailCache.value[assetId] || {})
  }

  /**
   * Check if an asset has a thumbnail
   */
  function hasThumbnail(assetId: string): boolean {
    const cache = thumbnailCache.value[assetId]
    return !!(cache?.thumbnail || cache?.spriteUrl)
  }

  /**
   * Check if thumbnail generation is in progress for an asset
   */
  function isGeneratingThumbnail(assetId: string): boolean {
    return thumbnailCache.value[assetId]?.isGenerating || false
  }

  /**
   * Clear thumbnail cache
   */
  function clearThumbnailCache(): void {
    thumbnailCache.value = {}
  }

  /**
   * Enhanced asset creation with thumbnail support
   */
  async function enhanceAssetWithThumbnail(
    asset: MediaAsset,
    fileHandle?: File
  ): Promise<MediaAsset> {
    const enhanced = { ...asset }
    
    // Add cached thumbnail data if available
    const cached = thumbnailCache.value[asset.id]
    if (cached) {
      enhanced.thumbnail = cached.thumbnail
      enhanced.spriteUrl = cached.spriteUrl
      enhanced.spriteRows = cached.spriteRows
      enhanced.spriteColumns = cached.spriteColumns
    }

    // Generate thumbnail if not cached and file handle is available
    if (!cached && fileHandle && isThumbnailSupported(fileHandle)) {
      await generateAssetThumbnail(enhanced, fileHandle)
      
      // Update with generated thumbnail
      const newCached = thumbnailCache.value[asset.id]
      if (newCached) {
        enhanced.thumbnail = newCached.thumbnail
        enhanced.spriteUrl = newCached.spriteUrl
        enhanced.spriteRows = newCached.spriteRows
        enhanced.spriteColumns = newCached.spriteColumns
      }
    }

    return enhanced
  }

  return {
    thumbnailCache: computed(() => thumbnailCache.value),
    isGenerating,
    totalProgress,
    currentAsset,
    generateAssetThumbnail,
    generateAssetThumbnails,
    getAssetThumbnail,
    hasThumbnail,
    isGeneratingThumbnail,
    clearThumbnailCache,
    enhanceAssetWithThumbnail
  }
}