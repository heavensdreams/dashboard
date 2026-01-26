import { useState, useEffect } from 'react'
import { useUserStore } from './stores/userStore'
import { useDataStore } from './stores/dataStore'
import { Dashboard } from './pages/Dashboard'
import { Properties } from './pages/Properties'
import { Bookings } from './pages/Bookings'
import { Users } from './pages/Users'
import { Groups } from './pages/Groups'
import { Logs } from './pages/Logs'
import { Button } from './components/ui/button'
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
    <div className="min-h-screen bg-background">
      {/* Header with Menu */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Rental App</h1>
            <span className="text-muted-foreground">-</span>
            <Button
              variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentPage('dashboard')}
            >
              Dashboard
            </Button>
            <Button
              variant={currentPage === 'properties' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentPage('properties')}
            >
              Properties
            </Button>
            <Button
              variant={currentPage === 'bookings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentPage('bookings')}
            >
              Bookings
            </Button>
            {isAdmin && (
              <>
                <Button
                  variant={currentPage === 'users' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage('users')}
                >
                  Users
                </Button>
                <Button
                  variant={currentPage === 'groups' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage('groups')}
                >
                  Groups
                </Button>
                <Button
                  variant={currentPage === 'logs' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage('logs')}
                >
                  Logs
                </Button>
              </>
            )}
            {isCustomer && (
              <span className="px-2 py-1 text-xs font-semibold rounded bg-green-500 text-white">
                Customer
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>{currentUser?.email}</span>
              {currentUser?.role === 'admin' && (
                <span className="px-2 py-1 text-xs font-semibold rounded bg-red-500 text-white">
                  Admin
                </span>
              )}
            </div>
            <Button variant="outline" onClick={() => setCurrentUser(null)}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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


