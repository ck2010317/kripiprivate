'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, CheckCircle2, Upload, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function SellerOnboarding() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setImagePreview(base64)
      setFormData((prev) => ({
        ...prev,
        image: base64,
      }))
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImagePreview('')
    setFormData((prev) => ({
      ...prev,
      image: '',
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        setError('Store name is required')
        setLoading(false)
        return
      }

      if (formData.name.trim().length < 3) {
        setError('Store name must be at least 3 characters')
        setLoading(false)
        return
      }

      const response = await fetch('/api/marketplace/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create store')
        setLoading(false)
        return
      }

      setSuccess(true)
      setFormData({ name: '', description: '', image: '' })

      // Redirect to store dashboard after 2 seconds
      setTimeout(() => {
        router.push(`/shop/seller/${data.store.slug}`)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Store Created Successfully!</h3>
              <p className="text-sm text-gray-600 mt-2">
                Redirecting to your store dashboard...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Your Store</CardTitle>
        <CardDescription>
          Start selling your products on PrivateShop. Set up your store in minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Store Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Store Name *</label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Premium Fashion Co."
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-500">
              Minimum 3 characters. This will be your unique store identifier.
            </p>
          </div>

          {/* Store Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Store Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell customers about your store, what you sell, and what makes you special..."
              rows={4}
              disabled={loading}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Help customers understand your brand and products.
            </p>
          </div>

          {/* Store Image/Logo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Store Image/Logo</label>
            
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Store preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">Click to upload store image</p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
              </button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Your store logo/banner will be displayed on your store page and in marketplace listings
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Your Store...
              </>
            ) : (
              'Create Store'
            )}
          </Button>

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">What happens next?</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✓ Your store will be created and you'll get a unique store page</li>
              <li>✓ You can start adding products immediately</li>
              <li>✓ Connect your SOL wallet for receiving payments</li>
              <li>✓ Start accepting orders from customers</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
