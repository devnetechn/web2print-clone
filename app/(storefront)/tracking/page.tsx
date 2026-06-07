"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState("")

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-[#2c327a] mb-8">Order Tracking</h1>
      <p className="text-lg text-slate-600 mb-8">
        Enter your order number or tracking number to check the status of your order.
      </p>
      
      <div className="max-w-md">
        <div className="flex gap-2">
          <Input
            placeholder="Enter tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="flex-1"
          />
          <Button className="bg-[#e42a27] hover:bg-[#c91f1c]">
            Track Order
          </Button>
        </div>
      </div>
    </div>
  )
}
