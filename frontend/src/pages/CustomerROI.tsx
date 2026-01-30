import { useMemo } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { ROITrendGraph } from '@/components/ROITrendGraph/ROITrendGraph'

export function CustomerROI() {
  const apartments = useDataStore(state => state.apartments)
  const groups = useDataStore(state => state.groups)
  const userGroups = useDataStore(state => state.user_groups || [])
  const { currentUser } = useUserStore()

  // Get customer's group name
  const customerGroupName = useMemo(() => {
    if (!currentUser?.id) return null
    const userGroup = userGroups.find((ug: any) => ug.user_id === currentUser.id)
    if (!userGroup) return null
    const group = groups.find((g: any) => g.id === userGroup.group_id)
    return group?.name || null
  }, [currentUser?.id, userGroups, groups])

  // Filter apartments by customer email (direct assignment) OR customer group name
  const properties = useMemo(() => {
    if (!currentUser?.email) {
      return []
    }
    
    let filtered = apartments.filter(apt => {
      if (!apt.groups || apt.groups.length === 0) return false
      // Check if property is assigned directly to customer's email
      if (apt.groups.includes(currentUser.email)) return true
      // Check if property is assigned to customer's group (if they have one)
      if (customerGroupName && apt.groups.includes(customerGroupName)) return true
      return false
    })
    
    return filtered
  }, [apartments, customerGroupName, currentUser?.email])

  // Get all bookings for all client properties
  const allClientBookings = useMemo(() => {
    return properties.flatMap((apt: any) => 
      (apt.bookings || []).map((b: any) => ({
        ...b,
        property_id: apt.id
      }))
    )
  }, [properties])

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No properties found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-[#2C3E1F] mb-2 tracking-wide gold-text-gradient">
          Return on Investment (ROI)
        </h2>
        <p className="text-sm text-[#6B7C4A] font-light">
          Cumulative profit trend based on booking occupancy across all your properties
        </p>
      </div>
      
      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg border-2 border-[#D4AF37]/20">
        <ROITrendGraph 
          properties={properties}
          allBookings={allClientBookings}
        />
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
    </div>
  )
}
