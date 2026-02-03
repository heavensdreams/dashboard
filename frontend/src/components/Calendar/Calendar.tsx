import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BookingForm } from '@/components/BookingForm'
import { Tooltip } from '@/components/ui/tooltip'
import { Modal } from '@/components/ui/modal'
import { DateBookingModal } from '@/components/DateBookingModal'
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
  client_name?: string
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

  const groupOrEmailFilter = useDataStore(state => state.groupOrEmailFilter)

  // Filter apartments by customer email (direct assignment) OR customer group name
  // OR by shared filter for admin/normal users
  const filteredApartments = useMemo(() => {
    let filtered = [...apartments]
    
    // For customers: filter by their email (direct assignment) OR their group name
    if (isCustomer && currentUser?.email) {
      filtered = filtered.filter(apt => {
        if (!apt.groups || apt.groups.length === 0) return false
        // Check if property is assigned directly to customer's email
        if (apt.groups.includes(currentUser.email)) return true
        // Check if property is assigned to customer's group (if they have one)
        if (customerGroupName && apt.groups.includes(customerGroupName)) return true
        return false
      })
    }
    // Combined Group/Email filter (admin/normal users only)
    else if (!isCustomer && groupOrEmailFilter !== 'all') {
      // Check if it's a group name or customer email
      const isGroup = groups.some((g: any) => g.name === groupOrEmailFilter)
      
      if (isGroup) {
        // Filter by group name
        filtered = filtered.filter(apt => apt.groups && apt.groups.includes(groupOrEmailFilter))
      } else {
        // Filter by customer email - show properties assigned to this customer
        const filterEmail = groupOrEmailFilter
        const filterUser = users.find((u: any) => u.email === filterEmail && u.role === 'customer')
        
        if (filterUser) {
          // Find the user's group if they have one
          let filterUserGroupName: string | null = null
          const filterUserGroup = userGroups.find((ug: any) => ug.user_id === filterUser.id)
          if (filterUserGroup) {
            const filterUserGroupObj = groups.find((g: any) => g.id === filterUserGroup.group_id)
            filterUserGroupName = filterUserGroupObj?.name || null
          }
          
          filtered = filtered.filter(apt => {
            if (!apt.groups || apt.groups.length === 0) return false
            // Check if property is assigned directly to the customer's email
            if (apt.groups.includes(filterEmail)) return true
            // Check if property is assigned to the customer's group (if they have one)
            if (filterUserGroupName && apt.groups.includes(filterUserGroupName)) return true
            return false
          })
        } else {
          // Email not found, show nothing
          filtered = []
        }
      }
    }
    
    return filtered
  }, [apartments, isCustomer, currentUser?.email, customerGroupName, groupOrEmailFilter, groups, users, userGroups])
  
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
        client_name: booking.client_name,
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
  const [isMobile, setIsMobile] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalBookings, setModalBookings] = useState<EnrichedBooking[]>([])
  const [modalDate, setModalDate] = useState<Date | null>(null)
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [adminModalDate, setAdminModalDate] = useState<Date | null>(null)
  const [adminModalBookings, setAdminModalBookings] = useState<EnrichedBooking[]>([])
  
  // Filters
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    // Use filteredApartments for customers, all apartments for admin/normal
    const apartmentsToCheck = propertyFilter === 'all' 
      ? filteredApartments 
      : filteredApartments.filter((a: any) => a.id === propertyFilter)
    
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

  const handleDateClick = (date: Date, bookings: EnrichedBooking[]) => {
    // On mobile, show modal with booking details (CUSTOMERS ONLY)
    if (isCustomer && isMobile && bookings.length > 0) {
      setModalDate(date)
      setModalBookings(bookings)
      setModalOpen(true)
      return
    }
    
    // For admin/normal users: show booking management modal
    // Filter bookings to only include those whose properties are in filteredApartments
    // (bookings are already filtered by propertyFilter and searchTerm via filteredBookings)
    if (canEdit) {
      // Filter bookings to only show those for properties in the filtered apartments list
      // This respects the groupOrEmailFilter
      const filteredBookingsForDate = bookings.filter(booking => 
        filteredApartments.some((a: any) => a.id === booking.property_id)
      )
      
      setAdminModalDate(date)
      setAdminModalBookings(filteredBookingsForDate)
      setAdminModalOpen(true)
      return
    }
  }

  const handleBookingSave = () => {
    setShowBookingForm(false)
    setSelectedDate(null)
    setSelectedProperty(null)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {!isCustomer && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by property, guest, or notes..."
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
      )}

      {/* Calendar */}
      <div className="bg-white p-3 sm:p-4 lg:p-8 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl border-2 border-[#D4AF37]/20 overflow-x-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8 min-w-[280px]">
          <button
            onClick={previousMonth}
            className="p-2 sm:p-3 hover:bg-gradient-to-br hover:from-[#D4AF37]/10 hover:to-[#F4D03F]/10 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h4 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-light text-[#2C3E1F] tracking-wide gold-text-gradient px-2">
            {format(currentDate, 'MMMM yyyy')}
          </h4>
          <button
            onClick={nextMonth}
            className="p-2 sm:p-3 hover:bg-gradient-to-br hover:from-[#D4AF37]/10 hover:to-[#F4D03F]/10 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Next month"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 lg:gap-2 mb-2 sm:mb-3 min-w-[280px]">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs sm:text-sm font-light text-[#6B7C4A] py-1.5 sm:py-2 lg:py-3">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.substring(0, 1)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 lg:gap-2 min-w-[280px]">
          {(() => {
            const monthStart = startOfMonth(currentDate)
            const firstDayOfWeek = monthStart.getDay()
            const emptyDays = Array(firstDayOfWeek).fill(null)
            
            return [
              ...emptyDays.map((_, i) => <div key={`empty-${i}`} className="aspect-square"></div>),
              ...days.map(day => {
                const dayBookings = getBookingsForDate(day)
              const isToday = isSameDay(day, new Date())
              const availabilityStatus = getDateAvailabilityStatus(day)
              const hasBookings = dayBookings.length > 0
              
              // Get tooltip content for the day (all bookings)
              const tooltipContent = hasBookings ? (
                <div className="text-left space-y-2">
                  {dayBookings.map(booking => {
                    const propertyName = booking.property_name || 'Unknown Property'
                    const guestName = booking.client_name || booking.extra_info || booking.user_email || 'Guest'
                    const startDate = new Date(booking.start_date)
                    const endDate = new Date(booking.end_date)
                    const bookingDates = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
                    return (
                      <div key={booking.id} className="pb-2 border-b border-gray-700 last:border-0 last:pb-0">
                        <div className="font-semibold text-base mb-1">{propertyName}</div>
                        <div className="text-xs opacity-90 mb-1">
                          <span className="font-medium">Guest:</span> {guestName}
                        </div>
                        <div className="text-xs opacity-75">
                          <span className="font-medium">Dates:</span> {bookingDates}
                        </div>
                        {booking.extra_info && !booking.client_name && (
                          <div className="text-xs opacity-75 mt-1">
                            <span className="font-medium">Details:</span> {booking.extra_info}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : null

                // Determine cell style based on availability status
                // Match Properties calendar: gold gradient for booked, green for available
                // But also show red/yellow for all/some rooms booked status
                let cellStyle = ''
                if (availabilityStatus === 'red') {
                  // All rooms booked - red background
                  cellStyle = 'bg-red-100 border-2 border-red-300 text-[#4A5D23]'
                } else if (availabilityStatus === 'yellow') {
                  // Some rooms booked - yellow background  
                  cellStyle = 'bg-yellow-100 border-2 border-yellow-300 text-[#4A5D23]'
                } else if (hasBookings) {
                  // Has bookings - gold gradient (like Properties calendar)
                  cellStyle = 'bg-gradient-to-br from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] text-white shadow-lg'
                } else {
                  // Available - green background
                  cellStyle = 'bg-[#E8F0E0] text-[#4A5D23] border-2 border-[#D4E0C8]'
                }

                const dateBoxContent = (
                  <div
                    className={`
                      aspect-square flex flex-col items-center justify-center text-xs sm:text-sm font-light rounded sm:rounded-md lg:rounded-lg
                      transition-all duration-200 hover:scale-110 cursor-pointer touch-manipulation min-h-[36px] sm:min-h-[40px]
                      ${cellStyle}
                      ${isToday ? 'ring-2 sm:ring-3 lg:ring-4 ring-[#D4AF37] ring-offset-1 sm:ring-offset-2 shadow-xl scale-105 sm:scale-110' : ''}
                      ${canEdit || (isMobile && hasBookings) ? '' : 'cursor-default'}
                    `}
                    onClick={() => handleDateClick(day, dayBookings)}
                    title={hasBookings ? `${dayBookings.length} booking(s)` : 'Available'}
                  >
                    <span className="font-medium">{format(day, 'd')}</span>
                    {hasBookings && dayBookings.length > 1 && (
                      <span className="text-[10px] opacity-75 mt-0.5">+{dayBookings.length - 1}</span>
                    )}
                  </div>
                )

                // On desktop, wrap with tooltip on hover. On mobile (customers only), clicking opens modal
                return (
                  <div key={day.toISOString()}>
                    {(!isMobile || !isCustomer) && tooltipContent ? (
                      <Tooltip content={tooltipContent}>
                        {dateBoxContent}
                      </Tooltip>
                    ) : (
                      dateBoxContent
                    )}
                  </div>
                )
              })
            ]
          })()}
        </div>

        {/* Legend - 3 states for all users */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 lg:gap-8 mt-4 sm:mt-6 lg:mt-8 pt-4 sm:pt-6 lg:pt-8 border-t-2 border-[#D4AF37]/20 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-red-100 border-2 border-red-300 rounded"></div>
            <span className="text-xs sm:text-sm text-[#4A5D23] font-light">All rooms booked</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
            <span className="text-xs sm:text-sm text-[#4A5D23] font-light">Some rooms available</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-[#E8F0E0] border-2 border-[#D4E0C8] rounded"></div>
            <span className="text-xs sm:text-sm text-[#4A5D23] font-light">Available</span>
          </div>
        </div>
      </div>

      {/* Custom CSS for gold text gradient */}
      <style>{`
        .gold-text-gradient {
          background: linear-gradient(135deg, #2C3E1F 0%, #4A5D23 40%, #D4AF37 60%, #F4D03F 80%, #D4AF37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Booking Details Modal - Mobile (CUSTOMERS ONLY) */}
      {isCustomer && modalOpen && modalDate && (
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setModalDate(null)
            setModalBookings([])
          }}
          title={`Bookings for ${format(modalDate, 'MMMM d, yyyy')}`}
          size="md"
        >
          <div className="space-y-4">
            {modalBookings.length > 0 ? (
              modalBookings.map(booking => {
                const propertyName = booking.property_name || 'Unknown Property'
                const guestName = booking.client_name || booking.extra_info || booking.user_email || 'Guest'
                const startDate = new Date(booking.start_date)
                const endDate = new Date(booking.end_date)
                const bookingDates = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
                return (
                  <div key={booking.id} className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                    <div className="font-semibold text-lg mb-2 text-[#2C3E1F]">{propertyName}</div>
                    <div className="text-sm text-[#6B7C4A] mb-1">
                      <span className="font-medium">Guest:</span> {guestName}
                    </div>
                    <div className="text-sm text-[#6B7C4A] mb-1">
                      <span className="font-medium">Dates:</span> {bookingDates}
                    </div>
                    {booking.extra_info && !booking.client_name && (
                      <div className="text-sm text-[#6B7C4A] mt-2">
                        <span className="font-medium">Details:</span> {booking.extra_info}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="text-center text-[#6B7C4A] py-4">No bookings for this date</div>
            )}
          </div>
        </Modal>
      )}

      {/* Admin Booking Management Modal */}
      {canEdit && adminModalOpen && adminModalDate && (
        <DateBookingModal
          isOpen={adminModalOpen}
          onClose={() => {
            setAdminModalOpen(false)
            setAdminModalDate(null)
            setAdminModalBookings([])
          }}
          date={adminModalDate}
          bookings={adminModalBookings}
          apartments={filteredApartments}
          allApartments={apartments}
          hasActiveFilter={propertyFilter !== 'all' || searchTerm !== '' || groupOrEmailFilter !== 'all'}
        />
      )}

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
              {filteredBookings.map(booking => {
                return (
                  <div key={booking.id} className="border-b pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{booking.property_name || 'Unknown Property'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                        </p>
                        {!isCustomer && booking.client_name && (
                          <p className="text-xs text-muted-foreground">Client: {booking.client_name}</p>
                        )}
                        {!isCustomer && !booking.client_name && booking.user_email && (
                          <p className="text-xs text-muted-foreground">Guest: {booking.user_email}</p>
                        )}
                        {!isCustomer && !booking.client_name && booking.extra_info && (
                          <p className="text-xs text-muted-foreground mt-1">{booking.extra_info}</p>
                        )}
                        {isCustomer && (
                          <p className="text-xs text-muted-foreground mt-1">Booked</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
