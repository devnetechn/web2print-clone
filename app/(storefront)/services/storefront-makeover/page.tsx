import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Star, QrCode, CreditCard, CheckCircle, Play, MessageCircle, Package, DollarSign } from "lucide-react"

export const metadata = {
  title: "Storefront Makeover - Transform Your Business | Web2Print USA",
  description: "A complete storefront makeover designed to improve your visibility, branding, customer experience, and online reputation — all in one service.",
}

export default function StorefrontMakeoverPage() {
  return (
    <div className="bg-[#fafafa]">
      {/* Hero Section */}
      <section className="bg-[#1e3a5f] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/modern-retail-storefront-pattern.jpg')] bg-cover bg-center opacity-5" />
        <div className="relative text-center py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-[#22c55e] text-white px-4 py-2 rounded-full text-sm font-semibold mb-6">
              First 100 businesses receive a FREE custom window graphic
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Transform Your Storefront. Attract More Customers. Boost Your Sales.
            </h1>
            <p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
              A complete storefront makeover designed to improve your visibility, branding, customer experience, and online reputation — all in one service.
            </p>
            <Button size="lg" className="bg-[#22c55e] hover:bg-[#16a34a] text-white text-lg px-8 py-6 rounded-lg">
              Book Your Storefront Makeover
            </Button>
          </div>
        </div>
      </section>

      {/* Showcase Images Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">See The Complete Transformation</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From banners and window signs to floor decals and promotional signage — we transform every visible touchpoint of your business.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="max-w-[400px] rounded-xl overflow-hidden shadow-lg border-2 border-[#1e3a5f]/10">
              <img 
                src="https://storage.googleapis.com/msgsndr/U4CkfN7E9nFSDPTegc9M/media/692510d2db7e0b68b305ecab.png" 
                alt="Complete storefront makeover showcase" 
                className="w-full h-auto"
              />
            </div>
            <div className="max-w-[400px] rounded-xl overflow-hidden shadow-lg border-2 border-[#1e3a5f]/10">
              <img 
                src="https://storage.googleapis.com/msgsndr/U4CkfN7E9nFSDPTegc9M/media/6924fc29e7b094b8553d9715.png" 
                alt="Storefront transformation details" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* What's Included Section */}
      <section className="py-20 px-4" id="services">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="w-14 h-14 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-7 h-7 text-[#1e3a5f]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">What&apos;s Included in Your Storefront Makeover</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              This isn&apos;t just printing. It&apos;s a complete transformation of how your business looks, feels, and operates — inside and out.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 - Branding & Visibility */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="relative">
                <img 
                  src="https://storage.googleapis.com/msgsndr/U4CkfN7E9nFSDPTegc9M/media/692514ffe4747cc16601f3e0.png" 
                  alt="Storefront transformation" 
                  className="w-full h-[280px] object-cover"
                />
                <div className="absolute top-6 left-6 w-16 h-16 bg-[#1e3a5f] rounded-2xl flex items-center justify-center shadow-xl">
                  <Home className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Branding & Visibility</h3>
                <div className="w-16 h-1 bg-[#1e3a5f] rounded mb-6" />
                <ul className="space-y-3">
                  {[
                    "Exterior signage review & recommendations",
                    "New window graphic concepts",
                    "Updated \"Hours of Operation\" decals",
                    "Modernized storefront layout",
                    "Improved walk-in visibility"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#1e3a5f] flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Card 2 - Marketing & Automation */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="relative">
                <img 
                  src="https://storage.googleapis.com/msgsndr/U4CkfN7E9nFSDPTegc9M/media/6925126d8e959349d714e1da.jpeg" 
                  alt="QR code automation" 
                  className="w-full h-[280px] object-cover"
                />
                <div className="absolute top-6 left-6 w-16 h-16 bg-[#22c55e] rounded-2xl flex items-center justify-center shadow-xl">
                  <QrCode className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Marketing & Automation</h3>
                <div className="w-16 h-1 bg-[#22c55e] rounded mb-6" />
                <ul className="space-y-3">
                  {[
                    "Google review automation using QR codes",
                    "Automated review requests",
                    "Follow-ups via SMS or email",
                    "Social media branding alignment",
                    "Google Business Profile improvements"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Card 3 - Business Systems & Savings */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="relative">
                <img 
                  src="https://storage.googleapis.com/msgsndr/U4CkfN7E9nFSDPTegc9M/media/692515c3e7b0947012539abb.jpeg" 
                  alt="POS and payment processing" 
                  className="w-full h-[280px] object-cover"
                />
                <div className="absolute top-6 left-6 w-16 h-16 bg-[#1e3a5f] rounded-2xl flex items-center justify-center shadow-xl">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Business Systems & Savings</h3>
                <div className="w-16 h-1 bg-[#1e3a5f] rounded mb-6" />
                <ul className="space-y-3">
                  {[
                    "Credit card processing review",
                    "Rate-beat guarantee",
                    "Save money every month",
                    "POS optimization guidance",
                    "Customer experience improvements"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#1e3a5f] flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bonus Banner */}
          <div className="mt-8 bg-[#22c55e] text-white rounded-xl p-6 text-center font-semibold text-lg shadow-lg">
            Launch Bonus: Free window graphic for the first 1000 sign-ups
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-[#f4f4f5]" id="how-it-works">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">How the Storefront Makeover Works</h2>
            <p className="text-lg text-slate-600">A simple, proven process from consultation to transformation</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                step: 1,
                title: "Book Your Appointment",
                description: "You choose a day and time. We handle the rest. Simple scheduling that fits your busy business life.",
                image: "https://storage.googleapis.com/msgsndr/U4CkfN7E9nFSDPTegc9M/media/6925170c8e959307c71aa694.png",
                color: "#1e3a5f"
              },
              {
                step: 2,
                title: "On-Site or Virtual Walkthrough",
                description: "We tour your storefront with you and review your current branding, signage, review strategy, and payment processing system.",
                image: "https://storage.googleapis.com/msgsndr/U4CkfN7E9nFSDPTegc9M/media/692519838e9593103a1ddfa3.png",
                color: "#22c55e"
              },
              {
                step: 3,
                title: "We Design & You Approve",
                description: "You receive a mockup of your makeover. Once approved, we go into production and schedule installation.",
                image: "https://storage.googleapis.com/msgsndr/U4CkfN7E9nFSDPTegc9M/media/692522ea8e959373c02a2d8a.png",
                color: "#1e3a5f"
              },
              {
                step: 4,
                title: "Installation & Transformation",
                description: "Our team installs everything professionally. Walk away with a brand-new storefront that draws customers in.",
                image: "https://storage.googleapis.com/msgsndr/U4CkfN7E9nFSDPTegc9M/media/69251feab28757097d47b722.png",
                color: "#22c55e"
              }
            ].map((item) => (
              <div key={item.step} className="relative h-[400px] rounded-xl overflow-hidden group">
                <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                <div 
                  className="absolute inset-0 flex flex-col justify-between p-8 text-white transition-all duration-500"
                  style={{ 
                    background: `linear-gradient(to top, ${item.color}f2, ${item.color}66)` 
                  }}
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-3xl font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                    <p className="text-lg opacity-90">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-20 px-4 bg-[#f4f4f5]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="w-14 h-14 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-7 h-7 text-[#1e3a5f]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Watch How Quickly We Transform Storefronts</h2>
            <p className="text-lg text-slate-600">
              Your storefront is the first impression customers see — and in today&apos;s world, it needs to look modern, trustworthy, and inviting.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden shadow-2xl">
            <video controls className="w-full" style={{ maxHeight: "600px" }}>
              <source src="https://storage.googleapis.com/msgsndr/U4CkfN7E9nFSDPTegc9M/media/6924e9faa6fefecdb757834f.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800">Why Business Owners Love This Service</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-14 h-14 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-[#1e3a5f]" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Done-For-You Service</h3>
              <p className="text-slate-600">
                No need to manage multiple vendors. We handle design, printing, installation, and automation setup — all in one service.
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-14 h-14 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-7 h-7 text-[#1e3a5f]" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Improve Your Online Reputation</h3>
              <p className="text-slate-600">
                More Google reviews = better local SEO rankings. Our QR automation system makes it effortless for happy customers to leave reviews.
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-14 h-14 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-7 h-7 text-[#1e3a5f]" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Save on Payment Processing</h3>
              <p className="text-slate-600">
                We&apos;ll review your credit card processing fees and help you save — sometimes thousands of dollars annually.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-[#f4f4f5]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="w-14 h-14 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-7 h-7 text-[#1e3a5f]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Businesses That Transformed With Our Makeover</h2>
            <p className="text-lg text-slate-600">Real results from real business owners who took the leap and transformed their storefronts</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                initials: "MS",
                name: "Maria Santos",
                business: "Owner, Corner Café",
                quote: "The storefront makeover completely transformed how customers see my café. The new window graphics are eye-catching, and the QR code system has brought in 47 Google reviews in just 3 months. I'm getting more walk-ins than ever before!",
                metric: "+35%",
                metricLabel: "Increase in Walk-Ins"
              },
              {
                initials: "JC",
                name: "James Chen",
                business: "Owner, Quick Fix Repair Shop",
                quote: "I was skeptical at first, but the results speak for themselves. My shop went from 12 Google reviews to 47 in just two months. Plus, they helped me save $340/month on credit card processing fees. This paid for itself in the first quarter!",
                metric: "47",
                metricLabel: "New Google Reviews"
              },
              {
                initials: "LP",
                name: "Lisa Park",
                business: "Owner, Bloom Boutique",
                quote: "The team made everything so easy. They redesigned my storefront, installed beautiful window displays, and set up the review automation system. My sales are up 28% since the makeover!",
                metric: "+28%",
                metricLabel: "Increase in Sales"
              }
            ].map((testimonial, i) => (
              <div key={i} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xl font-bold">
                    {testimonial.initials}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{testimonial.name}</h4>
                    <p className="text-slate-500 text-sm">{testimonial.business}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 italic mb-6">&quot;{testimonial.quote}&quot;</p>
                <div className="bg-[#f4f4f5] rounded-lg p-4 text-center">
                  <span className="text-3xl font-bold text-[#1e3a5f] block">{testimonial.metric}</span>
                  <span className="text-slate-500 text-sm">{testimonial.metricLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-[#1e3a5f] text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Storefront?</h2>
          <p className="text-xl opacity-90 mb-8">
            Join hundreds of business owners who have already upgraded their storefronts and boosted their sales.
          </p>
          <Button size="lg" className="bg-[#22c55e] hover:bg-[#16a34a] text-white text-lg px-8 py-6 rounded-lg">
            Book Your Storefront Makeover Today
          </Button>
        </div>
      </section>
    </div>
  )
}
