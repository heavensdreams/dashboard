import db from './db.js'

// Sample data generators
const propertyNames = [
  'Sunset Villa', 'Ocean View Apartment', 'Mountain Retreat', 'City Center Loft', 'Garden Studio',
  'Beachside Condo', 'Downtown Penthouse', 'Riverside Apartment', 'Park View Suite', 'Harbor House',
  'Forest Cabin', 'Lakeside Villa', 'Urban Loft', 'Coastal Bungalow', 'Meadow Cottage',
  'Skyline Apartment', 'Valley View', 'Seaside Retreat', 'Hilltop House', 'Plaza Suite',
  'Garden Apartment', 'Waterfront Condo', 'Historic Loft', 'Modern Studio', 'Classic Villa',
  'Tropical Paradise', 'Alpine Chalet', 'Desert Oasis', 'Countryside Home', 'Metro Apartment',
  'Boutique Suite', 'Executive Penthouse', 'Family Villa', 'Romantic Getaway', 'Business Suite',
  'Luxury Apartment', 'Cozy Studio', 'Spacious Loft', 'Charming Cottage', 'Elegant Condo',
  'Premium Villa', 'Standard Apartment', 'Deluxe Suite', 'Budget Studio', 'Comfortable Home',
  'Stylish Loft', 'Quiet Retreat', 'Vibrant Apartment', 'Serene Villa', 'Dynamic Suite'
]

const addresses = [
  '123 Main Street', '456 Oak Avenue', '789 Pine Road', '321 Elm Boulevard', '654 Maple Drive',
  '987 Cedar Lane', '147 Birch Street', '258 Spruce Avenue', '369 Willow Road', '741 Ash Boulevard',
  '852 Cherry Drive', '963 Walnut Lane', '159 Chestnut Street', '357 Hickory Avenue', '468 Poplar Road',
  '579 Sycamore Boulevard', '680 Magnolia Drive', '791 Dogwood Lane', '802 Redwood Street', '913 Cypress Avenue',
  '124 Fir Road', '235 Hemlock Boulevard', '346 Juniper Drive', '457 Larch Lane', '568 Alder Street',
  '679 Beech Avenue', '780 Cedar Road', '891 Pine Boulevard', '902 Oak Drive', '113 Maple Lane',
  '224 Elm Street', '335 Birch Avenue', '446 Spruce Road', '557 Willow Boulevard', '668 Ash Drive',
  '779 Cherry Lane', '880 Walnut Street', '991 Chestnut Avenue', '102 Hickory Road', '213 Poplar Boulevard',
  '324 Sycamore Drive', '435 Magnolia Lane', '546 Dogwood Street', '657 Redwood Avenue', '768 Cypress Road',
  '879 Fir Boulevard', '980 Hemlock Drive', '191 Juniper Lane', '202 Larch Street', '313 Alder Avenue'
]

const extraInfoTexts = [
  'Fully furnished with modern amenities. Close to public transport.',
  'Beautiful views, recently renovated. Pet-friendly.',
  'Spacious and comfortable. Perfect for families.',
  'Stylish interior, great location. Includes parking.',
  'Cozy and welcoming. Near shopping and restaurants.',
  'Luxury finishes throughout. High-speed internet included.',
  'Quiet neighborhood, well-maintained. Garden access.',
  'Bright and airy. Close to beach and parks.',
  'Modern design, fully equipped kitchen. Balcony included.',
  'Charming character, excellent condition. Great value.',
  'Prime location, secure building. Elevator access.',
  'Renovated recently, move-in ready. Storage included.',
  'Stunning views, premium location. Concierge service.',
  'Comfortable and clean. Great for short stays.',
  'Well-appointed, excellent amenities. Close to everything.',
  'Spacious layout, natural light. Private entrance.',
  'Luxury living, top floor. Panoramic views.',
  'Family-friendly, safe area. Schools nearby.',
  'Modern amenities, great design. Walk to shops.',
  'Peaceful setting, well-maintained. Perfect retreat.',
  'City center location, easy access. Public transport nearby.',
  'Beautiful property, excellent condition. Ready to move in.',
  'Comfortable and convenient. All utilities included.',
  'Stylish and modern. Great investment opportunity.',
  'Well-located, fully furnished. Short or long term.',
  'Charming and cozy. Perfect for couples.',
  'Spacious and bright. Natural light throughout.',
  'Luxury features, premium finishes. High-end living.',
  'Great value, excellent location. Move-in ready.',
  'Comfortable home, well-maintained. Family-friendly.',
  'Modern design, quality construction. Energy efficient.',
  'Beautiful views, peaceful setting. Nature nearby.',
  'Convenient location, easy access. Shopping nearby.',
  'Stylish interior, great amenities. Perfect for professionals.',
  'Cozy atmosphere, welcoming space. Home away from home.',
  'Excellent condition, well-cared for. Great investment.',
  'Prime real estate, desirable location. High demand area.',
  'Comfortable living, all conveniences. Great neighborhood.',
  'Modern facilities, quality finishes. Contemporary design.',
  'Spacious rooms, flexible layout. Adaptable space.',
  'Beautiful property, excellent value. Must see.',
  'Well-maintained, move-in ready. No work needed.',
  'Great location, easy commute. Public transport access.',
  'Comfortable and clean, well-presented. Ready to enjoy.',
  'Stylish design, modern amenities. Quality living.',
  'Peaceful environment, quiet area. Perfect for relaxation.',
  'Convenient access, central location. Everything nearby.',
  'Excellent property, great condition. Highly recommended.',
  'Spacious accommodation, flexible use. Versatile space.',
  'Modern living, quality home. Contemporary style.'
]

const userEmails = [
  'john.doe@example.com',
  'jane.smith@example.com',
  'bob.johnson@example.com'
]

const userNames = [
  'John Doe',
  'Jane Smith',
  'Bob Johnson'
]

const groupNames = [
  'Premium Properties',
  'Standard Rentals',
  'Budget Options'
]

async function populateData() {
  try {
    console.log('Starting data population...')

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing data...')
    await db('bookings').del()
    await db('property_groups').del()
    await db('user_groups').del()
    await db('photos').del()
    await db('properties').del()
    await db('groups').del()
    await db('users').del()
    await db('logs').del()

    // Create users
    console.log('Creating users...')
    const users = []
    for (let i = 0; i < 3; i++) {
      const [user] = await db('users').insert({
        email: userEmails[i],
        password: 'password123', // Plain text for demo
        role: i === 0 ? 'admin' : 'normal'
      }).returning('*')
      users.push(user)
      console.log(`Created user: ${user.email}`)
    }

    // Create groups
    console.log('Creating groups...')
    const groups = []
    for (let i = 0; i < 3; i++) {
      const [group] = await db('groups').insert({
        name: groupNames[i]
      }).returning('*')
      groups.push(group)
      console.log(`Created group: ${group.name}`)
    }

    // Create properties
    console.log('Creating properties...')
    const properties = []
    
    for (let i = 0; i < 50; i++) {
      const [property] = await db('properties').insert({
        name: propertyNames[i],
        address: addresses[i],
        extra_info: extraInfoTexts[i]
      }).returning('*')
      properties.push(property)
      
      // Assign to groups: Group1 (0-19), Group2 (20-34), Group3 (35-49)
      // ENSURE EVERY PROPERTY BELONGS TO AT LEAST ONE GROUP
      let groupIndex
      if (i < 20) {
        groupIndex = 0 // Premium Properties
      } else if (i < 35) {
        groupIndex = 1 // Standard Rentals
      } else {
        groupIndex = 2 // Budget Options
      }
      
      // Assign property to group - this is REQUIRED for every property
      await db('property_groups').insert({
        property_id: property.id,
        group_id: groups[groupIndex].id
      })
      
      console.log(`Created property ${i + 1}/50: ${property.name} → ${groups[groupIndex].name}`)
    }
    
    // Verify all properties are assigned to at least one group
    console.log('Verifying property-group assignments...')
    const allPropertyGroups = await db('property_groups').select('property_id')
    const assignedPropertyIds = new Set(allPropertyGroups.map(pg => pg.property_id))
    const unassignedProperties = properties.filter(p => !assignedPropertyIds.has(p.id))
    
    if (unassignedProperties.length > 0) {
      console.error(`ERROR: ${unassignedProperties.length} properties are not assigned to any group!`)
      // Assign any unassigned properties to the first group as fallback
      for (const property of unassignedProperties) {
        await db('property_groups').insert({
          property_id: property.id,
          group_id: groups[0].id
        })
        console.log(`Fixed: Assigned ${property.name} to ${groups[0].name} (fallback)`)
      }
    } else {
      console.log('✅ All properties are assigned to at least one group')
    }

    // Create bookings - 3-5 bookings per property
    console.log('Creating bookings...')
    let bookingCount = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i]
      
      // Generate 3-5 bookings per property
      const numBookings = Math.floor(Math.random() * 3) + 3 // 3, 4, or 5
      
      // Track used date ranges to avoid overlaps
      const usedRanges = []
      
      for (let b = 0; b < numBookings; b++) {
        let attempts = 0
        let startDate, endDate, overlaps
        
        // Try to find a non-overlapping date range
        do {
          // Random start date in the next 6 months
          const daysFromNow = Math.floor(Math.random() * 180) + 1 // 1-180 days from now
          startDate = new Date(today)
          startDate.setDate(today.getDate() + daysFromNow)
          
          // Random duration (3-14 days)
          const duration = Math.floor(Math.random() * 12) + 3
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + duration)
          
          // Check for overlaps
          overlaps = usedRanges.some(range => {
            return (startDate <= range.end && endDate >= range.start)
          })
          
          attempts++
        } while (overlaps && attempts < 50) // Try up to 50 times
        
        // If we couldn't find a non-overlapping range, use this one anyway
        if (overlaps && attempts >= 50) {
          // Just use a later date
          const daysFromNow = Math.floor(Math.random() * 150) + 30
          startDate = new Date(today)
          startDate.setDate(today.getDate() + daysFromNow)
          const duration = Math.floor(Math.random() * 12) + 3
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + duration)
        }
        
        // Store this range
        usedRanges.push({ start: startDate, end: endDate })
        
        // Random user
        const user = users[Math.floor(Math.random() * users.length)]
        
        // Random extra info
        const extraInfoOptions = [
          'Family vacation',
          'Business trip',
          'Weekend getaway',
          'Extended stay',
          'Holiday booking',
          'Corporate rental',
          'Tourist visit',
          'Relocation period',
          'Event accommodation',
          'Leisure stay'
        ]
        const extraInfo = extraInfoOptions[Math.floor(Math.random() * extraInfoOptions.length)]
        
        await db('bookings').insert({
          property_id: property.id,
          user_id: user.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          extra_info: extraInfo
        })
        
        bookingCount++
      }
      
      console.log(`Created ${numBookings} bookings for ${property.name}`)
    }
    
    console.log(`Created ${bookingCount} bookings total`)

    // Assign users to groups (normal users only)
    console.log('Assigning users to groups...')
    for (let i = 1; i < users.length; i++) {
      // Assign each normal user to 2 groups
      const groupIndices = [i % 3, (i + 1) % 3]
      for (const groupIdx of groupIndices) {
        await db('user_groups').insert({
          user_id: users[i].id,
          group_id: groups[groupIdx].id
        })
      }
      console.log(`Assigned user ${users[i].email} to groups`)
    }

    // Create some logs
    console.log('Creating sample logs...')
    const logActions = [
      'Created property',
      'Updated property',
      'Created booking',
      'Updated booking',
      'Deleted booking',
      'Assigned property to group',
      'Created user',
      'Updated user'
    ]
    
    for (let i = 0; i < 20; i++) {
      await db('logs').insert({
        user_id: users[0].id, // Admin user
        action: logActions[Math.floor(Math.random() * logActions.length)],
        entity_type: ['property', 'booking', 'user', 'group'][Math.floor(Math.random() * 4)],
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        new_value: `Sample log entry ${i + 1}`
      })
    }
    console.log('Created 20 sample logs')

    console.log('\n✅ Data population complete!')
    console.log(`   - ${users.length} users (1 admin, 2 normal)`)
    console.log(`   - ${groups.length} groups`)
    console.log(`   - ${properties.length} properties`)
    console.log(`   - ${bookingCount} bookings (3-5 per property)`)
    console.log(`   - Property distribution: Premium Properties (20), Standard Rentals (15), Budget Options (15)`)
    
    process.exit(0)
  } catch (error) {
    console.error('Error populating data:', error)
    process.exit(1)
  }
}

populateData()

