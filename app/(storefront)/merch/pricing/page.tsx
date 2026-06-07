import { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PricingCalculator } from "@/components/merch/pricing-calculator"

export const metadata: Metadata = {
  title: "Pricing Calculator | Custom Apparel",
  description: "Get instant pricing for screen printing, embroidery, and DTF printing on custom apparel.",
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link 
          href="/merch" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Products
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Pricing Calculator</h1>
          <p className="text-muted-foreground mt-2">
            Get instant estimates for your custom apparel order. Select your decoration method, 
            quantity, and options to see real-time pricing.
          </p>
        </div>

        <PricingCalculator />

        <div className="mt-8 bg-white rounded-lg border p-6">
          <h2 className="font-semibold mb-4">Pricing Notes</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li><strong>Screen Printing:</strong> Best for 1-6 color designs. Minimum 24 pieces. 4+ colors require 36+ pcs, 5+ colors require 72+ pcs.</li>
            <li><strong>Embroidery:</strong> Professional stitched logos. Minimum 6 pieces. Price based on stitch count.</li>
            <li><strong>DTF Printing:</strong> Full color, no minimums. Great for photos and complex designs. Quote required.</li>
            <li><strong>Setup Fees:</strong> One-time setup included in first order. Reorders have no setup fees.</li>
            <li><strong>Rush Orders:</strong> Standard turnaround is 5-7 business days. Rush (+15%) and Next-Day (+30%) available.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
