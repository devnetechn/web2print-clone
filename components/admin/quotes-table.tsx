"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Loader2 } from "lucide-react"
import { updateQuoteRequest } from "@/app/actions/quotes"

type QuoteRequest = {
  id: string
  full_name: string
  email: string
  phone: string | null
  company_name: string | null
  quote_title: string
  description: string
  quantity: string | null
  reference_file_url: string | null
  status: string
  quoted_price: number | null
  admin_notes: string | null
  created_at: string
}

function QuoteRow({ quote }: { quote: QuoteRequest }) {
  const [status, setStatus] = useState(quote.status)
  const [quotedPrice, setQuotedPrice] = useState(quote.quoted_price?.toString() || "")
  const [adminNotes, setAdminNotes] = useState(quote.admin_notes || "")
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateQuoteRequest({
        id: quote.id,
        status: status as "new" | "quoted" | "accepted" | "declined",
        quotedPrice: quotedPrice ? parseFloat(quotedPrice) : null,
        adminNotes: adminNotes || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="border-b hover:bg-slate-50 align-top">
      <td className="p-3">
        <div className="space-y-1">
          <div className="font-medium">{quote.full_name}</div>
          <div className="text-sm text-slate-600">{quote.email}</div>
          {quote.company_name && <div className="text-sm text-slate-500">{quote.company_name}</div>}
        </div>
      </td>
      <td className="p-3 max-w-xs">
        <div className="font-medium">{quote.quote_title}</div>
        {quote.quantity && <div className="text-sm text-slate-500">Qty: {quote.quantity}</div>}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-blue-600 hover:underline mt-1"
        >
          {expanded ? "Hide details" : "Show details"}
        </button>
        {expanded && (
          <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{quote.description}</p>
        )}
        {quote.reference_file_url && (
          <a
            href={quote.reference_file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <FileText className="h-3 w-3" />
            Reference file
          </a>
        )}
      </td>
      <td className="p-3 text-sm text-slate-600">
        {new Date(quote.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </td>
      <td className="p-3">
        <div className="space-y-2 w-40">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
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

export function QuotesTable({ quotes }: { quotes: QuoteRequest[] }) {
  return (
    <Card className="p-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Quote</th>
              <th className="p-3 text-left">Submitted</th>
              <th className="p-3 text-left">Status / Price</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No quote requests found
                </td>
              </tr>
            ) : (
              quotes.map((quote) => <QuoteRow key={quote.id} quote={quote} />)
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
