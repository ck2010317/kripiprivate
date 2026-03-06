# PrivatePay Marketplace API Reference

## Base URL
```
https://www.privatepay.site
```

## Authentication
All endpoints that require authentication use Bearer tokens:
```
Authorization: Bearer YOUR_AUTH_TOKEN
```

---

## Stores API

### List All Stores (Public)
```
GET /api/marketplace/stores
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by store name or description |
| `sort` | string | `newest`, `popular`, `rating` |

**Response:**
```json
{
  "success": true,
  "stores": [
    {
      "id": "store_abc123",
      "name": "Fashion Hub",
      "slug": "fashion-hub",
      "description": "Premium clothing and accessories",
      "image": "https://...",
      "totalSales": 5000,
      "totalOrders": 42,
      "rating": 4.8,
      "reviewCount": 127,
      "isVerified": true,
      "productCount": 156,
      "createdAt": "2026-03-01T10:00:00Z"
    }
  ]
}
```

---

### Create Store (Auth Required)
```
POST /api/marketplace/stores
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "string (required, min 3 chars)",
  "description": "string (optional)",
  "image": "string (optional, URL)"
}
```

**Response:**
```json
{
  "success": true,
  "store": {
    "id": "store_xyz789",
    "name": "Fashion Hub",
    "slug": "fashion-hub",
    "description": "Premium clothing",
    "image": "https://...",
    "userId": "user_123",
    "createdAt": "2026-03-06T14:30:00Z"
  }
}
```

**Error Cases:**
- `401`: Not logged in
- `400`: Invalid store name (< 3 chars)
- `400`: User already has a store
- `400`: Store name already taken

---

### Get Store Details (Public)
```
GET /api/marketplace/stores/:id
```

**Path Parameters:**
- `:id` - Store ID or slug (e.g., `fashion-hub`)

**Response:**
```json
{
  "success": true,
  "store": {
    "id": "store_abc123",
    "name": "Fashion Hub",
    "slug": "fashion-hub",
    "description": "Premium clothing and accessories",
    "image": "https://...",
    "totalSales": 5000,
    "totalOrders": 42,
    "rating": 4.8,
    "reviewCount": 127,
    "isVerified": true,
    "isActive": true,
    "createdAt": "2026-03-01T10:00:00Z",
    "owner": {
      "name": "John Smith",
      "email": "john@example.com"
    },
    "productCount": 156
  }
}
```

---

### Update Store (Owner Only)
```
PUT /api/marketplace/stores/:id
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "image": "string (optional)",
  "solWallet": "string (optional, Solana address)"
}
```

**Response:**
```json
{
  "success": true,
  "store": {
    "id": "store_abc123",
    "name": "Premium Fashion Hub",
    "slug": "premium-fashion-hub",
    "description": "Updated description",
    "image": "https://...",
    "solWallet": "EPjFWaLb3odcccccccccccc",
    "totalSales": 5000,
    "totalOrders": 42,
    "rating": 4.8,
    "reviewCount": 127
  }
}
```

---

## Products API

### List Products in Store (Public)
```
GET /api/marketplace/stores/:storeId/products
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `sort` | string | `newest`, `price-asc`, `price-desc`, `rating`, `popular` |

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "prod_123",
      "name": "Premium Leather Jacket",
      "description": "High-quality handmade leather jacket",
      "price": 149.99,
      "image": "https://...",
      "stock": 10,
      "category": "clothing",
      "soldCount": 156,
      "rating": 4.9,
      "reviewCount": 78,
      "createdAt": "2026-02-15T09:00:00Z"
    }
  ],
  "count": 1
}
```

---

### Create Product (Store Owner Only)
```
POST /api/marketplace/stores/:storeId/products
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "string (required, min 3 chars)",
  "description": "string (required)",
  "price": "number (required, min $0.01)",
  "image": "string (optional, URL)",
  "stock": "number (required, >= 0)",
  "category": "string (optional)",
  "tags": "string (optional, comma-separated)"
}
```

**Response:**
```json
{
  "success": true,
  "product": {
    "id": "prod_new123",
    "name": "Premium Leather Jacket",
    "description": "High-quality handmade leather jacket",
    "price": 149.99,
    "image": "https://...",
    "stock": 10,
    "category": "clothing",
    "tags": "leather,jacket,men",
    "createdAt": "2026-03-06T14:30:00Z"
  }
}
```

---

### Get Product Details (Public)
```
GET /api/marketplace/stores/:storeId/products/:productId
```

**Response:**
```json
{
  "success": true,
  "product": {
    "id": "prod_123",
    "name": "Premium Leather Jacket",
    "description": "High-quality handmade leather jacket",
    "price": 149.99,
    "image": "https://...",
    "stock": 10,
    "category": "clothing",
    "tags": "leather,jacket,men",
    "soldCount": 156,
    "rating": 4.9,
    "reviewCount": 78,
    "isActive": true,
    "createdAt": "2026-02-15T09:00:00Z",
    "updatedAt": "2026-03-06T10:00:00Z",
    "store": {
      "id": "store_abc123",
      "name": "Fashion Hub",
      "slug": "fashion-hub"
    }
  }
}
```

---

### Update Product (Store Owner Only)
```
PUT /api/marketplace/stores/:storeId/products/:productId
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "price": "number (optional)",
  "image": "string (optional)",
  "stock": "number (optional)",
  "category": "string (optional)",
  "tags": "string (optional)",
  "isActive": "boolean (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "product": {
    "id": "prod_123",
    "name": "Premium Leather Jacket",
    "price": 129.99,
    "stock": 8,
    "isActive": true
  }
}
```

---

### Delete Product (Store Owner Only)
```
DELETE /api/marketplace/stores/:storeId/products/:productId
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Marketplace Browse API

### Browse All Products (Public)
```
GET /api/marketplace/products
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by name, description, tags |
| `category` | string | Filter by category |
| `store` | string | Filter by store ID |
| `sort` | string | `newest`, `price-asc`, `price-desc`, `rating`, `popular` |
| `limit` | number | Max results (default 50) |

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "prod_123",
      "name": "Premium Leather Jacket",
      "description": "High-quality handmade leather jacket",
      "price": 149.99,
      "image": "https://...",
      "stock": 10,
      "category": "clothing",
      "soldCount": 156,
      "rating": 4.9,
      "reviewCount": 78,
      "storeId": "store_abc123",
      "store": {
        "id": "store_abc123",
        "name": "Fashion Hub",
        "slug": "fashion-hub",
        "image": "https://...",
        "rating": 4.8
      },
      "createdAt": "2026-02-15T09:00:00Z"
    }
  ],
  "count": 42
}
```

---

## Orders API

### Get User's Orders (Auth Required)
```
GET /api/marketplace/orders
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "order_xyz789",
      "totalAmount": 299.98,
      "totalSol": 2.0,
      "status": "PAID",
      "createdAt": "2026-03-06T14:30:00Z",
      "paidAt": "2026-03-06T14:32:00Z",
      "items": [
        {
          "id": "item_123",
          "quantity": 1,
          "priceAtPurchase": 149.99,
          "product": {
            "id": "prod_123",
            "name": "Premium Leather Jacket",
            "image": "https://..."
          },
          "store": {
            "id": "store_abc123",
            "name": "Fashion Hub",
            "slug": "fashion-hub"
          }
        }
      ]
    }
  ]
}
```

---

### Create Order (Auth Required)
```
POST /api/marketplace/orders
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "items": [
    {
      "productId": "prod_123",
      "quantity": 1
    },
    {
      "productId": "prod_456",
      "quantity": 2
    }
  ],
  "shippingName": "John Doe",
  "shippingEmail": "john@example.com",
  "shippingAddress": "123 Main Street, New York, NY 10001, USA"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_xyz789",
    "totalAmount": 299.98,
    "totalSol": 1.99987,
    "solPriceAtTime": 150.00,
    "status": "PENDING",
    "items": [
      {
        "id": "item_123",
        "quantity": 1,
        "priceAtPurchase": 149.99,
        "subtotal": 149.99,
        "product": {
          "id": "prod_123",
          "name": "Premium Leather Jacket"
        },
        "store": {
          "id": "store_abc123",
          "name": "Fashion Hub"
        }
      },
      {
        "id": "item_456",
        "quantity": 2,
        "priceAtPurchase": 75.00,
        "subtotal": 150.00,
        "product": {
          "id": "prod_456",
          "name": "Premium Shoes"
        },
        "store": {
          "id": "store_def456",
          "name": "Shoe Paradise"
        }
      }
    ],
    "createdAt": "2026-03-06T14:30:00Z"
  }
}
```

**Error Cases:**
- `401`: Not logged in
- `400`: Order must contain at least one item
- `400`: Missing shipping information
- `400`: Product no longer exists
- `400`: Not enough stock for product

---

### Get Order Details (Auth Required)
```
GET /api/marketplace/orders/:orderId
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_xyz789",
    "totalAmount": 299.98,
    "totalSol": 1.99987,
    "solPriceAtTime": 150.00,
    "status": "PAID",
    "txSignature": "SOLANA_TRANSACTION_HASH_HERE",
    "shippingName": "John Doe",
    "shippingEmail": "john@example.com",
    "shippingAddress": "123 Main Street, NY 10001",
    "createdAt": "2026-03-06T14:30:00Z",
    "paidAt": "2026-03-06T14:32:00Z",
    "items": [
      {
        "id": "item_123",
        "quantity": 1,
        "priceAtPurchase": 149.99,
        "product": { "id": "prod_123", "name": "Jacket" },
        "store": { "id": "store_abc123", "name": "Fashion Hub" }
      }
    ]
  }
}
```

---

### Verify Payment (Auth Required)
```
POST /api/marketplace/orders/:orderId
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "txSignature": "SOLANA_TRANSACTION_HASH_HERE"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_xyz789",
    "status": "PAID",
    "txSignature": "SOLANA_TRANSACTION_HASH_HERE",
    "paidAt": "2026-03-06T14:32:00Z",
    "totalAmount": 299.98,
    "totalSol": 1.99987,
    "items": [...]
  },
  "message": "Order verified and payment confirmed"
}
```

**Side Effects:**
- Order status changes to PAID
- Product stock deducted for each item
- Vendor payout records created
- Store sales/orders updated

---

### Cancel Order (Auth Required - Buyer Only)
```
PATCH /api/marketplace/orders/:orderId
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "status": "CANCELLED"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_xyz789",
    "status": "CANCELLED",
    "items": [...]
  },
  "message": "Order cancelled"
}
```

**Constraints:**
- Only PENDING orders can be cancelled
- Only order owner (buyer) can cancel

---

## Status Values

### Order Status
- `PENDING` - Awaiting payment
- `PAID` - Payment confirmed
- `PROCESSING` - Being prepared by vendor
- `SHIPPED` - In transit
- `DELIVERED` - Received by customer
- `CANCELLED` - Cancelled by buyer
- `REFUNDED` - Refund issued

### Payout Status
- `PENDING` - Awaiting payout processing
- `PROCESSING` - SOL transfer in progress
- `PAID` - Successfully transferred to vendor
- `FAILED` - Transfer failed

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong",
  "success": false
}
```

### Common HTTP Status Codes
| Code | Meaning |
|------|---------|
| `200` | OK - Request succeeded |
| `201` | Created - New resource created |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Not logged in |
| `403` | Forbidden - No permission |
| `404` | Not Found - Resource doesn't exist |
| `500` | Server Error - Backend issue |

---

## Rate Limiting

- **Default:** 100 requests per minute per IP
- **Auth:** 200 requests per minute per user
- **No limits:** GET endpoints (browsing)

---

## Examples

### Complete Order Flow

#### 1. Browse Products
```bash
curl https://www.privatepay.site/api/marketplace/products?search=jacket&sort=rating
```

#### 2. Create Order
```bash
curl -X POST https://www.privatepay.site/api/marketplace/orders \
  -H "Authorization: Bearer abc123token" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "prod_123", "quantity": 1}],
    "shippingName": "John Doe",
    "shippingEmail": "john@example.com",
    "shippingAddress": "123 Main St, NY 10001"
  }'
```

Response: Order ID, total SOL amount

#### 3. Send SOL to Shop Wallet
Customer sends SOL via Solana wallet

#### 4. Verify Payment
```bash
curl -X POST https://www.privatepay.site/api/marketplace/orders/order_xyz789 \
  -H "Authorization: Bearer abc123token" \
  -H "Content-Type: application/json" \
  -d '{
    "txSignature": "5Uzz3rUWWW2Lg4DtsFKDXYUVkDjV9hJ..."
  }'
```

Order complete! Vendor receives payout.

---

## Notes

- All timestamps are ISO 8601 format (UTC)
- Prices are in USD, converted to SOL at order time
- Stock is checked at order creation and deducted at payment
- One user = one store (can't own multiple stores)
- Products can be in multiple categories via tags
- Ratings calculated as average of all reviews

