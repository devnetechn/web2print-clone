"use client"

import { useEffect, useState } from "react"

// Eye-catching REAL product photos (copied from the 4over source, living in
// /public/images/cat). Each slide is assigned an entrance direction so the
// sequence feels lively: some rise up, some come from the left, some from the
// right, with a couple zooming in.
type Dir = "up" | "left" | "right" | "zoom"

const SLIDES: { src: string; label: string; dir: Dir }[] = [
  { src: "/images/cat/business-cards/foil-worx.jpg", label: "Foil Business Cards", dir: "right" },
  { src: "/images/cat/trading-cards/akuafoil.jpg", label: "Akuafoil Trading Cards", dir: "up" },
  { src: "/images/cat/t-shirts.jpg", label: "Custom Apparel", dir: "left" },
  { src: "/images/cat/outdoor-banners/scrim-vinyl.jpg", label: "Vinyl Banners", dir: "zoom" },
  { src: "/images/cat/packaging.jpg", label: "Custom Packaging", dir: "up" },
  { src: "/images/cat/stickers.jpg", label: "Die-Cut Stickers", dir: "right" },
  { src: "/images/cat/roll-labels.jpg", label: "Roll Labels", dir: "left" },
  { src: "/images/cat/presentation-folders.jpg", label: "Presentation Folders", dir: "zoom" },
]

const INTERVAL = 3200

// Off-screen starting transform for each entrance direction.
function offClass(dir: Dir) {
  switch (dir) {
    case "up":
      return "translate-y-[60%] opacity-0"
    case "left":
      return "-translate-x-[60%] opacity-0"
    case "right":
      return "translate-x-[60%] opacity-0"
    case "zoom":
      return "scale-90 opacity-0"
  }
}

export function HeroProductSlider() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length)
    }, INTERVAL)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100 shadow-xl">
      {SLIDES.map((slide, i) => {
        const isActive = i === active
        return (
          <img
            key={slide.src}
            src={slide.src || "/placeholder.svg"}
            alt={slide.label}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${
              isActive ? "translate-x-0 translate-y-0 scale-100 opacity-100" : offClass(slide.dir)
            }`}
            aria-hidden={!isActive}
          />
        )
      })}

      {/* Product label chip for the active slide */}
      <div className="absolute bottom-3 left-3 rounded-md bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
        {SLIDES[active].label}
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-3 right-3 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Show ${SLIDES[i].label}`}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
