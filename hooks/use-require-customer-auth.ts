"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// Gates cart/checkout pages behind a logged-in account — closes the gap
// Add to Cart/Buy Now's own check doesn't cover: stale cart items from
// before login was required, a session that expired mid-checkout, or
// someone navigating straight to /checkout/* by URL.
export function useRequireCustomerAuth() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let active = true
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!active) return
        if (!data.user) {
          router.replace(`/account/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
        } else {
          setChecked(true)
        }
      })
    return () => {
      active = false
    }
  }, [router])

  return checked
}
