"use client"

import { useEffect, useRef } from "react"

export function TrustindexReviews() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Create and append the script
    const script = document.createElement("script")
    script.src = "https://cdn.trustindex.io/loader.js?7c6cab354cd4237a9206a1953b3"
    script.async = true
    script.defer = true
    
    if (containerRef.current) {
      containerRef.current.appendChild(script)
    }

    return () => {
      // Cleanup on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  return <div ref={containerRef} className="min-h-[300px]" />
}
