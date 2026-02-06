import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

let supabaseInstance: ReturnType<typeof createServerClient> | null = null

export async function getSupabaseServer() {
  if (!supabaseInstance) {
    const cookieStore = await cookies()
    supabaseInstance = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      },
    )
  }
  return supabaseInstance
}
