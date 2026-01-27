import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PropertyList } from '@/components/PropertyList/PropertyList'
import { PropertyDetail } from '@/components/PropertyDetail/PropertyDetail'
import { CustomerPropertiesView } from '@/components/CustomerPropertiesView'
import { useUserStore } from '@/stores/userStore'

export function Properties() {
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [showNewProperty, setShowNewProperty] = useState(false)
  const { currentUser } = useUserStore()
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'normal'
  const isCustomer = currentUser?.role === 'customer'

  // For customers, use the beautiful card view
  if (isCustomer) {
    return <CustomerPropertiesView />
  }

  // For admin/normal users, use the existing list view
  return (
    <div>
      {canEdit && (
        <div className="flex items-center justify-end mb-6">
          <Button onClick={() => setShowNewProperty(true)}>
            + New Apartment
          </Button>
        </div>
      )}

      <PropertyList onSelectProperty={setSelectedProperty} />

      {selectedProperty && (
        <PropertyDetail
          propertyId={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}

      {showNewProperty && (
        <PropertyDetail
          propertyId={null}
          onClose={() => setShowNewProperty(false)}
        />
      )}
    </div>
  )
}
