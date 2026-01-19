// Legacy file - kept for compatibility but no longer used
// All API calls now go through dataStore

export async function initElectric() {
  // Check API health
  try {
    const response = await fetch('/api/health')
    if (response.ok) {
      console.log('API connected successfully!')
      return true
    }
  } catch (error) {
    console.error('API not available:', error)
  }
  return false
}
