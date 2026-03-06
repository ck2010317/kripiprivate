'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { StoreDisplay } from '@/app/components/store-display'
import { Loader2, ShoppingCart } from 'lucide-react'

interface StoreProduct {
  id: string
  name: string
  description: string | null
  image: string | null
  price: number
  stock: number
  rating: number
  reviewCount: number
}

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
  isVerified: boolean
  productCount: number
}

export default function StorePage({ params }: { params: { slug: string } }) {
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      try {
        // Fetch store details
        const storeRes = await fetch(`/api/marketplace/stores/${params.slug}`)
        if (!storeRes.ok) throw new Error('Store not found')
        const storeData = await storeRes.json()
        setStore(storeData.store)

        // Fetch store products
        const productsRes = await fetch(
          `/api/marketplace/stores/${storeData.store.id}/products`
        )
        if (productsRes.ok) {
          const productsData = await productsRes.json()
          setProducts(productsData.products || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load store')
      } finally {
        setLoading(false)
      }
    }

    fetchStoreAndProducts()
  }, [params.slug])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Store Not Found</h1>
          <p className="text-gray-400">{error || 'This store does not exist'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Store Header */}
        <StoreDisplay store={store} />

        {/* Products Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Products</h2>

          {products.length === 0 ? (
            <div className="bg-slate-800 rounded-lg p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">This store has no products yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-slate-800 rounded-lg overflow-hidden hover:shadow-lg transition group cursor-pointer"
                >
                  {/* Product Image */}
                  {product.image ? (
                    <div className="relative w-full h-48 bg-slate-700">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-slate-700 flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 text-gray-500" />
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="text-white font-semibold truncate">
                      {product.name}
                    </h3>
                    
                    {product.description && (
                      <p className="text-gray-400 text-sm line-clamp-2 mt-1">
                        {product.description}
                      </p>
                    )}

                    {/* Rating */}
                    {product.reviewCount > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-sm">
                        <span className="text-yellow-400">⭐ {product.rating.toFixed(1)}</span>
                        <span className="text-gray-500">({product.reviewCount})</span>
                      </div>
                    )}

                    {/* Price and Stock */}
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-lg font-bold text-white">
                        ◎ {product.price.toFixed(2)}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          product.stock > 0
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                      </span>
                    </div>

                    {/* Add to Cart Button */}
                    <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition">
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
