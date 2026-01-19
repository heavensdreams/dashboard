// Helper functions to work with the new apartment structure

export interface Apartment {
  id: string
  name: string
  address: string
  extra_info?: string | null
  roi_info?: string | null
  created_at?: string
  bookings: Booking[]
  groups: string[]
  photos: string[]
}

export interface Booking {
  id: string
  property_id: string
  user_id: string
  start_date: string
  end_date: string
  extra_info?: string
  created_at?: string
}

// Get all bookings from all apartments
export function getAllBookings(apartments: Apartment[]): Booking[] {
  return apartments.flatMap(apt => apt.bookings)
}

// Get apartment by ID
export function getApartmentById(apartments: Apartment[], id: string): Apartment | undefined {
  return apartments.find(apt => apt.id === id)
}

// Get bookings for a specific apartment
export function getBookingsForApartment(apartments: Apartment[], apartmentId: string): Booking[] {
  const apartment = getApartmentById(apartments, apartmentId)
  return apartment?.bookings || []
}

// Check if apartment is occupied on a given date
export function isApartmentOccupied(apartment: Apartment, date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0]
  return apartment.bookings.some(booking => {
    const start = new Date(booking.start_date).toISOString().split('T')[0]
    const end = new Date(booking.end_date).toISOString().split('T')[0]
    return dateStr >= start && dateStr <= end
  })
}

// Get next booking for an apartment
export function getNextBooking(apartment: Apartment): Booking | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const futureBookings = apartment.bookings
    .filter(b => new Date(b.start_date) > today)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  
  return futureBookings[0] || null
}

