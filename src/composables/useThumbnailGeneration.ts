import { ref } from 'vue'

export interface ThumbnailOptions {
  width?: number
  height?: number
  quality?: number
  frameCount?: number // For video sprite sheets
  format?: 'image/jpeg' | 'image/png' | 'image/webp'
}

export function useThumbnailGeneration() {
  const isGenerating = ref(false)
  const generationProgress = ref(0)

  /**
   * Generate a thumbnail from an image file
   */
  async function generateImageThumbnail(
    file: File, 
    options: ThumbnailOptions = {}
  ): Promise<string> {
    const { width = 300, height = 200, quality = 0.8, format = 'image/jpeg' } = options

    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      img.onload = () => {
        // Calculate aspect ratio preserving dimensions
        const aspectRatio = img.width / img.height
        let targetWidth = width
        let targetHeight = height

        if (aspectRatio > targetWidth / targetHeight) {
          targetHeight = targetWidth / aspectRatio
        } else {
          targetWidth = targetHeight * aspectRatio
        }

        canvas.width = width
        canvas.height = height

        // Fill with black background
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, width, height)

        // Center the image
        const x = (width - targetWidth) / 2
        const y = (height - targetHeight) / 2

        ctx.drawImage(img, x, y, targetWidth, targetHeight)

        const thumbnail = canvas.toDataURL(format, quality)
        resolve(thumbnail)
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Generate a sprite sheet thumbnail from a video file
   */
  async function generateVideoSprite(
    file: File,
    options: ThumbnailOptions = {}
  ): Promise<{ spriteUrl: string; rows: number; columns: number }> {
    const { 
      width = 300, 
      height = 200, 
      frameCount = 50, 
      quality = 0.8, 
      format = 'image/jpeg' 
    } = options

    isGenerating.value = true
    generationProgress.value = 0

    try {
      const video = document.createElement('video')
      video.muted = true
      video.preload = 'metadata'

      return new Promise((resolve, reject) => {
        video.onloadedmetadata = async () => {
          try {
            const duration = video.duration
            const rows = Math.ceil(Math.sqrt(frameCount))
            const columns = Math.ceil(frameCount / rows)
            
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (!ctx) {
              reject(new Error('Canvas context not available'))
              return
            }

            canvas.width = width * columns
            canvas.height = height * rows

            // Fill with black background
            ctx.fillStyle = '#000000'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            const frameInterval = duration / frameCount
            let currentFrame = 0

            const captureFrame = () => {
              if (currentFrame >= frameCount) {
                const spriteUrl = canvas.toDataURL(format, quality)
                resolve({ spriteUrl, rows, columns })
                isGenerating.value = false
                return
              }

              const row = Math.floor(currentFrame / columns)
              const col = currentFrame % columns
              const x = col * width
              const y = row * height

              // Calculate aspect ratio preserving dimensions
              const aspectRatio = video.videoWidth / video.videoHeight
              let targetWidth = width
              let targetHeight = height

              if (aspectRatio > targetWidth / targetHeight) {
                targetHeight = targetWidth / aspectRatio
              } else {
                targetWidth = targetHeight * aspectRatio
              }

              // Center the frame
              const offsetX = (width - targetWidth) / 2
              const offsetY = (height - targetHeight) / 2

              ctx.drawImage(video, x + offsetX, y + offsetY, targetWidth, targetHeight)

              currentFrame++
              generationProgress.value = (currentFrame / frameCount) * 100
              
              // Seek to next frame
              video.currentTime = currentFrame * frameInterval
            }

            video.onseeked = captureFrame
            video.currentTime = 0 // Start capture
          } catch (error) {
            reject(error)
            isGenerating.value = false
          }
        }

        video.onerror = () => {
          reject(new Error('Failed to load video'))
          isGenerating.value = false
        }

        video.src = URL.createObjectURL(file)
      })
    } catch (error) {
      isGenerating.value = false
      throw error
    }
  }

  /**
   * Generate a simple video thumbnail (first frame)
   */
  async function generateVideoThumbnail(
    file: File,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    const { width = 300, height = 200, quality = 0.8, format = 'image/jpeg' } = options

    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.muted = true
      video.preload = 'metadata'

      video.onloadeddata = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        canvas.width = width
        canvas.height = height

        // Calculate aspect ratio preserving dimensions
        const aspectRatio = video.videoWidth / video.videoHeight
        let targetWidth = width
        let targetHeight = height

        if (aspectRatio > targetWidth / targetHeight) {
          targetHeight = targetWidth / aspectRatio
        } else {
          targetWidth = targetHeight * aspectRatio
        }

        // Fill with black background
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, width, height)

        // Center the video frame
        const x = (width - targetWidth) / 2
        const y = (height - targetHeight) / 2

        ctx.drawImage(video, x, y, targetWidth, targetHeight)

        const thumbnail = canvas.toDataURL(format, quality)
        resolve(thumbnail)
      }

      video.onerror = () => reject(new Error('Failed to load video'))
      video.src = URL.createObjectURL(file)
    })
  }

  /**
   * Generate thumbnail based on file type
   */
  async function generateThumbnail(
    file: File,
    options: ThumbnailOptions = {}
  ): Promise<{ thumbnail: string; spriteUrl?: string; rows?: number; columns?: number }> {
    const mimeType = file.type.toLowerCase()

    if (mimeType.startsWith('image/')) {
      const thumbnail = await generateImageThumbnail(file, options)
      return { thumbnail }
    } else if (mimeType.startsWith('video/')) {
      const thumbnail = await generateVideoThumbnail(file, options)
      
      // Also generate sprite sheet for videos if frameCount is specified
      if (options.frameCount && options.frameCount > 1) {
        try {
          const { spriteUrl, rows, columns } = await generateVideoSprite(file, options)
          return { thumbnail, spriteUrl, rows, columns }
        } catch (error) {
          console.warn('Failed to generate video sprite:', error)
          return { thumbnail }
        }
      }
      
      return { thumbnail }
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`)
    }
  }

  /**
   * Check if thumbnail generation is supported for a file type
   */
  function isThumbnailSupported(file: File): boolean {
    const mimeType = file.type.toLowerCase()
    return mimeType.startsWith('image/') || mimeType.startsWith('video/')
  }

  return {
    isGenerating,
    generationProgress,
    generateThumbnail,
    generateImageThumbnail,
    generateVideoThumbnail,
    generateVideoSprite,
    isThumbnailSupported
  }
}