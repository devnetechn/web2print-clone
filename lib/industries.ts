// Copy deck for the "Industries We Serve" builder pages. Copy is verbatim from
// the client-supplied deck — do not rewrite. Layout/imagery is applied by
// components/storefront/industry-page.tsx. [PLACEHOLDER] proof slots are left
// as styled slots flagged for content.

export type IndustrySection = {
  title: string
  body: string
  // Optional list of product chips shown with the section.
  products?: string[]
  image: string
}

export type IndustryData = {
  slug: string
  name: string
  // Short hook used on the hub tile + as the page H1.
  hook: string
  intro: string
  metaTitle: string
  metaDescription: string
  heroImage: string
  tileImage: string
  sections: IndustrySection[]
  // Placeholder proof-slot note (rendered as a flagged empty slot).
  proofNote: string
}

// Primary CTA links here with the industry pre-tagged.
export function quoteHref(slug: string) {
  return `/quote?industry=${encodeURIComponent(slug)}`
}

// Shared closing band shown at the bottom of every builder page.
export const BEYOND_PRINT_BAND = {
  heading: "Print is step one.",
  body:
    "When you're ready for the brand, the ads, and the systems behind the businesses you admire — Web2Print USA is powered by Born for Prosperity.",
  cta: "See what's next",
  href: "/services",
}

export const INDUSTRIES: Record<string, IndustryData> = {
  "beauty-grooming": {
    slug: "beauty-grooming",
    name: "Beauty & Grooming",
    hook: "Your work speaks. Your card should too.",
    intro:
      "In your chair, reputation is everything — and the card you hand a new client is the first cut they judge. This is where our premium line lives: silk, suede, raised foil, painted edge. Cards people keep because they feel expensive. Because you are.",
    metaTitle: "Printing for Barbers, Stylists & Beauty Pros | Web2Print USA",
    metaDescription:
      "Silk and foil business cards, appointment cards, loyalty cards, mirror decals, and branded tees for barbers, stylists, lash techs, and beauty professionals.",
    heroImage: "/images/cat/business-cards/silk.jpg",
    tileImage: "/images/cat/business-cards/silk.jpg",
    sections: [
      {
        title: "The card that gets kept",
        body:
          "Standard cards get lost in wallets. These get shown to friends. Pick your finish, upload your art or start from a template, and hand out something that books the next appointment for you.",
        products: ["Silk Cards", "Suede Cards", "Raised Foil", "Painted Edge", "Raised Spot UV", "Akuafoil", "Pearl"],
        image: "/images/cat/business-cards/raised-foil.jpg",
      },
      {
        title: "Keep them coming back",
        body:
          "The quiet workhorses: the appointment card that cuts no-shows, the punch card that turns a first visit into a regular, the price menu that ends the 'how much for…' texts.",
        products: [
          "Appointment cards",
          "Loyalty punch cards",
          "Referral cards",
          "Price menus",
          "Mirror decals & window graphics",
          "Aftercare instruction cards",
        ],
        image: "/images/cat/table-tent-cards.jpg",
      },
      {
        title: "Wear your brand",
        body:
          "Custom tees and shop apparel from Gildan, Next Level, BELLA+CANVAS, and American Apparel — your logo on your back, live pricing, real proofs before we print.",
        products: ["Branded tees", "Barber jackets & smocks"],
        image: "/images/cat/t-shirts.jpg",
      },
    ],
    proofNote: "1–2 beauty/grooming client testimonials or shop photos",
  },
  "home-services-trades": {
    slug: "home-services-trades",
    name: "Home Services & Trades",
    hook: "Look like the company they trust in their house.",
    intro:
      "Homeowners hire the crew that looks legit — the clean truck, the matching shirts, the sign in the neighbor's yard. Every one of those is a print product, and every one of them closes your next job before you've said a word.",
    metaTitle: "Printing for Movers, Painters, Cleaners & Trades | Web2Print USA",
    metaDescription:
      "Yard signs, vehicle magnets, door hangers, estimate forms, and uniform tees for moving companies, painters, cleaners, landscapers, and home service pros.",
    heroImage: "/images/signs/vehicle-magnets.jpg",
    tileImage: "/images/signs/vehicle-magnets.jpg",
    sections: [
      {
        title: "Own the neighborhood",
        body:
          "One finished job should sell the whole street. A yard sign while you work, door hangers on the block, a postcard to the neighborhood — the cheapest salesmen you'll ever hire.",
        products: ["Yard signs", "Vehicle magnets", "Door hangers", "EDDM postcards"],
        image: "/images/signs/rigid-signs.jpg",
      },
      {
        title: "Paperwork that closes",
        body:
          "The estimate handed over in a branded folder wins against the one texted from a personal number. Every time.",
        products: [
          "Business cards",
          "Estimate/invoice NCR forms",
          "Presentation folders",
          "Before-and-after flyers",
          "Review request cards",
        ],
        image: "/images/cat/presentation-folders.jpg",
      },
      {
        title: "Crew that looks like a company",
        body:
          "Matching crew shirts turn three guys and a truck into a company. Screen printed or embroidered, sized for the whole crew, reordered in two clicks when you hire.",
        products: ["Uniform tees", "Safety-color shirts", "Hats"],
        image: "/images/cat/t-shirts.jpg",
      },
    ],
    proofNote: "trades client testimonial; ADM/Randy's if approved",
  },
  "food-restaurants": {
    slug: "food-restaurants",
    name: "Food & Restaurants",
    hook: "Make them hungry before the food arrives.",
    intro:
      "Your food does the heavy lifting — print does the first impression and the repeat visit. Menus that match the quality of the kitchen, packaging that markets every delivery, and the loyalty card that brings Tuesday's customer back on Friday.",
    metaTitle: "Menu Printing, Packaging & Restaurant Print | Web2Print USA",
    metaDescription:
      "Menus, table tents, stickers and labels, to-go packaging, loyalty cards, and staff tees for restaurants, food trucks, caterers, and ghost kitchens.",
    heroImage: "/images/cat/menus.jpg",
    tileImage: "/images/cat/menus.jpg",
    sections: [
      {
        title: "The menu system",
        body:
          "A laminated menu that survives service, a takeout menu that goes home in every bag, a table tent that sells the margarita nobody knew about.",
        products: ["Dine-in menus", "Takeout menus", "Table tents", "Counter cards", "Drink & dessert menus"],
        image: "/images/cat/menus.jpg",
      },
      {
        title: "Every order is an ad",
        body:
          "Delivery apps hide your brand. Your packaging doesn't have to. A logo sticker on every box turns 200 orders a week into 200 tiny billboards on kitchen counters.",
        products: ["Sticker & label rolls", "To-go bags & boxes", "Cup stickers", "Branded packaging tags"],
        image: "/images/cat/stickers.jpg",
      },
      {
        title: "Fill the room",
        body:
          "Grand opening banners, window graphics, sidewalk signs, event flyers, loyalty punch cards, staff tees and aprons.",
        products: [
          "Grand opening banners",
          "Window graphics",
          "Sidewalk signs",
          "Event flyers",
          "Loyalty punch cards",
          "Staff tees & aprons",
        ],
        image: "/images/signs/outdoor-banners.jpg",
      },
    ],
    proofNote: "restaurant client logos/testimonial; Mom's Kitchen / Egg Roll Kingz if approved",
  },
  "real-estate": {
    slug: "real-estate",
    name: "Real Estate Pros",
    hook: "In this business, you are the brand.",
    intro:
      "Buyers don't choose a brokerage — they choose you. The card you hand over at the open house and the sign in front of the listing are your reputation printed. Make both unmistakable.",
    metaTitle: "Printing for Real Estate Agents | Signs, Cards & Farming | Web2Print USA",
    metaDescription:
      "Premium business cards, listing signs and riders, open house kits, farming postcards, and closing gifts for real estate agents and boutique brokerages.",
    heroImage: "/images/signs/rigid-signs.jpg",
    tileImage: "/images/signs/rigid-signs.jpg",
    sections: [
      {
        title: "The card worth the commission",
        body:
          "Agents hand out cards at the highest-stakes moments in this industry. Premium stock and finishes that say 'I close' before you speak.",
        products: ["Silk", "Suede", "Raised Foil", "Painted Edge", "Plastic cards"],
        image: "/images/cat/business-cards/suede.jpg",
      },
      {
        title: "Own the listing",
        body:
          "From the listing appointment folder to the Just Sold postcard, one consistent look from door to closing table.",
        products: [
          "Yard signs",
          "Sign riders",
          "Open house directionals & flags",
          "Feature sheets",
          "Presentation folders",
          "Just listed/just sold postcards",
        ],
        image: "/images/signs/flags.jpg",
      },
      {
        title: "Farm your territory",
        body:
          "The agents who own a zip code mail it every month. We print the calendar that lives on their fridge with your face on it.",
        products: [
          "EDDM farming postcards",
          "Market update mailers",
          "Door hangers",
          "Calendars & magnets",
          "Pop-by tags",
          "Closing gift kits",
        ],
        image: "/images/cat/postcards.jpg",
      },
      {
        title: "Running your own shop?",
        body:
          "We outfit whole rosters — office collateral, agent onboarding kits, and house sign programs. Ask about brokerage accounts.",
        image: "/images/cat/presentation-folders.jpg",
      },
    ],
    proofNote: "agent testimonial",
  },
  "medical-dental": {
    slug: "medical-dental",
    name: "Medical & Dental Practices",
    hook: "Look like the practice patients trust.",
    intro:
      "Patients choose care they feel confident in — and confidence starts before the waiting room. From the recall postcard that fills the schedule to the welcome folder in every new patient's hands, print keeps a practice full and familiar.",
    metaTitle: "Printing for Dental & Medical Practices | Web2Print USA",
    metaDescription:
      "Recall postcards, appointment cards, welcome folders, referral pads, signage, promo giveaways, and branded scrubs for dentists, doctors, and private practices.",
    heroImage: "/images/cat/postcards.jpg",
    tileImage: "/images/cat/postcards.jpg",
    sections: [
      {
        title: "Keep the schedule full",
        body:
          "The six-month recall postcard is the highest-ROI product in this building. Set the design once; we print and you mail on schedule, every cycle.",
        products: ["Recall/reminder postcards", "Appointment cards", "Missed-appointment mailers", "Birthday cards"],
        image: "/images/cat/postcards.jpg",
      },
      {
        title: "The new patient experience",
        body:
          "A branded welcome folder does what a stapled packet can't — it makes the first visit feel like the right decision.",
        products: [
          "Welcome folders",
          "Intake forms",
          "Aftercare instruction cards",
          "Referral pads",
          "Business cards",
          "Office signage & wall graphics",
        ],
        image: "/images/cat/presentation-folders.jpg",
      },
      {
        title: "Swag patients actually keep",
        body:
          "Every goodie bag that leaves your office is marketing that lives in someone's home. We stock the classics and print them well.",
        products: ["Pens", "Magnets", "Lip balm", "Dental kits & toothbrush giveaways", "Tote bags", "Kids' stickers"],
        image: "/images/cat/tote-bags.jpg",
      },
      {
        title: "Team apparel",
        body: "Branded polos, scrub-friendly outerwear, event tees for community days.",
        products: ["Branded polos", "Scrub-friendly outerwear", "Event tees"],
        image: "/images/cat/t-shirts.jpg",
      },
    ],
    proofNote: "practice testimonial",
  },
  "nightlife-events": {
    slug: "nightlife-events",
    name: "Nightlife & Events",
    hook: "We started in the clubs. We print like it.",
    intro:
      "Before the school districts and the government portals, we printed for promoters, venues, and DJs — where the flyer had to hit by Thursday or the room stayed empty. That urgency never left the building. If your business runs on event nights, this is your print shop.",
    metaTitle: "Nightlife & Event Printing | Flyers, Banners, VIP & Merch | Web2Print USA",
    metaDescription:
      "Event flyers, step-and-repeat banners, VIP passes, drink menus, wristband-ready tickets, and merch tees for promoters, venues, DJs, and event brands.",
    heroImage: "/images/cat/event-tickets.jpg",
    tileImage: "/images/cat/event-tickets.jpg",
    sections: [
      {
        title: "Pack the room",
        body:
          "Same-week flyers that look like the headliner deserves. Print that moves tickets, not just paper.",
        products: ["Event flyers", "Posters", "Social cards", "EDDM drops", "Sidewalk signs"],
        image: "/images/cat/posters.jpg",
      },
      {
        title: "The night itself",
        body:
          "The step-and-repeat is where your logo ends up in every phone in the building. Make it worth the picture.",
        products: [
          "Step-and-repeat backdrops",
          "Banners & flags",
          "VIP passes & lanyards",
          "Event tickets",
          "Drink menus",
          "Table cards",
          "Bottle service menus",
        ],
        image: "/images/signs/banner-stands.jpg",
      },
      {
        title: "Merch that walks out the door",
        body:
          "Custom tees from the brands people actually wear — sold at the door or thrown from the stage, your event lives on after last call.",
        products: ["Event tees", "Artist & brand merch", "Hats", "Koozies"],
        image: "/images/cat/t-shirts.jpg",
      },
    ],
    proofNote: "promoter/venue testimonial; Amplify Media tie-in optional",
  },
}

// Hub tile order (6 builder verticals + Schools & Government).
export const INDUSTRY_ORDER = [
  "beauty-grooming",
  "home-services-trades",
  "food-restaurants",
  "real-estate",
  "medical-dental",
  "nightlife-events",
]

export const SCHOOLS_GOV_TILE = {
  slug: "schools-government",
  name: "Schools & Government",
  hook: "A certified vendor, ready to work.",
  tileImage: "/images/signs/flags.jpg",
}
