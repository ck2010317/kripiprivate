'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Edit2, Trash2, Plus, ShoppingBag } from 'lucide-react'
import { AddProductForm } from './add-product-form'
import Image from 'next/image'
import Link from 'next/link'

interface Store {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  totalSales: number
  totalOrders: number
  rating: number
  reviewCount: number
  solWallet: string | null
  isVerified: boolean
  productCount: number
  createdAt: string
}

interface Product {
  id: string
  name: string
  description: string | null
  image: string | null
  price: number
  stock: number
  rating: number
  reviewCount: number
}

interface SellerDashboardProps {
  storeId: string
}

export function SellerDashboard({ storeId }: SellerDashboardProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [store, setStore] = useState<Store | null>(null)

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/marketplace/stores/${storeId}/products`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [storeId])

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    setDeletingId(productId)
    try {
      const response = await fetch(
        `/api/marketplace/stores/${storeId}/products/${productId}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId))
      }
    } catch (err) {
      console.error('Failed to delete product:', err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="text-3xl font-bold">0</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold">◎ 0.00</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Products</p>
              <p className="text-3xl font-bold">{products.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Store Rating</p>
              <p className="text-3xl font-bold">0.0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Product Form */}
      <AddProductForm storeId={storeId} onSuccess={fetchProducts} />

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Products</CardTitle>
          <CardDescription>Manage your store inventory</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No products yet. Create your first product above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
                >
                  {/* Product Image */}
                  {product.image ? (
                    <div className="relative w-full h-40 bg-gray-100">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-gray-300" />
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold truncate">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">◎ {product.price.toFixed(2)}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          product.stock > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.stock} stock
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={deletingId === product.id}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={deletingId === product.id}
                      >
                        {deletingId === product.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
