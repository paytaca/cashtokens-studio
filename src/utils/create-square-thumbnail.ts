import { loadImage } from './load-image'

export async function createSquareThumbnail (file: File, maxSize: number): Promise<Blob>  {
    const url = URL.createObjectURL(file)
    const img = await loadImage(url)
    URL.revokeObjectURL(url)
  
    const size = Math.min(img.width, img.height)
    const offsetX = (img.width - size) / 2
    const offsetY = (img.height - size) / 2
    const targetSize = Math.min(maxSize, size)
  
    const canvas = document.createElement('canvas')
    canvas.width = targetSize
    canvas.height = targetSize
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize)
  
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9)
    })
  }
  