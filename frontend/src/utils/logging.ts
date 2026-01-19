import { useDataStore } from '@/stores/dataStore'

export interface LogEntry {
  user_id: string
  action: string
  entity_type: string
  entity_id?: string
  old_value?: string
  new_value?: string
}

export async function logChange(entry: LogEntry) {
  try {
    // Ensure timestamp is in ISOString format with "Z" at the end
    const timestamp = new Date().toISOString()
    
    const store = useDataStore.getState()
    await store.updateData((data) => ({
      ...data,
      logs: [
        {
          id: crypto.randomUUID(),
          user_id: entry.user_id,
          action: entry.action,
          entity_type: entry.entity_type,
          entity_id: entry.entity_id || null,
          old_value: entry.old_value || null,
          new_value: entry.new_value || null,
          timestamp: timestamp
        },
        ...(data.logs || [])
      ]
    }))
  } catch (error) {
    console.error('Failed to log change:', error)
  }
}

export function formatLogMessage(action: string, entityType: string, oldValue?: string, newValue?: string): string {
  if (oldValue && newValue) {
    return `${action} of ${entityType}: "${oldValue}" → "${newValue}"`
  } else if (newValue) {
    return `${action} ${entityType}: "${newValue}"`
  } else {
    return `${action} ${entityType}`
  }
}

