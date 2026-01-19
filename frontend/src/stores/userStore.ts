import { create } from 'zustand'

interface User {
  id: string
  email: string
  role: 'admin' | 'normal' | 'customer'
}

interface UserStore {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
}

export const useUserStore = create<UserStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}))


