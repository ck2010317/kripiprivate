import { NextRequest, NextResponse } from "next/server";

const SQUID_API_URL = "https://v2.api.squidrouter.com/v2";
const SQUID_INTEGRATOR_ID = "privatebridge-c0f6657e-1f07-4dfe-a743-7f0721e7cf57";

/**
 * Proxy the Squid /route call server-side to reliably capture x-request-id header
 * (CORS blocks this header in browser fetch)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${SQUID_API_URL}/route`, {
      method: "POST",
      headers: {
        "x-integrator-id": SQUID_INTEGRATOR_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error?.message || errorData.message || `Squid API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Server-side: we can reliably read x-request-id header (no CORS blocking)
    const requestId = response.headers.get("x-request-id") || "";
    
    console.log("[Bridge Route] x-request-id from header:", requestId);
    console.log("[Bridge Route] quoteId:", data.route?.quoteId);

    return NextResponse.json({
      route: data.route,
      requestId,
    });
  } catch (error) {
    console.error("[Bridge Route] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Route request failed" },
      { status: 500 }
    );
  }
}
