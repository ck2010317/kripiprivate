'use client'

import { Star, ShoppingBag, Package } from 'lucide-react'
import Image from 'next/image'

interface StoreDisplayProps {
  store: {
    id: string
    name: string
    slug: string
    description: string
    image: string | null
    totalSales: number
    totalOrders: number
    rating: number
    reviewCount: number
    isVerified: boolean
    productCount: number
  }
}

export function StoreDisplay({ store }: StoreDisplayProps) {
  return (
    <div className="w-full">
      {/* Store Header with Image */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg overflow-hidden mb-6">
        {store.image && (
          <div className="relative w-full h-56 bg-slate-700">
            <Image
              src={store.image}
              alt={store.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}
        
        <div className="p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{store.name}</h1>
                {store.isVerified && (
                  <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                    Verified
                  </div>
                )}
              </div>
              
              {store.description && (
                <p className="text-gray-300 mb-4">{store.description}</p>
              )}

              {/* Store Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-sm text-gray-400">Orders</span>
                  </div>
                  <p className="text-2xl font-bold">{store.totalOrders}</p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4" />
                    <span className="text-sm text-gray-400">Products</span>
                  </div>
                  <p className="text-2xl font-bold">{store.productCount}</p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-400">Rating</span>
                  </div>
                  <p className="text-2xl font-bold">{store.rating.toFixed(1)}</p>
                  <p className="text-xs text-gray-400">({store.reviewCount} reviews)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
