import { NextRequest, NextResponse } from "next/server";

const SQUID_API_URL = "https://v2.api.squidrouter.com/v2";
const SQUID_INTEGRATOR_ID = "privatebridge-c0f6657e-1f07-4dfe-a743-7f0721e7cf57";

/**
 * Proxy the Squid /status call server-side
 * Avoids CORS issues and gives us better error handling
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Forward all query params to Squid
    const squidParams = new URLSearchParams();
    
    const transactionId = searchParams.get("transactionId");
    const fromChainId = searchParams.get("fromChainId");
    const toChainId = searchParams.get("toChainId");
    const requestId = searchParams.get("requestId");
    const quoteId = searchParams.get("quoteId");
    const bridgeType = searchParams.get("bridgeType");
    
    if (transactionId) squidParams.set("transactionId", transactionId);
    if (fromChainId) squidParams.set("fromChainId", fromChainId);
    if (toChainId) squidParams.set("toChainId", toChainId);
    if (requestId) squidParams.set("requestId", requestId);
    if (quoteId) squidParams.set("quoteId", quoteId);
    if (bridgeType) squidParams.set("bridgeType", bridgeType);

    const url = `${SQUID_API_URL}/status?${squidParams.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        "x-integrator-id": SQUID_INTEGRATOR_ID,
      },
    });

    // For 404, return a proper response so frontend can handle retries
    if (response.status === 404) {
      return NextResponse.json(
        { squidTransactionStatus: "not_found_yet", retryable: true },
        { status: 200 } // Return 200 so frontend doesn't throw
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[Bridge Status] Squid returned ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `Status API Error: ${response.status}`, retryable: response.status >= 500 },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Bridge Status] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed", retryable: true },
      { status: 500 }
    );
  }
}
