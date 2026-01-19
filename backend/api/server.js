import express from 'express'
import cors from 'cors'
import multer from 'multer'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8083

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Data file path - try multiple locations
let dataFile = path.join(process.cwd(), 'data.json')
if (!fs.existsSync(dataFile)) {
  dataFile = path.join(__dirname, '../../data.json')
}
if (!fs.existsSync(dataFile)) {
  dataFile = path.join(process.cwd(), '../../data.json')
}
console.log('Using data file:', dataFile)

// Photos directory
const photosDir = path.join(__dirname, '../../photos')
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true })
}

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, photosDir)
  },
  filename: (req, file, cb) => {
    const hash = crypto.createHash('md5')
    hash.update(file.buffer || file.originalname + Date.now())
    const md5 = hash.digest('hex')
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${md5}${ext}`)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

// Helper function to read data.json
function readData() {
  try {
    if (!fs.existsSync(dataFile)) {
      // Return empty structure if file doesn't exist
      return {
        users: [],
        groups: [],
        apartments: [],
        logs: []
      }
    }
    const data = fs.readFileSync(dataFile, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading data.json:', error)
    throw new Error('Failed to read data file')
  }
}

// Helper function to write data.json atomically
function writeData(data) {
  try {
    // Validate data structure
    const requiredTables = ['users', 'groups', 'apartments']
    for (const table of requiredTables) {
      if (!Array.isArray(data[table])) {
        throw new Error(`Invalid data structure: ${table} must be an array`)
      }
    }
    // Initialize logs if missing
    if (!Array.isArray(data.logs)) {
      data.logs = []
    }
    
    // Write to temp file first, then rename (atomic operation)
    const tempFile = dataFile + '.tmp'
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2))
    fs.renameSync(tempFile, dataFile)
  } catch (error) {
    console.error('Error writing data.json:', error)
    throw new Error('Failed to write data file')
  }
}

// POST /api/login - Login endpoint (checks password server-side)
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    
    const data = readData()
    const user = data.users.find(u => u.email === email)
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    res.json(userWithoutPassword)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/data - Load all data (INCLUDING passwords for client-side login)
app.get('/api/data', (req, res) => {
  try {
    const data = readData()
    // Return all data including passwords (for client-side login check)
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/data - Save all data
app.post('/api/data', (req, res) => {
  try {
    const data = req.body
    
    // Validate structure
    const requiredTables = ['users', 'groups', 'apartments']
    for (const table of requiredTables) {
      if (!Array.isArray(data[table])) {
        return res.status(400).json({ error: `Invalid data structure: ${table} must be an array` })
      }
    }
    
    // Write data
    writeData(data)
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Photo upload endpoint (unchanged)
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const md5 = path.parse(req.file.filename).name
  res.json({ md5, filename: req.file.filename })
})

// Serve photos
app.use('/photos', express.static(photosDir))

// Public API endpoint - returns apartment data with filtered bookings
app.get('/api/public/properties/:ids', (req, res) => {
  try {
    const data = readData()
    const apartmentIds = req.params.ids.split(',').filter(id => id.trim())
    
    if (apartmentIds.length === 0) {
      return res.status(400).json({ error: 'No apartment IDs provided' })
    }

    // Get apartments
    const apartments = data.apartments.filter(a => apartmentIds.includes(a.id))
    
    if (apartments.length === 0) {
      return res.json({ properties: [] })
    }

    // Helper to normalize date
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

    // Build response with filtered data (no personal info in bookings)
    const apartmentsWithData = apartments.map(apartment => {
      const propertyBookings = apartment.bookings.map(b => ({
        start_date: normalizeDate(b.start_date),
        end_date: normalizeDate(b.end_date)
      }))

      // Build availability map
      const availability = {}
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      for (let i = 0; i < 90; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() + i)
        const dateStr = checkDate.toISOString().split('T')[0]
        
        const isBooked = propertyBookings.some(booking => {
          const start = new Date(booking.start_date)
          const end = new Date(booking.end_date)
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)
          return checkDate >= start && checkDate <= end
        })
        
        availability[dateStr] = isBooked ? 'booked' : 'available'
      }

      return {
        id: apartment.id,
        name: apartment.name,
        address: apartment.address,
        extra_info: apartment.extra_info,
        roi_info: apartment.roi_info || null,
        photos: apartment.photos || [],
        bookings: propertyBookings,
        availability: availability
      }
    })

    res.json({ properties: apartmentsWithData })
  } catch (error) {
    console.error('Public API error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  try {
    const data = readData()
    res.json({ 
      status: 'ok', 
      tables: Object.keys(data).map(key => ({ name: key, count: data[key].length }))
    })
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
  console.log(`Data file: ${dataFile}`)
})
