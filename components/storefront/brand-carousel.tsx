"use client"

const logos = [
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/6979be31bd9bc47e637f6b1f.svg", alt: "Mom's Kitchen" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/6979c3971fbd2c4a66368b75.png", alt: "DC Prep" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/6979be3fbd9bc4262c7f6c8f.png", alt: "Partner" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c72c90da8255945170872e.png", alt: "Miami Dade Schools" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0d7d9b3d1391fa20a5f2c.png", alt: "DC Government" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0dfec1192fae91a3c7ac2.png", alt: "UDC University" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0ba64fbf3b6d1fefb0d40.png", alt: "Hookie Life" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0d5cf52ed57400fa8ed39.png", alt: "Liberty Tax" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0b3b97f917b203dce858e.png", alt: "BCPS" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0a74cf6b49a31c7a80acc.png", alt: "MCPS" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0a74c210e4355ba262699.png", alt: "Broward Public Schools" },
  { src: "https://assets.cdn.filesafe.space/U4CkfN7E9nFSDPTegc9M/media/68c0a74cb3d139bbb801a884.png", alt: "Palm Beach Schools" },
]

export function BrandCarousel() {
  return (
    <div className="overflow-hidden py-8">
      <div 
        className="flex hover:[animation-play-state:paused]"
        style={{
          animation: "scroll 30s linear infinite"
        }}
      >
        {/* Double the logos for seamless loop */}
        {[...logos, ...logos].map((logo, i) => (
          <div
            key={i}
            className="flex-shrink-0 h-24 flex items-center justify-center px-6"
          >
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-16 w-auto object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
