import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookingForm } from '@/components/BookingForm'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { filterBookingsForCustomer, filterBookingsBySearch, filterBookingsByProperty } from '@/utils/filtering'
import { getAllBookings } from '@/utils/apartmentHelpers'
import type { Booking as ApartmentBooking } from '@/utils/apartmentHelpers'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths, isSameDay, isWithinInterval } from 'date-fns'

interface EnrichedBooking {
  id: string
  property_id: string
  user_id: string
  start_date: string
  end_date: string
  extra_info?: string
  created_at?: string
  property_name?: string
  user_email?: string
}

export function Calendar() {
  const apartments = useDataStore(state => state.apartments)
  const groups = useDataStore(state => state.groups)
  const userGroups = useDataStore(state => state.user_groups || [])
  const users = useDataStore(state => state.users)
  const { currentUser } = useUserStore()
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'normal'
  const isCustomer = currentUser?.role === 'customer'

  // Get customer's group name
  const customerGroupName = useMemo(() => {
    if (!isCustomer || !currentUser?.id) return null
    const userGroup = userGroups.find((ug: any) => ug.user_id === currentUser.id)
    if (!userGroup) return null
    const group = groups.find((g: any) => g.id === userGroup.group_id)
    return group?.name || null
  }, [isCustomer, currentUser?.id, userGroups, groups])

  // Filter apartments by customer group
  const filteredApartments = useMemo(() => {
    if (isCustomer && customerGroupName) {
      return apartments.filter(apt => apt.groups && apt.groups.includes(customerGroupName))
    }
    return apartments
  }, [apartments, isCustomer, customerGroupName])
  
  // Extract all bookings from filtered apartments
  const allBookings = useMemo(() => getAllBookings(filteredApartments), [filteredApartments])
  
  // Filter bookings for customers and enrich with property names and user emails
  const enrichedBookings = useMemo(() => {
    let filtered: ApartmentBooking[] = [...allBookings]
    
    // Enrich first, then filter for customers
    const enriched = filtered.map((booking): EnrichedBooking => {
      const apartment = apartments.find((a: any) => 
        a.bookings && a.bookings.some((b: any) => b.id === booking.id)
      )
      const user = users.find((u: any) => u.id === booking.user_id)
      return {
        id: booking.id,
        property_id: booking.property_id,
        user_id: booking.user_id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        extra_info: booking.extra_info,
        created_at: booking.created_at,
        property_name: apartment?.name || 'Unknown Property',
        user_email: user?.email
      }
    })
    
    // Filter for customers after enrichment
    if (isCustomer) {
      return filterBookingsForCustomer(enriched as any) as EnrichedBooking[]
    }
    
    return enriched
  }, [allBookings, filteredApartments, users, isCustomer])
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  
  // Filters
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Use memoized filtered bookings for better performance
  const filteredBookings = useMemo(() => {
    let result: EnrichedBooking[] = enrichedBookings
    
    // Filter by property (frontend)
    result = filterBookingsByProperty(result as any, propertyFilter) as EnrichedBooking[]
    
    // Filter by search term (frontend)
    result = filterBookingsBySearch(result as any, searchTerm, isCustomer) as EnrichedBooking[]
    
    return result
  }, [enrichedBookings, propertyFilter, searchTerm, isCustomer])

  const getBookingsForDate = (date: Date) => {
    return filteredBookings.filter(booking => {
      const start = new Date(booking.start_date)
      const end = new Date(booking.end_date)
      return isWithinInterval(date, { start, end })
    })
  }

  // Get availability status for a date
  const getDateAvailabilityStatus = (date: Date): 'red' | 'yellow' | 'green' => {
    const apartmentsToCheck = propertyFilter === 'all' 
      ? apartments 
      : apartments.filter((a: any) => a.id === propertyFilter)
    
    if (apartmentsToCheck.length === 0) return 'green'
    
    // Get all bookings for this date
    const allBookingsForDate = enrichedBookings.filter(booking => {
      const start = new Date(booking.start_date)
      const end = new Date(booking.end_date)
      return isWithinInterval(date, { start, end })
    })
    
    // Get unique apartment IDs that are booked on this date
    const bookedApartmentIds = new Set(
      allBookingsForDate.map(booking => booking.property_id)
    )
    
    const bookedCount = bookedApartmentIds.size
    const totalCount = apartmentsToCheck.length
    
    // Red: All apartments booked
    if (bookedCount === totalCount && totalCount > 0) {
      return 'red'
    }
    
    // Yellow: Some apartments booked
    if (bookedCount > 0 && bookedCount < totalCount) {
      return 'yellow'
    }
    
    // Green: No bookings
    return 'green'
  }

  const handleDateClick = (date: Date) => {
    if (!canEdit) return
    setSelectedDate(date)
    setShowBookingForm(true)
  }

  const handleBookingSave = () => {
    setShowBookingForm(false)
    setSelectedDate(null)
    setSelectedProperty(null)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={isCustomer ? "Search by property name..." : "Search by property, guest, or notes..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Properties</option>
                {apartments.map((apt: any) => (
                  <option key={apt.id} value={apt.id}>{apt.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredBookings.length} of {enrichedBookings.length} bookings
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{format(currentDate, 'MMMM yyyy')}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={previousMonth}>Previous</Button>
              <Button variant="outline" onClick={goToToday}>Today</Button>
              <Button variant="outline" onClick={nextMonth}>Next</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <div key={day} className="text-center font-semibold text-sm py-2">
                {day}
              </div>
            ))}
            {days.map(day => {
              const dayBookings = getBookingsForDate(day)
              const isToday = isSameDay(day, new Date())
              const availabilityStatus = getDateAvailabilityStatus(day)
              
              let bgColor = ''
              if (availabilityStatus === 'red') {
                bgColor = 'bg-red-100 border-red-300'
              } else if (availabilityStatus === 'yellow') {
                bgColor = 'bg-yellow-100 border-yellow-300'
              } else {
                bgColor = 'bg-green-100 border-green-300'
              }
              
              const finalBgColor = isToday ? 'bg-blue-50 border-blue-300' : bgColor
              
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] border rounded p-2 ${
                    canEdit ? 'cursor-pointer hover:bg-muted' : ''
                  } ${finalBgColor}`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayBookings.slice(0, 2).map(booking => {
                      const propertyName = booking.property_name || 'Unknown Property'
                      return (
                        <div
                          key={booking.id}
                          className="text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 truncate"
                          title={isCustomer ? `${propertyName}: Booked` : `${propertyName}`}
                        >
                          {propertyName}
                        </div>
                      )
                    })}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayBookings.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Booking Form */}
      {showBookingForm && selectedDate && (
        <BookingForm
          propertyId={selectedProperty || undefined}
          startDate={selectedDate}
          endDate={selectedDate}
          onSave={handleBookingSave}
          onCancel={() => {
            setShowBookingForm(false)
            setSelectedDate(null)
            setSelectedProperty(null)
          }}
        />
      )}

      {/* Bookings List */}
      {filteredBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredBookings.map(booking => (
                <div key={booking.id} className="border-b pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{booking.property_name || 'Unknown Property'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                      </p>
                      {!isCustomer && booking.user_email && (
                        <p className="text-xs text-muted-foreground">Guest: {booking.user_email}</p>
                      )}
                      {!isCustomer && booking.extra_info && (
                        <p className="text-xs text-muted-foreground mt-1">{booking.extra_info}</p>
                      )}
                      {isCustomer && (
                        <p className="text-xs text-muted-foreground mt-1">Booked</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
