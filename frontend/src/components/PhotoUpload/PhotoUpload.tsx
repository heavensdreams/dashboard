import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface PhotoUploadProps {
  onUpload: (md5: string) => void
  multiple?: boolean
}

export function PhotoUpload({ onUpload, multiple = false }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('photo', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const data = await response.json()
        // Use filename if available (includes extension), otherwise fall back to md5
        onUpload(data.filename || data.md5)
        
        if (!multiple) break
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <Input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        multiple={multiple}
      />
    </div>
  )
}


