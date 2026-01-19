// Frontend filtering utilities - ALL filtering happens in frontend based on roles
// Backend returns ALL data without any filtering - no security/role checks in backend
// All role-based data filtering, privacy protection, and access control happens here

interface Booking {
  id: string
  property_id: string
  property_name?: string
  user_email?: string
  start_date: string
  end_date: string
  extra_info?: string
}

/**
 * Filter booking data for customers - removes all personal information
 * Only shows: id, property_id, property_name, start_date, end_date
 */
export function filterBookingForCustomer(booking: Booking): Booking {
  return {
    id: booking.id,
    property_id: booking.property_id,
    property_name: booking.property_name,
    start_date: booking.start_date,
    end_date: booking.end_date
    // Explicitly exclude: user_email, extra_info
  }
}

/**
 * Filter array of bookings for customers
 */
export function filterBookingsForCustomer(bookings: Booking[]): Booking[] {
  return bookings.map(filterBookingForCustomer)
}

/**
 * Filter bookings based on search term (customer-safe)
 * Customers can only search by property name
 */
export function filterBookingsBySearch(
  bookings: Booking[],
  searchTerm: string,
  isCustomer: boolean
): Booking[] {
  if (!searchTerm) return bookings
  
  const term = searchTerm.toLowerCase()
  
  if (isCustomer) {
    // Customers can only search by property name
    return bookings.filter(booking => 
      booking.property_name?.toLowerCase().includes(term)
    )
  }
  
  // Admin/normal users can search by property, email, or extra_info
  return bookings.filter(booking => 
    booking.property_name?.toLowerCase().includes(term) ||
    booking.user_email?.toLowerCase().includes(term) ||
    booking.extra_info?.toLowerCase().includes(term)
  )
}

/**
 * Filter bookings by property
 */
export function filterBookingsByProperty(
  bookings: Booking[],
  propertyId: string
): Booking[] {
  if (propertyId === 'all') return bookings
  return bookings.filter(booking => booking.property_id === propertyId)
}

/**
 * Filter properties by group (frontend filtering)
 */
export function filterPropertiesByGroup(
  properties: any[],
  propertyGroups: any[],
  groupId: string
): any[] {
  if (groupId === 'all') return properties
  
  const groupPropertyIds = propertyGroups
    .filter((pg: any) => pg.group_id === groupId)
    .map((pg: any) => pg.property_id)
  
  return properties.filter((p: any) => groupPropertyIds.includes(p.id))
}

/**
 * Filter properties by user's groups (frontend filtering)
 */
export function filterPropertiesByUserGroups(
  properties: any[],
  propertyGroups: any[],
  userGroupIds: string[]
): any[] {
  if (userGroupIds.length === 0) return []
  
  const userGroupPropertyIds = propertyGroups
    .filter((pg: any) => userGroupIds.includes(pg.group_id))
    .map((pg: any) => pg.property_id)
  
  // Remove duplicates
  const uniquePropertyIds = [...new Set(userGroupPropertyIds)]
  
  return properties.filter((p: any) => uniquePropertyIds.includes(p.id))
}

/**
 * Filter properties by search term
 */
export function filterPropertiesBySearch(
  properties: any[],
  searchTerm: string
): any[] {
  if (!searchTerm) return properties
  
  const term = searchTerm.toLowerCase()
  return properties.filter(property =>
    property.name?.toLowerCase().includes(term) ||
    property.address?.toLowerCase().includes(term) ||
    property.extra_info?.toLowerCase().includes(term)
  )
}

/**
 * Filter properties by status
 */
export function filterPropertiesByStatus(
  properties: any[],
  statusFilter: 'all' | 'available' | 'occupied'
): any[] {
  if (statusFilter === 'all') return properties
  
  return properties.filter(property => {
    if (statusFilter === 'occupied') {
      return property.status === 'occupied'
    }
    if (statusFilter === 'available') {
      return property.status === 'available'
    }
    return true
  })
}

