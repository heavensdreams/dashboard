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

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Detect environment: Use explicit LOCAL=true for local development
// If LOCAL=true is set, we're in local dev mode
// Otherwise, assume Fly.io (production)
const isLocal = process.env.LOCAL === 'true'
const isFlyIO = !isLocal
const isProduction = process.env.NODE_ENV === 'production'

// PORT: On Fly.io, always use 8080 (set in fly.toml). Local dev uses 8083
// If PORT env var is set, use it. Otherwise, default based on environment
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (isFlyIO ? 8080 : 8083)

// Data directory - use Fly.io volume if available, otherwise use /tmp (ephemeral) or project root
let dataDir, dataFile, photosDir

if (isFlyIO) {
  // Fly.io: try /data volume first, fallback to /tmp if volume not mounted
  if (fs.existsSync('/data')) {
    dataDir = '/data'
    console.log('🌐 Fly.io environment detected - using /data volume (persistent)')
  } else {
    dataDir = '/tmp/app-data'
    console.log('🌐 Fly.io environment detected - using /tmp/app-data (ephemeral - data will be lost on restart)')
    console.log('⚠️  WARNING: For persistent storage, create volume: fly volumes create data_volume --region cdg --size 10')
  }
  dataFile = path.join(dataDir, 'data.json')
  photosDir = path.join(dataDir, 'photos')
} else {
  // Local: use project root
  dataDir = process.cwd()
  dataFile = path.join(dataDir, 'data.json')
  photosDir = path.join(dataDir, 'photos')
  console.log('💻 Local environment detected - using project root')
}

// Log environment detection for debugging
console.log(`🔍 Environment detection:`)
console.log(`   LOCAL: ${process.env.LOCAL || 'not set'}`)
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`)
console.log(`   PORT env: ${process.env.PORT || 'not set'}`)
console.log(`   Detected as: ${isLocal ? 'LOCAL DEVELOPMENT' : 'FLY.IO'}`)
console.log(`🔌 Using port: ${PORT}`)

// Ensure directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true })
}

// On Fly.io, copy default photos from repo if photos directory is empty
if (isFlyIO && fs.existsSync(photosDir)) {
  const defaultPhotosDir = path.join(__dirname, '.fly', 'default-photos')
  try {
    const photos = fs.readdirSync(photosDir).filter(f => !f.startsWith('.'))
    if (photos.length === 0 && fs.existsSync(defaultPhotosDir)) {
      console.log('📸 Copying default photos from repo...')
      const defaultPhotos = fs.readdirSync(defaultPhotosDir).filter(f => !f.startsWith('.'))
      for (const photo of defaultPhotos) {
        const src = path.join(defaultPhotosDir, photo)
        const dest = path.join(photosDir, photo)
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest)
        }
      }
      console.log(`✅ Copied ${defaultPhotos.length} default photos`)
    }
  } catch (err) {
    console.warn('⚠️  Failed to copy default photos:', err.message)
  }
}

console.log('Environment:', isFlyIO ? 'Fly.io' : 'Local')
console.log('Using data directory:', dataDir)
console.log('Using data file:', dataFile)
console.log('Using photos directory:', photosDir)

// Initialize data on startup (ensures empty volume gets default data)
if (isFlyIO) {
  console.log('🔍 Initializing data on startup...')
  try {
    readData() // This will load default data if volume is empty
    console.log('✅ Data initialization check complete')
  } catch (error) {
    console.error('⚠️  Data initialization error:', error.message)
  }
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
      // Try to load default data from repo if on Fly.io
      const defaultDataPath = path.join(__dirname, '.fly', 'default-data.json')
      if (isFlyIO && fs.existsSync(defaultDataPath)) {
        console.log('📋 Loading default data.json from repo...')
        try {
          const defaultData = JSON.parse(fs.readFileSync(defaultDataPath, 'utf8'))
          writeData(defaultData)
          console.log('✅ Initialized with default data.json')
          return defaultData
        } catch (err) {
          console.warn('⚠️  Failed to load default data, using empty structure:', err.message)
        }
      }
      // Return empty structure if file doesn't exist
      const emptyData = {
        users: [],
        groups: [],
        apartments: [],
        logs: []
      }
      // Create file with empty data
      writeData(emptyData)
      return emptyData
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

// API Routes (must be before static file serving)

// POST /api/login - Login endpoint
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

// GET /api/data - Load all data
app.get('/api/data', (req, res) => {
  try {
    const data = readData()
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
    
    // Initialize logs if missing
    if (!Array.isArray(data.logs)) {
      data.logs = []
    }
    
    // Write data
    writeData(data)
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Photo upload endpoint
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const md5 = path.parse(req.file.filename).name
  res.json({ md5, filename: req.file.filename })
})

// Serve photos
app.use('/photos', express.static(photosDir))

// Public API endpoint
app.get('/api/public/properties/:ids', (req, res) => {
  try {
    const data = readData()
    const apartmentIds = req.params.ids.split(',').filter(id => id.trim())
    
    if (apartmentIds.length === 0) {
      return res.status(400).json({ error: 'No apartment IDs provided' })
    }

    const apartments = data.apartments.filter(a => apartmentIds.includes(a.id))
    
    if (apartments.length === 0) {
      return res.json({ properties: [] })
    }

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

    const apartmentsWithData = apartments.map(apartment => {
      const propertyBookings = apartment.bookings.map(b => ({
        start_date: normalizeDate(b.start_date),
        end_date: normalizeDate(b.end_date)
      }))

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
        roi_chart: apartment.roi_chart || null,
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

// Serve static files from frontend/dist (production mode only)
const frontendDist = path.join(__dirname, 'frontend', 'dist')
const serveFrontend = isProduction && fs.existsSync(frontendDist)

if (serveFrontend) {
  app.use(express.static(frontendDist))
  
  // Handle client-side routing - all non-API routes serve index.html
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/photos')) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
  console.log('Frontend: Serving static files from dist')
} else {
  console.log('Frontend: API only mode (use Vite dev server for frontend)')
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📁 Data file: ${dataFile}`)
  console.log(`📸 Photos directory: ${photosDir}`)
  console.log(`🌐 Frontend: ${serveFrontend ? 'Serving static files' : 'API only (use Vite dev server)'}`)
  console.log(`📍 Environment: ${isFlyIO ? 'Fly.io' : 'Local Development'}`)
})

