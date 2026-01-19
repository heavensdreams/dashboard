import db from './db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataFile = path.join(__dirname, '../../data.json')

async function migrate() {
  try {
    console.log('Starting migration from PostgreSQL to JSON...')
    
    // Read all tables
    const users = await db('users').select('*')
    const groups = await db('groups').select('*')
    const properties = await db('properties').select('*')
    const bookings = await db('bookings').select('*')
    const photos = await db('photos').select('*')
    const logs = await db('logs').select('*')
    const userGroups = await db('user_groups').select('*')
    const propertyGroups = await db('property_groups').select('*')
    
    // Normalize dates to ISOString with "Z"
    const normalizeDate = (date) => {
      if (!date) return null
      if (typeof date === 'string') {
        if (date.endsWith('Z')) return date
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return new Date(date + 'T00:00:00Z').toISOString()
        }
        return new Date(date).toISOString()
      }
      if (date instanceof Date) return date.toISOString()
      try {
        return new Date(date).toISOString()
      } catch {
        const d = new Date(String(date))
        return isNaN(d.getTime()) ? null : d.toISOString()
      }
    }
    
    // Normalize dates in bookings
    const normalizedBookings = bookings.map(booking => ({
      ...booking,
      start_date: normalizeDate(booking.start_date),
      end_date: normalizeDate(booking.end_date),
      created_at: normalizeDate(booking.created_at)
    }))
    
    // Normalize dates in other tables
    const normalizeTableDates = (table, dateFields) => {
      return table.map(row => {
        const normalized = { ...row }
        dateFields.forEach(field => {
          if (normalized[field]) {
            normalized[field] = normalizeDate(normalized[field])
          }
        })
        return normalized
      })
    }
    
    const normalizedUsers = normalizeTableDates(users, ['created_at'])
    const normalizedGroups = normalizeTableDates(groups, ['created_at'])
    const normalizedProperties = normalizeTableDates(properties, ['created_at'])
    const normalizedPhotos = normalizeTableDates(photos, ['created_at'])
    const normalizedLogs = normalizeTableDates(logs, ['timestamp', 'created_at'])
    const normalizedUserGroups = normalizeTableDates(userGroups, ['created_at'])
    const normalizedPropertyGroups = normalizeTableDates(propertyGroups, ['created_at'])
    
    // Structure data
    const data = {
      users: normalizedUsers,
      groups: normalizedGroups,
      properties: normalizedProperties,
      bookings: normalizedBookings,
      photos: normalizedPhotos,
      logs: normalizedLogs,
      user_groups: normalizedUserGroups,
      property_groups: normalizedPropertyGroups
    }
    
    // Write to JSON file
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2))
    
    console.log('Migration completed successfully!')
    console.log(`Data written to: ${dataFile}`)
    console.log(`Users: ${normalizedUsers.length}`)
    console.log(`Groups: ${normalizedGroups.length}`)
    console.log(`Properties: ${normalizedProperties.length}`)
    console.log(`Bookings: ${normalizedBookings.length}`)
    console.log(`Photos: ${normalizedPhotos.length}`)
    console.log(`Logs: ${normalizedLogs.length}`)
    console.log(`User Groups: ${normalizedUserGroups.length}`)
    console.log(`Property Groups: ${normalizedPropertyGroups.length}`)
    
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

migrate()

