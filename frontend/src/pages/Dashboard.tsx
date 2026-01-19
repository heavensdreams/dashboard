import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { PropertyDetail } from '@/components/PropertyDetail/PropertyDetail'
import { filterBookingsForCustomer } from '@/utils/filtering'

interface Property {
  id: string
  name: string
  address: string
  status: 'occupied' | 'available'
  next_booking: {
    start_date: string
    end_date: string
  } | null
}

export function Dashboard() {
  const apartments = useDataStore(state => state.apartments)
  const groups = useDataStore(state => state.groups)
  
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [today] = useState(() => new Date().toISOString())
  const { currentUser } = useUserStore()
  const isCustomer = currentUser?.role === 'customer'

  // Calculate apartments with status
  const propertiesWithStatus = useMemo(() => {
    let filteredApartments = [...apartments]
    
    // Filter by group (admin/normal users only)
    if (!isCustomer && selectedGroup !== 'all') {
      const group = groups.find((g: any) => g.name === selectedGroup)
      if (group) {
        filteredApartments = filteredApartments.filter(apt => apt.groups.includes(group.name))
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
  }, [apartments, groups, selectedGroup, today, isCustomer])

  const getPropertyStatus = (property: Property) => {
    if (property.status === 'occupied') {
      return { text: 'Booked', color: 'bg-red-500', textColor: 'text-white' }
    }
    
    if (property.next_booking) {
      const nextDate = new Date(property.next_booking.start_date)
      const todayDate = new Date(today)
      const daysUntil = Math.ceil((nextDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntil <= 0) {
        return { text: 'Booked', color: 'bg-red-500', textColor: 'text-white' }
      }
      
      return { 
        text: `Booked in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`, 
        color: 'bg-yellow-500', 
        textColor: 'text-white' 
      }
    }
    
    return { text: 'No booking', color: 'bg-green-500', textColor: 'text-white' }
  }

  const getGroupBookingStatus = () => {
    if (isCustomer) {
      return null
    }

    // For now, show status for all properties (user groups not implemented in new structure)
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

      {/* Properties Grid */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Properties</h3>
        {propertiesWithStatus.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No properties found{selectedGroup !== 'all' ? ' in selected group' : ''}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {propertiesWithStatus.map((property) => {
              const status = getPropertyStatus(property)
              return (
                <Card 
                  key={property.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedProperty(property.id)}
                >
                  <CardContent className="p-0">
                    <div className={`${status.color} ${status.textColor} px-4 py-2 text-center font-semibold`}>
                      {status.text}
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-lg mb-2">{property.name}</h4>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                      {!isCustomer && property.groups && property.groups.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Groups: {property.groups.join(', ')}
                        </p>
                      )}
                      {property.next_booking && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Next: {new Date(property.next_booking.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })} - {new Date(property.next_booking.end_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

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
