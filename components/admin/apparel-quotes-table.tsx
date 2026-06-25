"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Loader2 } from "lucide-react"
import { updateApparelQuoteRequest } from "@/app/actions/quotes"

type ApparelQuoteRequest = {
  id: string
  quote_number: number
  customer_name: string
  customer_email: string
  company_name: string | null
  product_name: string | null
  brand_name: string | null
  print_method: string
  total_quantity: number
  garment_color: string | null
  artwork_url: string | null
  customer_notes: string | null
  status: string
  quoted_price: number | null
  created_at: string
}

function ApparelQuoteRow({ quote }: { quote: ApparelQuoteRequest }) {
  const [status, setStatus] = useState(quote.status)
  const [quotedPrice, setQuotedPrice] = useState(quote.quoted_price?.toString() || "")
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateApparelQuoteRequest({
        id: quote.id,
        status: status as "pending" | "quoted" | "approved" | "in_production" | "completed" | "cancelled",
        quotedPrice: quotedPrice ? parseFloat(quotedPrice) : null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="border-b hover:bg-slate-50 align-top">
      <td className="p-3">
        <div className="font-medium">#{quote.quote_number}</div>
        <div className="text-sm text-slate-600">{quote.customer_name}</div>
        <div className="text-sm text-slate-500">{quote.customer_email}</div>
        {quote.company_name && <div className="text-sm text-slate-500">{quote.company_name}</div>}
      </td>
      <td className="p-3 max-w-xs">
        <div className="font-medium">{quote.product_name || quote.brand_name || "Custom Apparel"}</div>
        <div className="text-sm text-slate-500">
          {quote.print_method} • Qty: {quote.total_quantity}
          {quote.garment_color ? ` • ${quote.garment_color}` : ""}
        </div>
        {quote.customer_notes && (
          <>
            <button type="button" onClick={() => setExpanded((e) => !e)} className="text-xs text-blue-600 hover:underline mt-1">
              {expanded ? "Hide notes" : "Show notes"}
            </button>
            {expanded && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{quote.customer_notes}</p>}
          </>
        )}
        {quote.artwork_url && (
          <a
            href={quote.artwork_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <FileText className="h-3 w-3" />
            Artwork
          </a>
        )}
      </td>
      <td className="p-3 text-sm text-slate-600">
        {new Date(quote.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </td>
      <td className="p-3">
        <div className="space-y-2 w-44">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="in_production">In Production</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Quoted price"
            value={quotedPrice}
            onChange={(e) => setQuotedPrice(e.target.value)}
          />
        </div>
      </td>
      <td className="p-3">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          Save
        </Button>
      </td>
    </tr>
  )
}

export function ApparelQuotesTable({ quotes }: { quotes: ApparelQuoteRequest[] }) {
  return (
    <Card className="p-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Order Details</th>
              <th className="p-3 text-left">Submitted</th>
              <th className="p-3 text-left">Status / Price</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No apparel quote requests found
                </td>
              </tr>
            ) : (
              quotes.map((quote) => <ApparelQuoteRow key={quote.id} quote={quote} />)
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
