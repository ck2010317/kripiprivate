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
  
  // Actually call the API
  try {
    const response = await fetch(`${KRIPICARD_BASE_URL}/premium/Create_card`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: API_KEY,
        amount: request.amount,
        bankBin: request.bankBin || "49387520",
        name_on_card: request.name_on_card.toUpperCase(),
        email: request.email,
      }),
    })

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text()
      throw new Error(`API returned non-JSON: ${text.substring(0, 100)}`)
    }

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to create card")
    }

    console.log("[KripiCard] ✅ Card created:", data.card_id)
    return data
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("[KripiCard] ❌ Error:", errorMsg)
    throw error
  }
}

// Fund an existing card
export async function fundCard(request: FundCardRequest): Promise<FundCardResponse> {
  if (!API_KEY) {
    throw new Error("KRIPICARD_API_KEY is not configured")
  }

  console.log("[KripiCard] Funding card", request.card_id, "with", request.amount, "USD")
  
  // For now: mock funding since account has zero balance
  const mockFunding = {
    success: true,
    new_balance: request.amount,
    message: `Mock funding successful for ${request.amount} USD (Real API requires account funding)`
  }
  
  console.log("[KripiCard] ✅ Mock funding successful:", request.card_id)
  return mockFunding
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
