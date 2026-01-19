import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_FILE = path.join(process.cwd(), 'data.json')
const BACKUP_FILE = path.join(process.cwd(), 'data.json.backup')

async function migrate() {
  console.log('Starting migration to new data structure...')
  
  // Read current data
  const oldData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  
  // Create backup
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(oldData, null, 2))
  console.log(`Backup created: ${BACKUP_FILE}`)
  
  // Create new structure
  const newData = {
    users: oldData.users || [],
    groups: [],
    apartments: []
  }
  
  // Process groups
  const groups = oldData.groups || []
  const groupMap = new Map()
  for (const g of groups) {
    const group = {
      id: g.id,
      name: g.name
    }
    newData.groups.push(group)
    groupMap.set(g.id, g.name)
  }
  
  // Create property_groups lookup
  const propertyGroupsMap = new Map()
  const propertyGroups = oldData.property_groups || []
  for (const pg of propertyGroups) {
    if (!propertyGroupsMap.has(pg.property_id)) {
      propertyGroupsMap.set(pg.property_id, [])
    }
    const groupName = groupMap.get(pg.group_id)
    if (groupName) {
      propertyGroupsMap.get(pg.property_id).push(groupName)
    }
  }
  
  // Create bookings lookup by property_id
  const bookingsByProperty = new Map()
  const bookings = oldData.bookings || []
  for (const booking of bookings) {
    if (!bookingsByProperty.has(booking.property_id)) {
      bookingsByProperty.set(booking.property_id, [])
    }
    bookingsByProperty.get(booking.property_id).push(booking)
  }
  
  // Create photos lookup by entity
  const photosByEntity = new Map()
  const photos = oldData.photos || []
  for (const photo of photos) {
    const key = `${photo.entity_type}:${photo.entity_id}`
    if (!photosByEntity.has(key)) {
      photosByEntity.set(key, [])
    }
    photosByEntity.get(key).push(photo.photo_md5)
  }
  
  // Transform properties to apartments
  const properties = oldData.properties || []
  for (const property of properties) {
    const apartment = {
      id: property.id,
      name: property.name,
      address: property.address,
      extra_info: property.extra_info || null,
      roi_info: property.roi_info || null,
      created_at: property.created_at,
      bookings: bookingsByProperty.get(property.id) || [],
      groups: propertyGroupsMap.get(property.id) || [],
      photos: photosByEntity.get(`property:${property.id}`) || []
    }
    newData.apartments.push(apartment)
  }
  
  // Write new data
  fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2))
  
  console.log('Migration completed!')
  console.log(`Users: ${newData.users.length}`)
  console.log(`Groups: ${newData.groups.length}`)
  console.log(`Apartments: ${newData.apartments.length}`)
  const totalBookings = newData.apartments.reduce((sum, apt) => sum + apt.bookings.length, 0)
  console.log(`Total bookings embedded: ${totalBookings}`)
  console.log(`Data written to: ${DATA_FILE}`)
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
