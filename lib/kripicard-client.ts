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
      const errorMsg = data.message || data.error || `HTTP ${response.status}`
      console.error("[KripiCard] ❌ Fund API Error:", errorMsg)
      throw new Error(`KripiCard Fund API Error (${response.status}): ${errorMsg}`)
    }

    if (!data.success) {
      const errorMsg = data.message || data.error || "API returned success=false"
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

  const response = await fetch(`${KRIPICARD_BASE_URL}/premium/Freeze_Unfreeze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: API_KEY,
      card_id: request.card_id,
      action: request.action,
    }),
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.message || `Failed to ${request.action} card`)
  }

  return data
}
