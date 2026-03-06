'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SellerOnboarding } from '@/app/components/seller-onboarding'
import { Loader2 } from 'lucide-react'

interface Store {
  id: string
  name: string
  slug: string
  description: string
  image: string
  totalSales: number
  totalOrders: number
  rating: number
  productCount: number
}

export default function SellerDashboard() {
  const router = useRouter()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUserStore = async () => {
      try {
        const response = await fetch('/api/marketplace/stores/my-store')
        
        if (response.status === 404) {
          // No store yet, show onboarding
          setStore(null)
          setLoading(false)
          return
        }

        if (!response.ok) {
          throw new Error('Failed to fetch store')
        }

        const data = await response.json()
        setStore(data.store)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchUserStore()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Error</h1>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // User has a store - redirect to store management
  if (store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to {store.name}
          </h1>
          <p className="text-gray-600 mt-2">Redirecting to your store dashboard...</p>
          {/* You can add store management UI here */}
        </div>
      </div>
    )
  }

  // No store yet - show onboarding
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              PrivateShop
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Become a Seller
          </h1>
          <p className="text-xl text-gray-300">
            Launch your store and start selling to thousands of customers with Solana payments
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="text-3xl mb-3">🏪</div>
            <h3 className="text-lg font-semibold text-white mb-2">Create Your Store</h3>
            <p className="text-gray-400 text-sm">
              Set up a professional store in minutes with no technical knowledge required
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="text-3xl mb-3">📦</div>
            <h3 className="text-lg font-semibold text-white mb-2">List Products</h3>
            <p className="text-gray-400 text-sm">
              Add unlimited products with images, descriptions, and pricing
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-lg font-semibold text-white mb-2">Get Paid in SOL</h3>
            <p className="text-gray-400 text-sm">
              Receive payments instantly in Solana with zero KYC requirements
            </p>
          </div>
        </div>

        {/* Onboarding Form */}
        <SellerOnboarding />

        {/* Footer Info */}
        <div className="mt-12 bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h3 className="text-lg font-semibold text-white mb-4">Why Sell on PrivateShop?</h3>
          <div className="grid md:grid-cols-2 gap-4 text-gray-300 text-sm">
            <div>✓ No KYC/Account verification required</div>
            <div>✓ Direct Solana payments to your wallet</div>
            <div>✓ No transaction fees - keep 100% of your sales</div>
            <div>✓ Instant payouts, no waiting periods</div>
            <div>✓ Full control over your store and products</div>
            <div>✓ Built-in review and rating system</div>
          </div>
        </div>
      </div>
    </div>
  )
}
