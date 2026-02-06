const KRIPICARD_BASE_URL = "https://kripicard.com/api"
const API_KEY = process.env.KRIPICARD_API_KEY || ""

export interface CreateCardRequest {
  amount: number
  bankBin?: string
  name_on_card: string
  email: string
}

export interface CreateCardResponse {
  success: boolean
  card_id: string
  card_number: string
  expiry_date: string
  cvv: string
  balance: number
  message?: string
}

export interface FundCardRequest {
  card_id: string
  amount: number
}

export interface FundCardResponse {
  success: boolean
  new_balance: number
  message?: string
}

export interface CardDetailsResponse {
  success: boolean
  card_id: string
  card_number: string
  expiry_date: string
  cvv: string
  balance: number
  status: string
  name_on_card: string
  message?: string
}

export interface FreezeUnfreezeRequest {
  card_id: string
  action: "freeze" | "unfreeze"
}

export interface FreezeUnfreezeResponse {
  success: boolean
  status: string
  message?: string
}

export interface CardTransaction {
  transaction_id: string
  card_id: string
  type: string // "purchase", "refund", "charge", etc.
  amount: number
  merchant?: string
  description: string
  date: string
  status: string
  currency?: string
}

export interface CardTransactionsResponse {
  success: boolean
  transactions: CardTransaction[]
  message?: string
}

// Create a new virtual card
export async function createCard(request: CreateCardRequest): Promise<CreateCardResponse> {
  if (!API_KEY) {
    throw new Error("KRIPICARD_API_KEY is not configured")
  }

  console.log("[KripiCard] Creating card for", request.name_on_card, "- Amount:", request.amount)
  
  // Validate inputs
  if (!request.amount || request.amount <= 0) {
    throw new Error(`Invalid amount: ${request.amount}. Amount must be greater than 0`)
  }

  if (!request.name_on_card || request.name_on_card.trim().length === 0) {
    throw new Error("name_on_card is required and cannot be empty")
  }

  if (!request.email || request.email.trim().length === 0) {
    throw new Error("email is required and cannot be empty")
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(request.email)) {
    throw new Error(`Invalid email format: ${request.email}`)
  }

  // Actually call the API
  try {
    // Ensure amount is a number and round to 2 decimal places
    const amount = Math.round(parseFloat(String(request.amount)) * 100) / 100
    
    const payload = {
      api_key: API_KEY,
      amount: amount,
      bankBin: request.bankBin || "49387520",
      name_on_card: request.name_on_card.toUpperCase().trim(),
      email: request.email.toLowerCase().trim(),
    }
    
    console.log("[KripiCard] Payload keys:", Object.keys(payload))
    console.log("[KripiCard] API_KEY present:", !!API_KEY)
    console.log("[KripiCard] API_KEY length:", API_KEY.length)
    console.log("[KripiCard] Amount value:", amount, "Type:", typeof amount)
    console.log("[KripiCard] Name on card:", payload.name_on_card, "(length:", payload.name_on_card.length, ")")
    console.log("[KripiCard] Email:", payload.email)
    console.log("[KripiCard] Sending payload:", JSON.stringify(payload, null, 2))
    
    const url = `${KRIPICARD_BASE_URL}/premium/Create_card`
    console.log("[KripiCard] Calling URL:", url)
    console.log("[KripiCard] Request headers:", { "Content-Type": "application/json" })
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("[KripiCard] Response received, status:", response.status)
    console.log("[KripiCard] Response status text:", response.statusText)
    
    const contentType = response.headers.get("content-type")
    console.log("[KripiCard] Response content-type:", contentType)
    
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text()
      console.error("[KripiCard] Non-JSON response body:", text.substring(0, 500))
      throw new Error(`API returned non-JSON (${response.status}): ${text.substring(0, 100)}`)
    }

    const data = await response.json()
    console.log("[KripiCard] Response status:", response.status)
    console.log("[KripiCard] Response data:", JSON.stringify(data, null, 2))
    console.log("[KripiCard] Response data keys:", Object.keys(data))
    console.log("[KripiCard] Response success field:", data.success)

    if (!response.ok) {
      const errorMsg = data.message || data.error || `HTTP ${response.status}`
      console.error("[KripiCard] ❌ API Error:", errorMsg)
      console.error("[KripiCard] Full response:", JSON.stringify(data, null, 2))
      throw new Error(`KripiCard API Error (${response.status}): ${errorMsg}`)
    }

    if (!data.success) {
      const errorMsg = data.message || data.error || "API returned success=false"
      console.error("[KripiCard] ❌ API returned success=false:", errorMsg)
      console.error("[KripiCard] Full response:", JSON.stringify(data, null, 2))
      throw new Error(`KripiCard API Error: ${errorMsg}`)
    }

    if (!data.card_id) {
      console.error("[KripiCard] ❌ Missing card_id in response:", JSON.stringify(data, null, 2))
      throw new Error("KripiCard API returned success but missing card_id")
    }

    // Ensure we have all required fields, with fallbacks
    const responseData: CreateCardResponse = {
      success: data.success || true,
      card_id: data.card_id,
      card_number: data.card_number || data.pan || "****",
      expiry_date: data.expiry_date || data.expiry || "12/25",
      cvv: data.cvv || data.cvc || "***",
      balance: data.balance || request.amount,
      message: data.message,
    }

    console.log("[KripiCard] ✅ Card created with response:", JSON.stringify(responseData, null, 2))
    return responseData
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("[KripiCard] ❌ Exception caught:", errorMsg)
    if (error instanceof Error) {
      console.error("[KripiCard] Stack:", error.stack)
    }
    console.error("[KripiCard] Full error object:", error)
    throw error
  }
}

// Fund an existing card
export async function fundCard(request: FundCardRequest): Promise<FundCardResponse> {
  if (!API_KEY) {
    throw new Error("KRIPICARD_API_KEY is not configured")
  }

  console.log("[KripiCard] Funding card", request.card_id, "with", request.amount, "USD")
  
  // Validate inputs
  if (!request.card_id || request.card_id.trim().length === 0) {
    throw new Error("card_id is required and cannot be empty")
  }

  if (!request.amount || request.amount <= 0) {
    throw new Error(`Invalid amount: ${request.amount}. Amount must be greater than 0`)
  }

  try {
    // Ensure amount is a number and round to 2 decimal places
    const amount = Math.round(parseFloat(String(request.amount)) * 100) / 100
    
    const payload = {
      api_key: API_KEY,
      card_id: request.card_id.trim(),
      amount: amount,
    }
    
    console.log("[KripiCard] Fund payload:", JSON.stringify(payload, null, 2))
    
    const url = `${KRIPICARD_BASE_URL}/premium/Fund_Card`
    console.log("[KripiCard] Calling Fund_Card endpoint:", url)
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("[KripiCard] Fund response status:", response.status)
    
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text()
      console.error("[KripiCard] Non-JSON response:", text.substring(0, 500))
      throw new Error(`API returned non-JSON (${response.status}): ${text.substring(0, 100)}`)
    }

    const data = await response.json()
    console.log("[KripiCard] Fund response data:", JSON.stringify(data, null, 2))

    if (!response.ok) {
      let errorMsg = data.message || data.error || `HTTP ${response.status}`
      
      // Extract specific validation errors from KripiCard
      if (data.errors && typeof data.errors === "object") {
        const errorDetails = Object.entries(data.errors)
          .map(([field, messages]: [string, any]) => {
            if (Array.isArray(messages)) {
              return messages.join(", ")
            }
            return String(messages)
          })
          .join("; ")
        
        if (errorDetails) {
          errorMsg = `${errorMsg} - ${errorDetails}`
        }
      }
      
      console.error("[KripiCard] ❌ Fund API Error:", errorMsg)
      throw new Error(`KripiCard Fund API Error (${response.status}): ${errorMsg}`)
    }

    if (!data.success) {
      let errorMsg = data.message || data.error || "API returned success=false"
      
      // Extract specific validation errors from KripiCard
      if (data.errors && typeof data.errors === "object") {
        const errorDetails = Object.entries(data.errors)
          .map(([field, messages]: [string, any]) => {
            if (Array.isArray(messages)) {
              return messages.join(", ")
            }
            return String(messages)
          })
          .join("; ")
        
        if (errorDetails) {
          errorMsg = `${errorMsg} - ${errorDetails}`
        }
      }
      
      console.error("[KripiCard] ❌ Fund API returned success=false:", errorMsg)
      throw new Error(`KripiCard Fund API Error: ${errorMsg}`)
    }

    // Parse the new balance from response
    const responseData: FundCardResponse = {
      success: data.success || true,
      new_balance: data.new_balance !== undefined ? data.new_balance : request.amount,
      message: data.message,
    }

    console.log("[KripiCard] ✅ Fund successful. New balance:", responseData.new_balance)
    return responseData
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("[KripiCard] ❌ Fund Exception:", errorMsg)
    if (error instanceof Error) {
      console.error("[KripiCard] Stack:", error.stack)
    }
    throw error
  }
}

// Get card details
export async function getCardDetails(cardId: string): Promise<CardDetailsResponse> {
  if (!API_KEY) {
    throw new Error("KRIPICARD_API_KEY is not configured")
  }

  const response = await fetch(
    `${KRIPICARD_BASE_URL}/premium/Get_CardDetails?api_key=${API_KEY}&card_id=${cardId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  let data
  try {
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text()
      throw new Error(`Expected JSON response but got ${contentType}: ${text.substring(0, 100)}`)
    }
    data = await response.json()
  } catch (parseError) {
    console.error("[KripiCard] Failed to parse card details response:", parseError)
    throw new Error(`Failed to get card details: ${parseError instanceof Error ? parseError.message : "Invalid response"}`)
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to get card details")
  }

  return data
}

// Freeze or unfreeze a card
export async function freezeUnfreezeCard(request: FreezeUnfreezeRequest): Promise<FreezeUnfreezeResponse> {
  if (!API_KEY) {
    throw new Error("KRIPICARD_API_KEY is not configured")
  }

  console.log("[KripiCard] Attempting to", request.action, "card:", request.card_id)

  try {
    const payload = {
      api_key: API_KEY,
      card_id: request.card_id.trim(),
      action: request.action,
    }

    console.log("[KripiCard] Freeze/Unfreeze payload:", JSON.stringify(payload, null, 2))

    const url = `${KRIPICARD_BASE_URL}/premium/Freeze_Unfreeze`
    console.log("[KripiCard] Calling Freeze_Unfreeze endpoint:", url)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("[KripiCard] Freeze/Unfreeze response status:", response.status)

    let data
    try {
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("[KripiCard] Non-JSON response:", text.substring(0, 200))
        throw new Error(`Expected JSON response but got ${contentType}`)
      }
      data = await response.json()
    } catch (parseError) {
      console.error("[KripiCard] Failed to parse freeze/unfreeze response:", parseError)
      throw new Error(`Failed to parse freeze/unfreeze response: ${parseError instanceof Error ? parseError.message : "Invalid response"}`)
    }

    console.log("[KripiCard] Freeze/Unfreeze response data:", JSON.stringify(data, null, 2))

    if (!response.ok) {
      const errorMsg = data.message || data.error || `HTTP ${response.status}`
      console.error("[KripiCard] ❌ Freeze/Unfreeze API Error:", errorMsg)
      throw new Error(`KripiCard Freeze/Unfreeze API Error (${response.status}): ${errorMsg}`)
    }

    if (!data.success) {
      const errorMsg = data.message || data.error || "API returned success=false"
      console.error("[KripiCard] ❌ Freeze/Unfreeze API returned success=false:", errorMsg)
      throw new Error(`KripiCard Freeze/Unfreeze API Error: ${errorMsg}`)
    }

    console.log(`[KripiCard] ✅ Card ${request.action}d successfully. Status:`, data.status)

    return {
      success: true,
      status: data.status || request.action.toUpperCase(),
      message: data.message,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("[KripiCard] ❌ Freeze/Unfreeze Exception:", errorMsg)
    if (error instanceof Error) {
      console.error("[KripiCard] Stack:", error.stack)
    }
    throw error
  }
}

// Get card transactions from KripiCard
// NOTE: KripiCard API does not have a dedicated transactions endpoint.
// We use Get_CardDetails which may include transaction data, and also
// log the full response so we can discover the actual data structure.
export async function getCardTransactions(cardId: string): Promise<CardTransactionsResponse> {
  if (!API_KEY) {
    throw new Error("KRIPICARD_API_KEY is not configured")
  }

  console.log("[KripiCard] Fetching transactions for card:", cardId)
  console.log("[KripiCard] Using Get_CardDetails endpoint (no dedicated transactions endpoint)")

  try {
    const response = await fetch(
      `${KRIPICARD_BASE_URL}/premium/Get_CardDetails?api_key=${API_KEY}&card_id=${cardId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    console.log("[KripiCard] Get card details response status:", response.status)

    let data: Record<string, unknown>
    try {
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("[KripiCard] Non-JSON response:", text.substring(0, 500))
        throw new Error(`Expected JSON response but got ${contentType}`)
      }
      data = await response.json()
    } catch (parseError) {
      console.error("[KripiCard] Failed to parse response:", parseError)
      throw new Error(`Failed to parse card details: ${parseError instanceof Error ? parseError.message : "Invalid response"}`)
    }

    // Log the FULL response so we can see all available fields
    console.log("[KripiCard] ===== FULL Card Details Response =====")
    console.log("[KripiCard] Response keys:", Object.keys(data))
    console.log("[KripiCard] Full response:", JSON.stringify(data, null, 2))
    console.log("[KripiCard] ===== END Response =====")

    if (!response.ok) {
      throw new Error((data.message as string) || `Failed to get card details (HTTP ${response.status})`)
    }

    // Search for transactions in every possible field name
    const possibleTransactionFields = [
      "transactions", "Transactions", "transaction", "Transaction",
      "data", "Data", "records", "Records",
      "history", "History", "card_transactions", "CardTransactions",
      "activity", "Activity", "entries", "Entries",
    ]

    let rawTransactions: Record<string, unknown>[] = []
    let foundField = ""

    for (const field of possibleTransactionFields) {
      if (data[field] && Array.isArray(data[field])) {
        rawTransactions = data[field] as Record<string, unknown>[]
        foundField = field
        console.log(`[KripiCard] Found transactions in field "${field}":`, rawTransactions.length, "items")
        break
      }
    }

    // Also check if there's a nested object that contains transactions
    if (rawTransactions.length === 0) {
      for (const key of Object.keys(data)) {
        const val = data[key]
        if (val && typeof val === "object" && !Array.isArray(val)) {
          const nested = val as Record<string, unknown>
          for (const field of possibleTransactionFields) {
            if (nested[field] && Array.isArray(nested[field])) {
              rawTransactions = nested[field] as Record<string, unknown>[]
              foundField = `${key}.${field}`
              console.log(`[KripiCard] Found transactions in nested field "${key}.${field}":`, rawTransactions.length, "items")
              break
            }
          }
          if (rawTransactions.length > 0) break
        }
      }
    }

    if (rawTransactions.length === 0) {
      console.log("[KripiCard] No transaction array found in response. Available keys:", Object.keys(data))
      console.log("[KripiCard] Checking if entire response might be the card object with no transactions support...")
      return {
        success: true,
        transactions: [],
        message: "KripiCard API does not return transaction history. Transactions are visible on the KripiCard dashboard.",
      }
    }

    console.log(`[KripiCard] Raw transactions from "${foundField}":`, JSON.stringify(rawTransactions, null, 2))

    // Normalize transaction data
    const normalizedTransactions: CardTransaction[] = rawTransactions.map((tx, index) => {
      // Parse amount - handle formats like "$-10.15", "-10.15", or numeric values
      let amount = 0
      const rawAmount = tx.amount ?? tx.Amount ?? tx.transaction_amount ?? tx.value ?? tx.Value ?? 0
      if (typeof rawAmount === "string") {
        amount = Math.abs(parseFloat(rawAmount.replace(/[^\d.-]/g, "")) || 0)
      } else if (typeof rawAmount === "number") {
        amount = Math.abs(rawAmount)
      }

      // Map KripiCard type to our normalized type
      const rawType = String(tx.type ?? tx.Type ?? tx.transaction_type ?? tx.txn_type ?? "unknown").toLowerCase()
      let type = rawType
      if (rawType === "consumption" || rawType === "purchase" || rawType === "pos" || rawType === "debit") {
        type = "purchase"
      } else if (rawType === "refund" || rawType === "reversal" || rawType === "credit") {
        type = "refund"
      } else if (rawType === "cashback") {
        type = "cashback"
      } else if (rawType === "charge" || rawType === "fee") {
        type = "charge"
      }

      const merchant = String(tx.merchant ?? tx.Merchant ?? tx.merchant_name ?? tx.merchantName ?? "")
      
      return {
        transaction_id: String(tx.transaction_id ?? tx.id ?? tx.txn_id ?? tx.reference ?? `tx-${index}`),
        card_id: String(tx.card_id ?? tx.cardId ?? cardId),
        type,
        amount,
        merchant,
        description: String(tx.description ?? tx.Description ?? tx.memo ?? tx.note ?? merchant || type),
        date: String(tx.date ?? tx.Date ?? tx.created_at ?? tx.transaction_date ?? tx.timestamp ?? new Date().toISOString()),
        status: String(tx.status ?? tx.Status ?? "completed").toLowerCase(),
        currency: String(tx.currency ?? tx.Currency ?? "USD"),
      }
    })

    console.log("[KripiCard] Normalized", normalizedTransactions.length, "transactions")

    return {
      success: true,
      transactions: normalizedTransactions,
      message: data.message as string | undefined,
    }
  } catch (error) {
    console.error("[KripiCard] Exception fetching transactions:", error instanceof Error ? error.message : error)
    return {
      success: true,
      transactions: [],
      message: error instanceof Error ? error.message : "Failed to fetch transactions",
    }
  }
}
