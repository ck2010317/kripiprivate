'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Store } from 'lucide-react'

export function MainNavigation() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
          <ShoppingBag className="w-6 h-6" />
          PrivateShop
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          <Link href="/marketplace" className="text-gray-600 hover:text-gray-900 font-medium">
            Browse
          </Link>
          
          <Link href="/shop/seller">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Store className="w-4 h-4" />
              Become a Seller
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
