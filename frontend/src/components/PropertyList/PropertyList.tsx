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
  const users = useDataStore(state => state.users)
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
  const [groupOrEmailFilter, setGroupOrEmailFilter] = useState<string>('all')
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
  }, [apartmentsWithStatus, searchTerm, statusFilter, groupOrEmailFilter, sortBy, sortOrder, groups, users, userGroups, isCustomer, customerGroupName])

  // Get all groups (from groups table, not from apartments)
  const allGroups = useMemo(() => {
    return groups.map((g: any) => g.name).sort()
  }, [groups])

  // Get customer emails that have properties assigned
  const customerEmailsWithProperties = useMemo(() => {
    if (isCustomer) return []
    const customerUsers = users.filter((u: any) => u.role === 'customer')
    return customerUsers
      .filter((customer: any) => {
        // Check if any property is assigned to this customer's email or their group
        return apartments.some((apt: any) => {
          if (!apt.groups || apt.groups.length === 0) return false
          // Direct email assignment
          if (apt.groups.includes(customer.email)) return true
          // Group assignment
          const customerUserGroup = userGroups.find((ug: any) => ug.user_id === customer.id)
          if (customerUserGroup) {
            const customerGroup = groups.find((g: any) => g.id === customerUserGroup.group_id)
            if (customerGroup && apt.groups.includes(customerGroup.name)) return true
          }
          return false
        })
      })
      .map((u: any) => u.email)
      .sort()
  }, [users, apartments, userGroups, groups, isCustomer])

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
                <Label className="text-sm font-medium whitespace-nowrap">Filter:</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={groupOrEmailFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGroupOrEmailFilter('all')}
                  >
                    All
                  </Button>
                  {allGroups.map((groupName) => (
                    <Button
                      key={groupName}
                      variant={groupOrEmailFilter === groupName ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGroupOrEmailFilter(groupName)}
                    >
                      {groupName}
                    </Button>
                  ))}
                  {customerEmailsWithProperties.map((email) => (
                    <Button
                      key={email}
                      variant={groupOrEmailFilter === email ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGroupOrEmailFilter(email)}
                    >
                      {email}
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
