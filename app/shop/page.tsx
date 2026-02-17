"use client"

import React, { useState, useEffect, useCallback } from "react"
import { ArrowLeft, ShoppingBag, X, Plus, Minus, Package, Check, Copy, ExternalLink, Search, SlidersHorizontal, Star, Truck, Shield, ChevronDown } from "lucide-react"

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Product {
  id: string
  name: string
  description: string
  price: number
  category: "men" | "women"
  type: string
  colors: string[]
  sizes: string[]
  rating: number
  reviews: number
  badge?: string
  gradient: string
  accent: string
  image: string
}

interface CartItem {
  product: Product
  quantity: number
  size: string
  color: string
}

interface OrderDetails {
  items: CartItem[]
  total: number
  solAmount: number
  email: string
  shippingAddress: string
  name: string
}

// ─── PRODUCT DATA ────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  // MEN'S COLLECTION
  {
    id: "m-arctic-puffer",
    name: "Arctic Shadow Puffer",
    description: "Premium goose-down puffer with matte black water-resistant shell. Features hidden zip pockets, adjustable hood, and thermal-lock insulation rated to -30°C. The ultimate stealth winter jacket.",
    price: 450,
    category: "men",
    type: "Puffer",
    colors: ["Obsidian Black", "Midnight Navy", "Graphite"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    rating: 4.9,
    reviews: 127,
    badge: "BESTSELLER",
    gradient: "from-gray-900 via-gray-800 to-gray-900",
    accent: "#6366f1",
    image: "https://images.pexels.com/photos/6933011/pexels-photo-6933011.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "m-phantom-bomber",
    name: "Phantom Bomber Jacket",
    description: "Military-inspired bomber with premium satin finish. Ribbed collar and cuffs, dual interior pockets, and brushed nickel hardware. Quilted lining for warmth without bulk.",
    price: 420,
    category: "men",
    type: "Bomber",
    colors: ["Jet Black", "Army Green", "Burgundy"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    rating: 4.8,
    reviews: 93,
    gradient: "from-emerald-950 via-gray-900 to-emerald-950",
    accent: "#10b981",
    image: "https://images.pexels.com/photos/6033023/pexels-photo-6033023.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "m-stealth-parka",
    name: "Stealth Tech Parka",
    description: "Extended-length parka with Gore-Tex membrane and Primaloft insulation. Storm flap, adjustable waist, and reflective details. Engineered for extreme urban winter conditions.",
    price: 580,
    category: "men",
    type: "Parka",
    colors: ["Shadow Black", "Dark Olive", "Charcoal"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    rating: 4.9,
    reviews: 156,
    badge: "PREMIUM",
    gradient: "from-slate-900 via-slate-800 to-slate-900",
    accent: "#8b5cf6",
    image: "https://images.pexels.com/photos/11274776/pexels-photo-11274776.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "m-onyx-puffer",
    name: "Onyx Cropped Puffer",
    description: "Cropped silhouette puffer with high-density 700-fill down. Water-repellent nylon shell with matte finish. Magnetic snap closures and internal media pocket. Modern streetwear meets function.",
    price: 400,
    category: "men",
    type: "Puffer",
    colors: ["Pure Black", "Storm Grey", "Deep Navy"],
    sizes: ["S", "M", "L", "XL"],
    rating: 4.7,
    reviews: 84,
    gradient: "from-neutral-900 via-neutral-800 to-neutral-900",
    accent: "#f59e0b",
    image: "https://images.pexels.com/photos/14707926/pexels-photo-14707926.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "m-shadow-windbreaker",
    name: "Shadow Tech Windbreaker",
    description: "Lightweight 3-layer windbreaker with DWR coating. Packable design fits into its own pocket. Laser-cut ventilation and sealed seams. Perfect transitional layer.",
    price: 400,
    category: "men",
    type: "Windbreaker",
    colors: ["Stealth Black", "Slate Blue", "Moss Green"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    rating: 4.6,
    reviews: 72,
    gradient: "from-blue-950 via-gray-900 to-blue-950",
    accent: "#3b82f6",
    image: "https://images.pexels.com/photos/5592271/pexels-photo-5592271.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "m-noir-leather",
    name: "Noir Leather Moto Jacket",
    description: "Full-grain lambskin leather with asymmetric zip. Quilted shoulder panels, snap collar, and satin lining. Hand-finished edges with antique brass hardware. A timeless statement piece.",
    price: 720,
    category: "men",
    type: "Leather",
    colors: ["Classic Black", "Dark Brown"],
    sizes: ["S", "M", "L", "XL"],
    rating: 4.9,
    reviews: 201,
    badge: "ICONIC",
    gradient: "from-amber-950 via-gray-900 to-amber-950",
    accent: "#d97706",
    image: "https://images.pexels.com/photos/983497/pexels-photo-983497.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "m-blizzard-puffer",
    name: "Blizzard Long Puffer",
    description: "Knee-length puffer with 800-fill power down. Detachable faux-fur hood trim, internal drawcord waist, and fleece-lined hand warmer pockets. Maximum warmth for the harshest conditions.",
    price: 520,
    category: "men",
    type: "Puffer",
    colors: ["Void Black", "Arctic White", "Navy"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    rating: 4.8,
    reviews: 118,
    gradient: "from-indigo-950 via-gray-900 to-indigo-950",
    accent: "#818cf8",
    image: "https://images.pexels.com/photos/7823931/pexels-photo-7823931.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "m-carbon-shell",
    name: "Carbon Hardshell Jacket",
    description: "3-layer waterproof hardshell with fully taped seams. Helmet-compatible hood, pit zips, and RECCO reflector. Built for mountain storms and urban downpours alike.",
    price: 480,
    category: "men",
    type: "Shell",
    colors: ["Carbon Black", "Storm Blue", "Olive Drab"],
    sizes: ["S", "M", "L", "XL"],
    rating: 4.7,
    reviews: 89,
    gradient: "from-cyan-950 via-gray-900 to-cyan-950",
    accent: "#06b6d4",
    image: "https://images.pexels.com/photos/5736198/pexels-photo-5736198.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "m-eclipse-vest",
    name: "Eclipse Down Vest",
    description: "Lightweight 650-fill down vest with stretch side panels. Perfect mid-layer or standalone piece. Elastic binding at armholes and hem. Packs into internal chest pocket.",
    price: 400,
    category: "men",
    type: "Vest",
    colors: ["Matte Black", "Charcoal", "Tan"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    rating: 4.6,
    reviews: 67,
    gradient: "from-stone-900 via-stone-800 to-stone-900",
    accent: "#a78bfa",
    image: "https://images.pexels.com/photos/20532194/pexels-photo-20532194.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "m-vortex-puffer",
    name: "Vortex Oversized Puffer",
    description: "Oversized boxy silhouette with ultra-thick quilting. 750-fill duck down, toggle drawcord hem, and chunky two-way zip. The statement puffer for those who want to stand out.",
    price: 460,
    category: "men",
    type: "Puffer",
    colors: ["Deep Black", "Cement Grey", "Forest Green"],
    sizes: ["S", "M", "L", "XL"],
    rating: 4.8,
    reviews: 95,
    badge: "NEW",
    gradient: "from-green-950 via-gray-900 to-green-950",
    accent: "#22c55e",
    image: "https://images.pexels.com/photos/11232184/pexels-photo-11232184.jpeg?auto=compress&cs=tinysrgb&w=800",
  },

  // WOMEN'S COLLECTION
  {
    id: "w-aurora-puffer",
    name: "Aurora Cropped Puffer",
    description: "Ultra-chic cropped puffer with high collar and cinched waist. 700-fill responsibly-sourced down, water-resistant shell, and hidden magnetic closures. Designed for effortless winter style.",
    price: 430,
    category: "women",
    type: "Puffer",
    colors: ["Onyx", "Lavender Frost", "Cream"],
    sizes: ["XS", "S", "M", "L", "XL"],
    rating: 4.9,
    reviews: 183,
    badge: "BESTSELLER",
    gradient: "from-purple-950 via-gray-900 to-purple-950",
    accent: "#c084fc",
    image: "https://images.pexels.com/photos/14844553/pexels-photo-14844553.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "w-velvet-bomber",
    name: "Velvet Night Bomber",
    description: "Luxe velvet-touch bomber with silk lining. Slim fit with ribbed trim, embossed snap buttons, and interior zip pocket. Transitional elegance that works day-to-night.",
    price: 440,
    category: "women",
    type: "Bomber",
    colors: ["Black Velvet", "Deep Plum", "Emerald"],
    sizes: ["XS", "S", "M", "L", "XL"],
    rating: 4.8,
    reviews: 109,
    gradient: "from-fuchsia-950 via-gray-900 to-fuchsia-950",
    accent: "#e879f9",
    image: "https://images.pexels.com/photos/6173925/pexels-photo-6173925.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "w-glacier-parka",
    name: "Glacier Long Parka",
    description: "Floor-sweeping parka with removable faux-fur hood. Waterproof breathable membrane, down-filled body, and cinched waist for a flattering silhouette. Rated to -25°C.",
    price: 560,
    category: "women",
    type: "Parka",
    colors: ["Shadow Black", "Dove Grey", "Winter White"],
    sizes: ["XS", "S", "M", "L", "XL"],
    rating: 4.9,
    reviews: 147,
    badge: "PREMIUM",
    gradient: "from-rose-950 via-gray-900 to-rose-950",
    accent: "#fb7185",
    image: "https://images.pexels.com/photos/29696316/pexels-photo-29696316.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "w-noir-trench",
    name: "Noir Leather Trench",
    description: "Full-length leather trench in butter-soft lambskin. Wide lapels, self-tie belt, and deep side pockets. Storm flap detail and satin lining. The ultimate power piece.",
    price: 780,
    category: "women",
    type: "Leather",
    colors: ["Jet Black", "Espresso Brown"],
    sizes: ["XS", "S", "M", "L"],
    rating: 4.9,
    reviews: 89,
    badge: "ICONIC",
    gradient: "from-red-950 via-gray-900 to-red-950",
    accent: "#ef4444",
    image: "https://images.pexels.com/photos/2966524/pexels-photo-2966524.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "w-cloud-puffer",
    name: "Cloud Oversized Puffer",
    description: "Cozy oversized puffer with cloud-like 800-fill down. Drop shoulders, funnel neck, and elasticated cuffs. Two-way zip and fleece-lined kangaroo pocket. Like wearing a warm embrace.",
    price: 470,
    category: "women",
    type: "Puffer",
    colors: ["Obsidian", "Pale Rose", "Ice Blue"],
    sizes: ["XS", "S", "M", "L", "XL"],
    rating: 4.8,
    reviews: 132,
    gradient: "from-sky-950 via-gray-900 to-sky-950",
    accent: "#38bdf8",
    image: "https://images.pexels.com/photos/3214729/pexels-photo-3214729.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "w-midnight-windbreaker",
    name: "Midnight Windbreaker",
    description: "Sleek fitted windbreaker with reflective trim details. Packable, water-resistant, and breathable. Half-zip with toggle hem and mesh-lined interior. Athleisure perfected.",
    price: 400,
    category: "women",
    type: "Windbreaker",
    colors: ["Black", "Dusty Rose", "Sage"],
    sizes: ["XS", "S", "M", "L", "XL"],
    rating: 4.7,
    reviews: 76,
    gradient: "from-pink-950 via-gray-900 to-pink-950",
    accent: "#f472b6",
    image: "https://images.pexels.com/photos/663437/pexels-photo-663437.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "w-frost-vest",
    name: "Frost Quilted Vest",
    description: "Diamond-quilted vest with stretch fleece side panels. 600-fill down, stand collar, and snap placket over zip. The perfect layering piece from trail to town.",
    price: 400,
    category: "women",
    type: "Vest",
    colors: ["Black", "Taupe", "Sage Green"],
    sizes: ["XS", "S", "M", "L", "XL"],
    rating: 4.6,
    reviews: 58,
    gradient: "from-teal-950 via-gray-900 to-teal-950",
    accent: "#2dd4bf",
    image: "https://images.pexels.com/photos/7147444/pexels-photo-7147444.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "w-shadow-shearling",
    name: "Shadow Shearling Jacket",
    description: "Genuine shearling-lined suede jacket with oversized lapels. Antique brass buckle belt, deep patch pockets, and raw-edge detailing. Artisan-crafted warmth meets runway style.",
    price: 680,
    category: "women",
    type: "Shearling",
    colors: ["Dark Chocolate", "Black Suede"],
    sizes: ["XS", "S", "M", "L"],
    rating: 4.9,
    reviews: 74,
    badge: "ARTISAN",
    gradient: "from-orange-950 via-gray-900 to-orange-950",
    accent: "#fb923c",
    image: "https://images.pexels.com/photos/374593/pexels-photo-374593.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "w-tempest-puffer",
    name: "Tempest Belted Puffer",
    description: "Waist-belted puffer with A-line silhouette. 700-fill down, detachable hood, and ruched elastic cuffs. Combines structured elegance with serious cold-weather protection.",
    price: 490,
    category: "women",
    type: "Puffer",
    colors: ["Deep Black", "Ivory", "Bordeaux"],
    sizes: ["XS", "S", "M", "L", "XL"],
    rating: 4.8,
    reviews: 101,
    badge: "NEW",
    gradient: "from-violet-950 via-gray-900 to-violet-950",
    accent: "#a78bfa",
    image: "https://images.pexels.com/photos/10392159/pexels-photo-10392159.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "w-aether-cocoon",
    name: "Aether Cocoon Coat",
    description: "Cocoon-shaped wool-blend coat with hidden snap closures. Oversized patch pockets, dropped shoulders, and clean minimal lines. Japanese-inspired design for the modern minimalist.",
    price: 520,
    category: "women",
    type: "Coat",
    colors: ["Charcoal", "Camel", "Off-White"],
    sizes: ["XS", "S", "M", "L"],
    rating: 4.8,
    reviews: 92,
    gradient: "from-yellow-950 via-gray-900 to-yellow-950",
    accent: "#fbbf24",
    image: "https://images.pexels.com/photos/6497713/pexels-photo-6497713.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
]

const SHOP_WALLET = "9YJAc6bsLoB5BU22ZJQfo1pn7q7R6A2U5KsHFby7FcsD"

// ─── PRODUCT IMAGE COMPONENT ─────────────────────────────────────────────────
function ProductImage({ product, className = "" }: { product: Product; className?: string }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${product.gradient} ${className}`}>
      {/* Loading skeleton */}
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/30 to-muted/10" />
      )}
      
      {/* Real product photo */}
      {!error ? (
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : (
        /* Fallback gradient with text */
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: product.accent + '20' }}>
              <Package className="w-8 h-8" style={{ color: product.accent }} />
            </div>
            <p className="text-sm font-semibold text-white/80">{product.name}</p>
          </div>
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
      
      {/* Badge */}
      {product.badge && (
        <div 
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider text-white shadow-lg"
          style={{ backgroundColor: product.accent }}
        >
          {product.badge}
        </div>
      )}
    </div>
  )
}

// ─── MAIN SHOP PAGE ──────────────────────────────────────────────────────────
export default function PrivateShop() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showProduct, setShowProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"all" | "men" | "women">("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [solPrice, setSolPrice] = useState<number>(0)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [copied, setCopied] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch SOL price
  useEffect(() => {
    fetch("/api/shop/price")
      .then(r => r.json())
      .then(d => setSolPrice(d.solPrice))
      .catch(() => setSolPrice(100))
  }, [])

  const filteredProducts = PRODUCTS.filter(p => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false
    if (typeFilter !== "all" && p.type !== typeFilter) return false
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const productTypes = [...new Set(PRODUCTS.map(p => p.type))]

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartSol = solPrice > 0 ? (cartTotal / solPrice) * 1.02 : 0

  const addToCart = useCallback((product: Product, size: string, color: string) => {
    setCart(prev => {
      const existing = prev.find(
        item => item.product.id === product.id && item.size === size && item.color === color
      )
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id && item.size === size && item.color === color
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1, size, color }]
    })
  }, [])

  const removeFromCart = useCallback((productId: string, size: string, color: string) => {
    setCart(prev =>
      prev
        .map(item =>
          item.product.id === productId && item.size === size && item.color === color
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter(item => item.quantity > 0)
    )
  }, [])

  const copyAddress = async () => {
    await navigator.clipboard.writeText(SHOP_WALLET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── ORDER PLACED VIEW ──────────────────────────────────────────────────────
  if (orderPlaced && orderDetails) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Order Placed!</h1>
            <p className="text-muted-foreground">
              Send exactly <span className="text-primary font-bold">{orderDetails.solAmount.toFixed(4)} SOL</span> to complete your purchase.
            </p>
          </div>

          {/* Payment Details */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Payment Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">SEND SOL TO</p>
                <div className="flex items-center gap-2 bg-background rounded-lg p-3 border border-border">
                  <code className="text-xs flex-1 break-all text-primary font-mono">{SHOP_WALLET}</code>
                  <button onClick={copyAddress} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">AMOUNT (SOL)</p>
                  <p className="text-lg font-bold text-primary">{orderDetails.solAmount.toFixed(4)} SOL</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">AMOUNT (USD)</p>
                  <p className="text-lg font-bold">${orderDetails.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-4">Order Summary</h3>
            {orderDetails.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-sm">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{item.color} · {item.size} · Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">${(item.product.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Shipping Info */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-4">Shipping To</h3>
            <p className="text-sm">{orderDetails.name}</p>
            <p className="text-sm text-muted-foreground">{orderDetails.email}</p>
            <p className="text-sm text-muted-foreground mt-1">{orderDetails.shippingAddress}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setOrderPlaced(false); setOrderDetails(null); setCart([]); setShowCheckout(false) }}
              className="flex-1 py-4 rounded-xl bg-card border border-border text-foreground font-semibold hover:bg-muted transition-colors"
            >
              Continue Shopping
            </button>
            <a
              href={`https://solscan.io/account/${SHOP_WALLET}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 py-4 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Verify on Solscan
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ─── CHECKOUT VIEW ─────────────────────────────────────────────────────────
  if (showCheckout) {
    return <CheckoutView 
      cart={cart} 
      cartTotal={cartTotal} 
      cartSol={cartSol} 
      solPrice={solPrice}
      onBack={() => setShowCheckout(false)}
      onPlaceOrder={(details) => { setOrderDetails(details); setOrderPlaced(true) }}
      copyAddress={copyAddress}
      copied={copied}
    />
  }

  // ─── PRODUCT DETAIL VIEW ──────────────────────────────────────────────────
  if (showProduct) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setShowProduct(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Shop
            </button>
            <CartButton count={cartCount} onClick={() => setShowCart(true)} />
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Product Image */}
            <div className="relative">
              <ProductImage product={showProduct} className="aspect-[4/5] rounded-2xl" />
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-primary tracking-widest mb-2">{showProduct.category.toUpperCase()} · {showProduct.type.toUpperCase()}</p>
                <h1 className="text-3xl lg:text-4xl font-bold mb-3">{showProduct.name}</h1>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{showProduct.rating}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">({showProduct.reviews} reviews)</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{showProduct.description}</p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">${showProduct.price}</span>
                {solPrice > 0 && (
                  <span className="text-sm text-muted-foreground">≈ {((showProduct.price / solPrice) * 1.02).toFixed(3)} SOL</span>
                )}
              </div>

              {/* Color Selection */}
              <div>
                <p className="text-sm font-semibold mb-3">COLOR</p>
                <div className="flex flex-wrap gap-2">
                  {showProduct.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                        selectedColor === color
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div>
                <p className="text-sm font-semibold mb-3">SIZE</p>
                <div className="flex flex-wrap gap-2">
                  {showProduct.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 rounded-lg text-sm font-semibold border transition-all ${
                        selectedSize === size
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add to Cart */}
              <button
                onClick={() => {
                  if (!selectedSize || !selectedColor) return
                  addToCart(showProduct, selectedSize, selectedColor)
                  setShowProduct(null)
                  setSelectedSize("")
                  setSelectedColor("")
                }}
                disabled={!selectedSize || !selectedColor}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-lg hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {!selectedSize || !selectedColor ? "Select Size & Color" : "Add to Cart"}
              </button>

              {/* Features */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                <div className="text-center py-3">
                  <Truck className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Free Shipping</p>
                </div>
                <div className="text-center py-3">
                  <Shield className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Secure Payment</p>
                </div>
                <div className="text-center py-3">
                  <Package className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Discreet Packaging</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ─── MAIN SHOP VIEW ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                PrivateShop
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">by PrivatePay</p>
            </div>
          </div>
          <CartButton count={cartCount} onClick={() => setShowCart(true)} />
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <p className="text-xs font-semibold text-primary tracking-[0.3em] mb-4">DECENTRALIZED FASHION</p>
          <h2 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Premium Outerwear
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">Pay with SOL</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            No accounts. No tracking. No KYC. Just premium jackets, puffers, and outerwear — paid with Solana. 
            Your fashion, your privacy.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 bg-card/50 px-3 py-1.5 rounded-full border border-border">
              <Shield className="w-3 h-3 text-primary" /> No KYC Required
            </span>
            <span className="flex items-center gap-1.5 bg-card/50 px-3 py-1.5 rounded-full border border-border">
              <Truck className="w-3 h-3 text-primary" /> Worldwide Shipping
            </span>
            <span className="flex items-center gap-1.5 bg-card/50 px-3 py-1.5 rounded-full border border-border">
              <Package className="w-3 h-3 text-primary" /> Discreet Packaging
            </span>
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="max-w-7xl mx-auto px-4 pb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search jackets, puffers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          
          {/* Category tabs */}
          <div className="flex gap-1 bg-card rounded-xl border border-border p-1">
            {(["all", "men", "women"] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat === "all" ? "All" : cat === "men" ? "Men" : "Women"}
              </button>
            ))}
          </div>

          {/* Type filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Type
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Type filter chips */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3 animate-slide-up">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                typeFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              All Types
            </button>
            {productTypes.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  typeFilter === type ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Product Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">{filteredProducts.length} products</p>
          {solPrice > 0 && (
            <p className="text-xs text-muted-foreground">SOL ≈ ${solPrice.toFixed(2)}</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => { setShowProduct(product); setSelectedSize(""); setSelectedColor("") }}
              className="group text-left bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
            >
              <ProductImage product={product} className="aspect-[3/4]" />
              <div className="p-3 md:p-4">
                <p className="text-[10px] text-muted-foreground tracking-wider mb-1">{product.category.toUpperCase()} · {product.type.toUpperCase()}</p>
                <h3 className="font-semibold text-sm md:text-base mb-1 group-hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
                <div className="flex items-center gap-2">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">{product.rating} ({product.reviews})</span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-bold">${product.price}</span>
                  {solPrice > 0 && (
                    <span className="text-xs text-muted-foreground">≈ {((product.price / solPrice) * 1.02).toFixed(2)} SOL</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">No products found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}
      </section>

      {/* Cart Slide-over */}
      {showCart && (
        <CartSlideOver
          cart={cart}
          cartTotal={cartTotal}
          cartSol={cartSol}
          solPrice={solPrice}
          onClose={() => setShowCart(false)}
          onRemove={removeFromCart}
          onAdd={(item) => addToCart(item.product, item.size, item.color)}
          onCheckout={() => { setShowCart(false); setShowCheckout(true) }}
        />
      )}
    </div>
  )
}

// ─── CART BUTTON ──────────────────────────────────────────────────────────────
function CartButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
    >
      <ShoppingBag className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  )
}

// ─── CART SLIDE-OVER ──────────────────────────────────────────────────────────
function CartSlideOver({
  cart, cartTotal, cartSol, solPrice, onClose, onRemove, onAdd, onCheckout
}: {
  cart: CartItem[]
  cartTotal: number
  cartSol: number
  solPrice: number
  onClose: () => void
  onRemove: (productId: string, size: string, color: string) => void
  onAdd: (item: CartItem) => void
  onCheckout: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Cart ({cart.length})
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-semibold mb-1">Your cart is empty</p>
              <p className="text-sm text-muted-foreground">Add some items to get started</p>
            </div>
          ) : (
            cart.map((item, i) => (
              <div key={`${item.product.id}-${item.size}-${item.color}-${i}`} className="flex gap-3 bg-card rounded-xl border border-border p-3">
                <ProductImage product={item.product} className="w-20 h-24 rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{item.color} · {item.size}</p>
                  <p className="font-bold text-sm mt-1">${(item.product.price * item.quantity).toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onRemove(item.product.id, item.size, item.color)}
                      className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center hover:border-primary/50 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onAdd(item)}
                      className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center hover:border-primary/50 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-border p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-bold">${cartTotal.toFixed(2)}</span>
            </div>
            {solPrice > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">≈ SOL</span>
                <span className="font-bold text-primary">{cartSol.toFixed(4)} SOL</span>
              </div>
            )}
            <button
              onClick={onCheckout}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              Checkout with SOL
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CHECKOUT VIEW ────────────────────────────────────────────────────────────
function CheckoutView({
  cart, cartTotal, cartSol, solPrice, onBack, onPlaceOrder, copyAddress, copied
}: {
  cart: CartItem[]
  cartTotal: number
  cartSol: number
  solPrice: number
  onBack: () => void
  onPlaceOrder: (details: OrderDetails) => void
  copyAddress: () => void
  copied: boolean
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [txHash, setTxHash] = useState("")
  const [sending, setSending] = useState(false)

  const handlePlaceOrder = async () => {
    if (!name || !email || !address) return
    setSending(true)

    const orderData = {
      items: cart.map(item => ({
        name: item.product.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: item.product.price,
      })),
      total: cartTotal,
      solAmount: cartSol,
      name,
      email,
      shippingAddress: address,
      txHash: txHash || "pending",
      walletAddress: SHOP_WALLET,
    }

    // Send order details to API
    try {
      await fetch("/api/shop/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })
    } catch {
      // Order saved attempt - proceed anyway
    }

    onPlaceOrder({
      items: cart,
      total: cartTotal,
      solAmount: cartSol,
      email,
      shippingAddress: address,
      name,
    })
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-bold">Checkout</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Form */}
          <div className="md:col-span-3 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Shipping Information
              </h3>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">FULL NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">SHIPPING ADDRESS</label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street address, city, state, country, zip code"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>

            {/* Payment */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Payment — Send SOL
              </h3>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">SEND TO THIS WALLET</label>
                <div className="flex items-center gap-2 bg-background rounded-xl p-3 border border-border">
                  <code className="text-xs flex-1 break-all text-primary font-mono">{SHOP_WALLET}</code>
                  <button onClick={copyAddress} className="p-1.5 hover:bg-muted rounded-md transition-colors flex-shrink-0">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm font-semibold mb-1">Amount to Send</p>
                <p className="text-2xl font-bold text-primary">{cartSol.toFixed(4)} SOL</p>
                <p className="text-xs text-muted-foreground mt-1">≈ ${cartTotal.toFixed(2)} USD (SOL @ ${solPrice.toFixed(2)})</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">TRANSACTION HASH (OPTIONAL)</label>
                <input
                  type="text"
                  value={txHash}
                  onChange={e => setTxHash(e.target.value)}
                  placeholder="Paste your tx hash for faster verification"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-2">
            <div className="sticky top-20 bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold">Order Summary</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cart.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <ProductImage product={item.product} className="w-14 h-16 rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{item.color} · {item.size} × {item.quantity}</p>
                      <p className="text-sm font-bold">${(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-400">Free</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <div className="text-right">
                    <p>${cartTotal.toFixed(2)}</p>
                    <p className="text-sm font-normal text-primary">{cartSol.toFixed(4)} SOL</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!name || !email || !address || sending}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? "Placing Order..." : "Place Order"}
              </button>
              <p className="text-[10px] text-muted-foreground text-center">
                By placing your order, you agree to send the exact SOL amount shown above. Orders are processed after payment is confirmed on-chain.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
