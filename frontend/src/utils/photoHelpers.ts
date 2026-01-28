/**
 * Get photo URL - tries multiple extensions if needed
 * Photos are stored as MD5 hash, but files have extensions
 */
export function getPhotoUrl(photoId: string | null | undefined): string {
  if (!photoId) return ''
  
  // If photoId already includes extension (has a dot), use it directly
  if (photoId.includes('.')) {
    return `/photos/${photoId}`
  }
  
  // Otherwise, try common extensions (most photos are jpg)
  // The browser will try to load these in order via onError fallback
  return `/photos/${photoId}.jpg`
}

/**
 * Get photo URL with fallback - tries multiple extensions
 */
export function getPhotoUrlWithFallback(photoId: string | null | undefined): string {
  if (!photoId) return ''
  
  // If photoId already includes extension, use it directly
  if (photoId.includes('.')) {
    return `/photos/${photoId}`
  }
  
  // Try jpg first (most common)
  return `/photos/${photoId}.jpg`
}

/**
 * Handle photo load error - try other extensions
 */
export function handlePhotoError(e: React.SyntheticEvent<HTMLImageElement, Event>, photoId: string) {
  const target = e.target as HTMLImageElement
  if (!photoId || photoId.includes('.')) return
  
  // Try other common extensions
  const extensions = ['.png', '.jpeg', '.webp', '.gif']
  const currentSrc = target.src
  const currentExt = currentSrc.substring(currentSrc.lastIndexOf('.'))
  
  for (const ext of extensions) {
    if (ext !== currentExt) {
      const newSrc = `/photos/${photoId}${ext}`
      target.src = newSrc
      return
    }
  }
  
  // If all extensions fail, use placeholder
  target.src = `https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80`
}
