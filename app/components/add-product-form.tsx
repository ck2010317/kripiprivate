'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, CheckCircle2, Upload, X, Edit2, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Image from 'next/image'
import { useRef } from 'react'

interface Product {
  id: string
  name: string
  description: string | null
  image: string | null
  price: number
  stock: number
}

interface ProductFormProps {
  storeId: string
  onSuccess: () => void
}

export function AddProductForm({ storeId, onSuccess }: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
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

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

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
      if (!formData.name.trim()) {
        setError('Product name is required')
        setLoading(false)
        return
      }

      if (!formData.price || parseFloat(formData.price) <= 0) {
        setError('Price must be greater than 0')
        setLoading(false)
        return
      }

      if (!formData.stock || parseInt(formData.stock) < 0) {
        setError('Stock must be 0 or greater')
        setLoading(false)
        return
      }

      const response = await fetch(
        `/api/marketplace/stores/${storeId}/products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            image: formData.image || null,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create product')
        setLoading(false)
        return
      }

      // Reset form
      setFormData({ name: '', description: '', price: '', stock: '', image: '' })
      setImagePreview('')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add New Product</CardTitle>
        <CardDescription>Create a new product listing for your store</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Name *</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Premium Jacket"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price (SOL) *</label>
              <Input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock Quantity *</label>
              <Input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="0"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your product..."
              rows={3}
              disabled={loading}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Product Image</label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-full h-40 object-cover rounded-lg border border-gray-300"
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
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">Click to upload product image</p>
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
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding Product...
              </>
            ) : (
              'Add Product'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
