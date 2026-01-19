import express from 'express'
import multer from 'multer'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const photosDir = path.join(__dirname, 'photos')

if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true })
}

const upload = multer({ dest: photosDir + '/temp/' })

app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  try {
    const fileBuffer = fs.readFileSync(req.file.path)
    const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex')
    const ext = path.extname(req.file.originalname) || '.jpg'
    const newFileName = `${md5}${ext}`
    const newPath = path.join(photosDir, newFileName)

    fs.renameSync(req.file.path, newPath)

    res.json({ md5, extension: ext.replace('.', '') })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
  }
})

app.use('/photos', express.static(photosDir))

export default app


