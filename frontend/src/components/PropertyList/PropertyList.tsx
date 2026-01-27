import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { isApartmentOccupied, getNextBooking, type Apartment } from '@/utils/apartmentHelpers'

interface PropertyListProps {
  onSelectProperty: (id: string) => void
}

export function PropertyList({ onSelectProperty }: PropertyListProps) {
  const apartments = useDataStore(state => state.apartments) as Apartment[]
  const groups = useDataStore(state => state.groups)
  const userGroups = useDataStore(state => state.user_groups || [])
  const { currentUser } = useUserStore()
  const isCustomer = currentUser?.role === 'customer'

  // Get customer's group name
  const customerGroupName = useMemo(() => {
    if (!isCustomer || !currentUser?.id) return null
    const userGroup = userGroups.find((ug: any) => ug.user_id === currentUser.id)
    if (!userGroup) return null
    const group = groups.find((g: any) => g.id === userGroup.group_id)
    return group?.name || null
  }, [isCustomer, currentUser?.id, userGroups, groups])
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied'>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'address' | 'status'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calculate apartment status from embedded bookings
  const apartmentsWithStatus = useMemo(() => {
    return apartments.map(apartment => {
      const occupied = isApartmentOccupied(apartment, today)
      const nextBooking = getNextBooking(apartment)
      
      return {
        ...apartment,
        status: occupied ? 'occupied' : 'available' as 'occupied' | 'available',
        next_booking: nextBooking ? {
          start_date: nextBooking.start_date,
          end_date: nextBooking.end_date
        } : null
      }
    })
  }, [apartments, today])

  const filteredApartments = useMemo(() => {
    let filtered = [...apartmentsWithStatus]

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
    // Group filter (admin/normal users only)
    else if (!isCustomer && groupFilter !== 'all') {
      const group = groups.find((g: any) => g.name === groupFilter)
      if (group) {
        filtered = filtered.filter(apt => apt.groups && apt.groups.includes(group.name))
      }
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(apt => 
        apt.name.toLowerCase().includes(term) ||
        apt.address.toLowerCase().includes(term) ||
        (apt.extra_info && apt.extra_info.toLowerCase().includes(term))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any
      
      if (sortBy === 'name') {
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
      } else if (sortBy === 'address') {
        aVal = a.address.toLowerCase()
        bVal = b.address.toLowerCase()
      } else { // status
        aVal = a.status || 'available'
        bVal = b.status || 'available'
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    return filtered
  }, [apartmentsWithStatus, searchTerm, statusFilter, groupFilter, sortBy, sortOrder, groups, isCustomer, customerGroupName])

  // Get unique group names from all apartments
  const allGroupNames = useMemo(() => {
    const groupNames = new Set<string>()
    apartments.forEach(apt => {
      apt.groups.forEach(g => groupNames.add(g))
    })
    return Array.from(groupNames).sort()
  }, [apartments])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name, address, or info..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
            {!isCustomer && (
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm font-medium whitespace-nowrap">Group:</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={groupFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGroupFilter('all')}
                  >
                    All
                  </Button>
                  {allGroupNames.map((groupName) => (
                    <Button
                      key={groupName}
                      variant={groupFilter === groupName ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGroupFilter(groupName)}
                    >
                      {groupName}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="address">Sort by Address</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
            <div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredApartments.length} of {apartments.length} properties
          </div>
        </CardContent>
      </Card>

      {/* Properties List */}
      {filteredApartments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {apartments.length === 0 ? 'No properties found' : 'No properties match your filters'}
          </CardContent>
        </Card>
      ) : (
        filteredApartments.map((apartment) => (
          <Card key={apartment.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>{apartment.name}</CardTitle>
                  <span className={`text-xs px-2 py-1 rounded ${
                    apartment.status === 'available' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {apartment.status === 'available' ? 'Available' : 'Occupied'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onSelectProperty(apartment.id)}
                  >
                    {isCustomer ? 'View' : 'Edit'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {apartment.address}
              </p>
              {!isCustomer && apartment.groups && apartment.groups.length > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  Groups: {apartment.groups.join(', ')}
                </p>
              )}
              {apartment.extra_info && (
                <p className="text-sm mb-2">{apartment.extra_info}</p>
              )}
              {apartment.next_booking && (
                <p className="text-xs text-blue-600">
                  Next booking: {new Date(apartment.next_booking.start_date).toLocaleDateString()} - {new Date(apartment.next_booking.end_date).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
