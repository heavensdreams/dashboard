// Simplified API client - only LOAD DATA and SAVE DATA
const API_URL = '/api'

export interface AppData {
  users: any[]
  groups: any[]
  apartments: any[]
  logs?: any[]
  user_groups?: any[]
  property_groups?: any[]
}

// Load all data (passwords excluded by backend)
export async function loadAllData(): Promise<AppData> {
  const response = await fetch(`${API_URL}/data`)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to load data: ${response.status} ${errorText}`)
  }
  const data = await response.json()
  
  // Ensure all required tables exist
  const requiredTables = ['users', 'groups', 'apartments']
  for (const table of requiredTables) {
    if (!Array.isArray(data[table])) {
      console.warn(`Missing or invalid table: ${table}, initializing as empty array`)
      data[table] = []
    }
  }
  // Initialize logs if missing
  if (!Array.isArray(data.logs)) {
    data.logs = []
  }
  // Initialize user_groups if missing
  if (!Array.isArray(data.user_groups)) {
    data.user_groups = []
  }
  // Initialize property_groups if missing
  if (!Array.isArray(data.property_groups)) {
    data.property_groups = []
  }
  
  return data as AppData
}

// Save all data
export async function saveAllData(data: AppData): Promise<void> {
  const response = await fetch(`${API_URL}/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to save data: ${response.status} ${errorText}`)
  }
}

// Login endpoint
export async function login(credentials: { email: string; password: string }): Promise<any> {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Login failed: ${response.status} ${errorText}`)
  }
  return response.json()
}

// Photo upload (unchanged)
export async function uploadPhoto(file: File): Promise<{ md5: string; filename: string }> {
  const formData = new FormData()
  formData.append('photo', file)
  
  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData
  })
  if (!response.ok) throw new Error('Failed to upload photo')
  return response.json()
}
