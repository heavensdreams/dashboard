import { create } from 'zustand'

interface User {
  id: string
  email: string
  role: 'admin' | 'normal' | 'customer'
  group_id?: string
}

interface UserStore {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
}

// Cookie helper functions
function setCookie(name: string, value: string, days: number = 30) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length))
  }
  return null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
}

// Load user from cookie on initialization
function loadUserFromCookie(): User | null {
  const cookieUser = getCookie('rental_app_user')
  if (cookieUser) {
    try {
      return JSON.parse(cookieUser)
    } catch (e) {
      console.error('Failed to parse user from cookie:', e)
      deleteCookie('rental_app_user')
    }
  }
  return null
}

export const useUserStore = create<UserStore>((set) => ({
  currentUser: loadUserFromCookie(),
  setCurrentUser: (user) => {
    if (user) {
      setCookie('rental_app_user', JSON.stringify(user), 30)
    } else {
      deleteCookie('rental_app_user')
    }
    set({ currentUser: user })
  },
}))


