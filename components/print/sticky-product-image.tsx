"use client"

import { useEffect, useRef } from "react"

export function StickyProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    // Pin the sticky top to the element's current viewport offset so
    // it never appears to scroll — it sticks exactly where it starts.
    const top = ref.current.getBoundingClientRect().top
    ref.current.style.top = `${Math.max(0, top)}px`
  }, [])

  return (
    <div
      ref={ref}
      className="self-start sticky top-64 aspect-square w-full max-w-[360px] bg-slate-100 rounded overflow-hidden border border-slate-200"
    >
      <img src={src} alt={alt} className={className} />
    </div>
  )
}
