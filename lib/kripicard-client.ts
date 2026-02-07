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
  if (!request.amount || request.amount < 10) {
    throw new Error(`Invalid amount: ${request.amount}. KripiCard requires a minimum of $10`)
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
      bankBin: request.bankBin || "49387519",
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
      // KripiCard returns HTML redirect for amounts below minimum ($10)
      if (text.includes("Redirecting") || text.includes("<!DOCTYPE")) {
        throw new Error("KripiCard rejected the request. The minimum card amount is $10.")
      }
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

    // Create_card only returns card_id - we need to fetch full details
    console.log("[KripiCard] ✅ Card created with ID:", data.card_id)
    console.log("[KripiCard] Fetching full card details via Get_CardDetails...")

    // Retry Get_CardDetails up to 3 times with increasing delay
    const MAX_RETRIES = 3
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Wait before fetching (card needs time to provision)
      const delay = attempt * 2000 // 2s, 4s, 6s
      console.log(`[KripiCard] Waiting ${delay}ms before Get_CardDetails attempt ${attempt}/${MAX_RETRIES}...`)
      await new Promise(resolve => setTimeout(resolve, delay))

      try {
        const detailsResponse = await fetch(
          `${KRIPICARD_BASE_URL}/premium/Get_CardDetails?api_key=${API_KEY}&card_id=${data.card_id}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        )

        const detailsContentType = detailsResponse.headers.get("content-type")
        if (!detailsContentType || !detailsContentType.includes("application/json")) {
          const text = await detailsResponse.text()
          console.error(`[KripiCard] Attempt ${attempt}: Non-JSON response from Get_CardDetails:`, text.substring(0, 200))
          continue
        }

        const detailsData = await detailsResponse.json()
        console.log(`[KripiCard] Attempt ${attempt}: Card details response:`, JSON.stringify(detailsData, null, 2))

        if (detailsData.success && detailsData.data?.details) {
          const d = detailsData.data.details
          
          // CRITICAL: Validate we got REAL card details, not empty/null values
          if (!d.number || d.number === "****" || d.number.length < 10) {
            console.error(`[KripiCard] Attempt ${attempt}: Got invalid card number: ${d.number}`)
            continue
          }
          if (!d.cvv || d.cvv === "***" || d.cvv.length < 3) {
            console.error(`[KripiCard] Attempt ${attempt}: Got invalid CVV: ${d.cvv}`)
            continue
          }
          if (!d.expiryDate || d.expiryDate === "12/25" || !d.expiryDate.includes("/")) {
            console.error(`[KripiCard] Attempt ${attempt}: Got invalid expiry: ${d.expiryDate}`)
            continue
          }

          const responseData: CreateCardResponse = {
            success: true,
            card_id: data.card_id,
            card_number: d.number,
            expiry_date: d.expiryDate,
            cvv: d.cvv,
            balance: parseFloat(d.cardBalance) || request.amount,
            message: data.message,
          }
          console.log("[KripiCard] ✅ Full card details retrieved and VALIDATED:", JSON.stringify(responseData, null, 2))
          return responseData
        } else {
          console.error(`[KripiCard] Attempt ${attempt}: API returned success=${detailsData.success}, has details=${!!detailsData.data?.details}`)
        }
      } catch (detailsError) {
        console.error(`[KripiCard] Attempt ${attempt}: Failed to fetch card details:`, detailsError)
      }
    }

    // ALL retries failed - throw error, NEVER return dummy values
    throw new Error(
      `Card was created on KripiCard (ID: ${data.card_id}) but could not fetch card details after ${MAX_RETRIES} attempts. ` +
      `Please contact support with card ID: ${data.card_id}`
    )
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

  // Map the nested response to our flat interface
  if (data.data?.details) {
    const d = data.data.details
    
    if (!d.number || !d.cvv || !d.expiryDate) {
      console.error("[KripiCard] Card details missing critical fields:", { number: !!d.number, cvv: !!d.cvv, expiryDate: !!d.expiryDate })
      throw new Error(`Card details incomplete for ${cardId}. Missing: ${!d.number ? 'number ' : ''}${!d.cvv ? 'cvv ' : ''}${!d.expiryDate ? 'expiry' : ''}`)
    }

    return {
      success: true,
      card_id: cardId,
      card_number: d.number,
      expiry_date: d.expiryDate,
      cvv: d.cvv,
      balance: parseFloat(d.cardBalance) || 0,
      status: d.state === 1 ? "ACTIVE" : d.state === 2 ? "FROZEN" : "CANCELLED",
      name_on_card: d.addressMv?.firstName || "",
      message: data.message,
    }
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

    // KripiCard Get_CardDetails response structure:
    // { success: true, data: { details: {...}, Transactions: [...] } }
    let rawTransactions: Record<string, unknown>[] = []
    let foundField = ""

    // Check the known structure first: data.data.Transactions (capital T)
    const nestedData = data.data as Record<string, unknown> | undefined
    if (nestedData) {
      if (Array.isArray(nestedData.Transactions)) {
        rawTransactions = nestedData.Transactions as Record<string, unknown>[]
        foundField = "data.Transactions"
        console.log(`[KripiCard] Found transactions in data.Transactions:`, rawTransactions.length, "items")
      } else if (Array.isArray(nestedData.transactions)) {
        rawTransactions = nestedData.transactions as Record<string, unknown>[]
        foundField = "data.transactions"
        console.log(`[KripiCard] Found transactions in data.transactions:`, rawTransactions.length, "items")
      }
    }

    // Fallback: search all fields
    if (rawTransactions.length === 0) {
      const possibleFields = ["Transactions", "transactions", "Transaction", "data", "records", "history"]
      for (const field of possibleFields) {
        if (data[field] && Array.isArray(data[field])) {
          rawTransactions = data[field] as Record<string, unknown>[]
          foundField = field
          console.log(`[KripiCard] Found transactions in field "${field}":`, rawTransactions.length, "items")
          break
        }
      }
    }

    if (rawTransactions.length === 0) {
      console.log("[KripiCard] No transactions found. Response keys:", Object.keys(data))
      if (nestedData) console.log("[KripiCard] data.* keys:", Object.keys(nestedData))
      return {
        success: true,
        transactions: [],
        message: "No transactions found for this card.",
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
      
      // Normalize status - KripiCard uses "Finish" 
      let status = String(tx.status ?? tx.Status ?? "completed").toLowerCase()
      if (status === "finish" || status === "settled") status = "completed"

      return {
        transaction_id: String(tx.transactionId ?? tx.transaction_id ?? tx.id ?? tx.txn_id ?? tx.reference ?? `tx-${index}`),
        card_id: String(tx.card_id ?? tx.cardId ?? tx.cardNum ?? cardId),
        type,
        amount,
        merchant,
        description: String(tx.description ?? tx.Description ?? tx.remark ?? tx.memo ?? tx.note ?? (merchant || type)),
        date: String(tx.recordTime ?? tx.date ?? tx.Date ?? tx.created_at ?? tx.transaction_date ?? tx.timestamp ?? new Date().toISOString()),
        status,
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
