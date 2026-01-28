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
  
  // Otherwise, try jpg first (most common)
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
 * Tracks which extensions have been tried to avoid infinite loops
 */
export function handlePhotoError(e: React.SyntheticEvent<HTMLImageElement, Event>, photoId: string) {
  const target = e.target as HTMLImageElement
  if (!photoId) {
    // No photo ID - show broken image
    target.style.display = 'none'
    return
  }
  
  // If photoId already has extension, it's a real file that doesn't exist
  if (photoId.includes('.')) {
    // File doesn't exist - hide the image or show error
    target.style.display = 'none'
    // Add a data attribute to mark as missing
    target.setAttribute('data-photo-missing', 'true')
    return
  }
  
  // Try other common extensions
  const extensions = ['.jpg', '.png', '.jpeg', '.webp', '.gif']
  const currentSrc = target.src
  const triedExtensions = target.getAttribute('data-tried-extensions') || ''
  
  // Extract current extension from URL
  const urlMatch = currentSrc.match(/\.(jpg|jpeg|png|webp|gif)/i)
  const currentExt = urlMatch ? `.${urlMatch[1].toLowerCase()}` : '.jpg'
  
  // Try next extension that hasn't been tried
  for (const ext of extensions) {
    if (ext !== currentExt && !triedExtensions.includes(ext)) {
      const newTried = triedExtensions ? `${triedExtensions},${ext}` : ext
      target.setAttribute('data-tried-extensions', newTried)
      target.src = `/photos/${photoId}${ext}`
      return
    }
  }
  
  // All extensions tried and failed - hide image and mark as missing
  target.style.display = 'none'
  target.setAttribute('data-photo-missing', 'true')
  
  // Log for debugging
  console.warn(`Photo not found: ${photoId} (tried: ${triedExtensions || currentExt})`)
}
