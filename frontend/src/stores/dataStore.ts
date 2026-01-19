import { create } from 'zustand'
import { loadAllData, saveAllData, type AppData } from '../lib/api'

interface DataStore extends AppData {
  loading: boolean
  error: string | null
  loadData: () => Promise<void>
  saveData: () => Promise<void>
  updateData: (updater: (data: AppData) => AppData) => Promise<void>
}

const initialData: AppData = {
  users: [],
  groups: [],
  apartments: [],
  logs: []
}

export const useDataStore = create<DataStore>((set, get) => ({
  ...initialData,
  loading: false,
  error: null,
  
  loadData: async () => {
    set({ loading: true, error: null })
    try {
      const data = await loadAllData()
      set({ ...data, loading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data'
      set({ error: errorMessage, loading: false })
      console.error('Failed to load data:', error)
    }
  },
  
  saveData: async () => {
    const state = get()
    const dataToSave: AppData = {
      users: state.users,
      groups: state.groups,
      apartments: state.apartments,
      logs: state.logs || []
    }
    
    try {
      await saveAllData(dataToSave)
      set({ error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save data'
      set({ error: errorMessage })
      console.error('Failed to save data:', error)
      throw error
    }
  },
  
  updateData: async (updater: (data: AppData) => AppData) => {
    const state = get()
    const currentData: AppData = {
      users: state.users,
      groups: state.groups,
      apartments: state.apartments,
      logs: state.logs || []
    }
    
    const updatedData = updater(currentData)
    set(updatedData)
    
    // Auto-save after update
    try {
      await get().saveData()
    } catch (error) {
      // Revert on save failure
      set(currentData)
      throw error
    }
  }
}))

