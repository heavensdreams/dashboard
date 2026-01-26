import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { PropertyDetail } from '@/components/PropertyDetail/PropertyDetail'
import { filterBookingsForCustomer } from '@/utils/filtering'

export function Dashboard() {
  const apartments = useDataStore(state => state.apartments)
  const groups = useDataStore(state => state.groups)
  const userGroups = useDataStore(state => state.user_groups || [])
  
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [today] = useState(() => new Date().toISOString())
  const { currentUser } = useUserStore()
  const isCustomer = currentUser?.role === 'customer'

  // Get customer's group_id
  const customerGroupId = useMemo(() => {
    if (!isCustomer || !currentUser?.id) return null
    const userGroup = userGroups.find((ug: any) => ug.user_id === currentUser.id)
    return userGroup?.group_id || null
  }, [isCustomer, currentUser?.id, userGroups])

  // Get customer's group name (for filtering, but don't show to customer)
  const customerGroupName = useMemo(() => {
    if (!customerGroupId) return null
    const group = groups.find((g: any) => g.id === customerGroupId)
    return group?.name || null
  }, [customerGroupId, groups])

  // Calculate apartments with status
  const propertiesWithStatus = useMemo(() => {
    let filteredApartments = [...apartments]
    
    // For customers: filter by their group only
    if (isCustomer && customerGroupName) {
      filteredApartments = filteredApartments.filter(apt => 
        apt.groups && apt.groups.includes(customerGroupName)
      )
    }
    // Filter by group (admin/normal users only)
    else if (!isCustomer && selectedGroup !== 'all') {
      const group = groups.find((g: any) => g.name === selectedGroup)
      if (group) {
        filteredApartments = filteredApartments.filter(apt => apt.groups && apt.groups.includes(group.name))
      }
    }
    
    const todayDate = new Date(today)
    
    return filteredApartments.map(apartment => {
      // For customers, filter bookings to remove personal info
      let apartmentBookings = apartment.bookings || []
      if (isCustomer) {
        apartmentBookings = filterBookingsForCustomer(apartmentBookings)
      }
      
      // Check if currently occupied
      const isOccupied = apartmentBookings.some((b: any) => {
        const start = new Date(b.start_date)
        const end = new Date(b.end_date)
        return start <= todayDate && end >= todayDate
      })
      
      // Find next upcoming booking
      const nextBooking = apartmentBookings
        .filter((b: any) => {
          const start = new Date(b.start_date)
          return start > todayDate
        })
        .sort((a: any, b: any) => {
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        })[0]

      return {
        ...apartment,
        status: isOccupied ? 'occupied' : 'available' as 'occupied' | 'available',
        next_booking: nextBooking ? {
          start_date: nextBooking.start_date.endsWith('Z') ? nextBooking.start_date : new Date(nextBooking.start_date).toISOString(),
          end_date: nextBooking.end_date.endsWith('Z') ? nextBooking.end_date : new Date(nextBooking.end_date).toISOString()
        } : null
      }
    })
  }, [apartments, groups, selectedGroup, today, isCustomer, customerGroupName])

  // Calculate stats
  const stats = useMemo(() => {
    const totalProperties = propertiesWithStatus.length
    const occupiedProperties = propertiesWithStatus.filter(p => p.status === 'occupied').length
    const availableProperties = totalProperties - occupiedProperties
    const totalBookings = propertiesWithStatus.reduce((sum, p) => {
      const bookings = p.bookings || []
      return sum + (isCustomer ? filterBookingsForCustomer(bookings).length : bookings.length)
    }, 0)

    return {
      totalProperties,
      occupiedProperties,
      availableProperties,
      totalBookings
    }
  }, [propertiesWithStatus, isCustomer])

  const getGroupBookingStatus = () => {
    if (isCustomer) {
      return null
    }

    if (propertiesWithStatus.length === 0) {
      return { text: 'No properties found', color: 'bg-gray-500', textColor: 'text-white' }
    }

    const allBooked = propertiesWithStatus.every(p => p.status === 'occupied')
    const someBooked = propertiesWithStatus.some(p => p.status === 'occupied')
    
    if (allBooked) {
      return { text: 'All properties booked', color: 'bg-red-500', textColor: 'text-white' }
    } else if (someBooked) {
      return { text: 'Some properties booked', color: 'bg-yellow-500', textColor: 'text-white' }
    } else {
      return { text: 'No properties booked', color: 'bg-green-500', textColor: 'text-white' }
    }
  }

  const groupStatus = getGroupBookingStatus()


  return (
    <div className="space-y-6">
      {/* Group Filter - Hidden for customers */}
      {!isCustomer && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Label className="font-semibold">Filter by Group:</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedGroup === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGroup('all')}
                >
                  All
                </Button>
                {groups.map((group: any) => (
                  <Button
                    key={group.id}
                    variant={selectedGroup === group.name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedGroup(group.name)}
                  >
                    {group.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group Booking Status - Admin/Normal only */}
      {!isCustomer && groupStatus && (
        <Card>
          <CardContent className="py-4">
            <div className={`${groupStatus.color} ${groupStatus.textColor} px-4 py-2 text-center font-semibold rounded`}>
              {groupStatus.text}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Landing Page - Stats and Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold mb-2">{stats.totalProperties}</div>
            <div className="text-sm text-muted-foreground">Total Properties</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold mb-2 text-green-600">{stats.availableProperties}</div>
            <div className="text-sm text-muted-foreground">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold mb-2 text-red-600">{stats.occupiedProperties}</div>
            <div className="text-sm text-muted-foreground">Occupied</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold mb-2">{stats.totalBookings}</div>
            <div className="text-sm text-muted-foreground">Total Bookings</div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              size="lg"
              className="h-24 flex flex-col items-center justify-center"
              onClick={() => {
                const event = new CustomEvent('navigate', { detail: 'properties' })
                window.dispatchEvent(event)
              }}
            >
              <span className="text-2xl mb-2">🏠</span>
              <span>View Properties</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-24 flex flex-col items-center justify-center"
              onClick={() => {
                const event = new CustomEvent('navigate', { detail: 'bookings' })
                window.dispatchEvent(event)
                // Also set calendar view
                setTimeout(() => {
                  const calendarEvent = new CustomEvent('setBookingView', { detail: 'calendar' })
                  window.dispatchEvent(calendarEvent)
                }, 100)
              }}
            >
              <span className="text-2xl mb-2">📅</span>
              <span>View Calendar</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-24 flex flex-col items-center justify-center"
              onClick={() => {
                const event = new CustomEvent('navigate', { detail: 'bookings' })
                window.dispatchEvent(event)
                // Also set list view
                setTimeout(() => {
                  const listEvent = new CustomEvent('setBookingView', { detail: 'list' })
                  window.dispatchEvent(listEvent)
                }, 100)
              }}
            >
              <span className="text-2xl mb-2">📋</span>
              <span>View Bookings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Property Detail Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <PropertyDetail
              propertyId={selectedProperty}
              onClose={() => setSelectedProperty(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
