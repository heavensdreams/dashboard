import { useState, useEffect } from 'react'
import { useUserStore } from './stores/userStore'
import { useDataStore } from './stores/dataStore'
import { Dashboard } from './pages/Dashboard'
import { Properties } from './pages/Properties'
import { Bookings } from './pages/Bookings'
import { Users } from './pages/Users'
import { Groups } from './pages/Groups'
import { Logs } from './pages/Logs'
import { Login } from './components/Login'

type Page = 'dashboard' | 'properties' | 'bookings' | 'users' | 'groups' | 'logs'

function App() {
  const { currentUser, setCurrentUser } = useUserStore()
  const { loadData, loading } = useDataStore()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  useEffect(() => {
    // Load all data on app start (even when not logged in)
    loadData()
  }, [loadData])

  // Handle navigation events from Dashboard
  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      const page = e.detail as Page
      if (['dashboard', 'properties', 'bookings', 'users', 'groups', 'logs'].includes(page)) {
        setCurrentPage(page as Page)
      }
    }

    const handleSetBookingView = (e: CustomEvent) => {
      const view = e.detail as 'calendar' | 'list'
      if (view === 'calendar' || view === 'list') {
        setCurrentPage('bookings')
        // The Bookings component will handle the view change via event listener
      }
    }

    window.addEventListener('navigate', handleNavigate as EventListener)
    window.addEventListener('setBookingView', handleSetBookingView as EventListener)

    return () => {
      window.removeEventListener('navigate', handleNavigate as EventListener)
      window.removeEventListener('setBookingView', handleSetBookingView as EventListener)
    }
  }, [])

  // Redirect public view routes to login (all access requires login)
  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/view\/(.+)$/)
    if (pathMatch && !currentUser) {
      // Redirect to home to show login
      window.history.replaceState({}, '', '/')
    }
  }, [currentUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    )
  }

  // Show login page if not logged in
  if (!currentUser) {
    return <Login />
  }

  const isAdmin = currentUser?.role === 'admin'
  const isCustomer = currentUser?.role === 'customer'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] via-[#FFF8E7] to-white">
      {/* Header with Logo - Matching PublicPropertyView style */}
      <header className="bg-white/95 backdrop-blur-md border-b-2 border-[#D4AF37]/30 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              {/* Logo */}
              <div className="flex items-center gap-2 sm:gap-3">
                <img 
                  src="https://framerusercontent.com/images/SYXEfWLXQTVuo97yIbacWB2oOIw.png?width=581&height=440" 
                  alt="Heaven's Dreams Logo" 
                  className="h-8 sm:h-10 lg:h-14 w-auto object-contain"
                />
                <div className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-light text-[#2C3E1F] tracking-wide">Heaven's Dreams</h1>
                  <p className="text-xs text-[#6B7C4A] font-light">Luxury Holiday Homes</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Navigation Links */}
              <div className="hidden lg:flex items-center gap-6 text-sm text-[#6B7C4A] font-light">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`hover:text-[#D4AF37] transition-colors duration-300 relative group ${
                    currentPage === 'dashboard' ? 'text-[#D4AF37]' : ''
                  }`}
                >
                  Dashboard
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] transition-all duration-300 ${
                    currentPage === 'dashboard' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </button>
                <button
                  onClick={() => setCurrentPage('properties')}
                  className={`hover:text-[#D4AF37] transition-colors duration-300 relative group ${
                    currentPage === 'properties' ? 'text-[#D4AF37]' : ''
                  }`}
                >
                  Properties
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] transition-all duration-300 ${
                    currentPage === 'properties' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </button>
                {!isCustomer && (
                  <>
                    <button
                      onClick={() => setCurrentPage('bookings')}
                      className={`hover:text-[#D4AF37] transition-colors duration-300 relative group ${
                        currentPage === 'bookings' ? 'text-[#D4AF37]' : ''
                      }`}
                    >
                      Bookings
                      <span className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] transition-all duration-300 ${
                        currentPage === 'bookings' ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}></span>
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => setCurrentPage('users')}
                          className={`hover:text-[#D4AF37] transition-colors duration-300 relative group ${
                            currentPage === 'users' ? 'text-[#D4AF37]' : ''
                          }`}
                        >
                          Users
                          <span className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] transition-all duration-300 ${
                            currentPage === 'users' ? 'w-full' : 'w-0 group-hover:w-full'
                          }`}></span>
                        </button>
                        <button
                          onClick={() => setCurrentPage('groups')}
                          className={`hover:text-[#D4AF37] transition-colors duration-300 relative group ${
                            currentPage === 'groups' ? 'text-[#D4AF37]' : ''
                          }`}
                        >
                          Groups
                          <span className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] transition-all duration-300 ${
                            currentPage === 'groups' ? 'w-full' : 'w-0 group-hover:w-full'
                          }`}></span>
                        </button>
                        <button
                          onClick={() => setCurrentPage('logs')}
                          className={`hover:text-[#D4AF37] transition-colors duration-300 relative group ${
                            currentPage === 'logs' ? 'text-[#D4AF37]' : ''
                          }`}
                        >
                          Logs
                          <span className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] transition-all duration-300 ${
                            currentPage === 'logs' ? 'w-full' : 'w-0 group-hover:w-full'
                          }`}></span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
              {/* User Info and Logout */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6B7C4A] font-light hidden sm:inline">{currentUser?.email}</span>
                  {currentUser?.role === 'admin' && (
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-[#2C3E1F]">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setCurrentUser(null)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm text-[#6B7C4A] hover:text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-md transition-colors duration-300 font-light"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-16">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'properties' && <Properties />}
        {currentPage === 'bookings' && <Bookings />}
        {isAdmin && currentPage === 'users' && <Users />}
        {isAdmin && currentPage === 'groups' && <Groups />}
        {isAdmin && currentPage === 'logs' && <Logs />}
      </main>
    </div>
  )
}

export default App


