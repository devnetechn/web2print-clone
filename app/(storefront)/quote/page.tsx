"use client"

import { useRef, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2, Upload, FileText } from "lucide-react"
import { submitQuoteRequest } from "@/app/actions/quotes"
import { uploadDesignFile } from "@/app/actions/design-upload"

export default function QuotePage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [quoteTitle, setQuoteTitle] = useState("")
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [uploadedFile, setUploadedFile] = useState<{ fileName: string; url: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await uploadDesignFile(formData)
      if (result.success) {
        setUploadedFile({ fileName: result.fileName!, url: result.url! })
      }
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await submitQuoteRequest({
        fullName,
        email,
        phone,
        companyName,
        quoteTitle,
        description,
        quantity,
        referenceFileUrl: uploadedFile?.url,
      })
      if (result.success) {
        setSubmitted(true)
      } else {
        setError(result.error || "Failed to submit quote request")
      }
    } catch {
      setError("Failed to submit quote request")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Quote Request Submitted!</h1>
            <p className="text-muted-foreground mb-6">
              Thanks for reaching out — our team will review your request and get back to you with a custom quote shortly.
            </p>
            <Button asChild className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Request a Quote</CardTitle>
            <CardDescription>
              Need something custom that doesn't fit our standard pricing calculators? Tell us what you're looking for
              and we'll get back to you with a quote.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quoteTitle">What do you need? *</Label>
                <Input
                  id="quoteTitle"
                  required
                  placeholder="e.g. Oversized Corplast Sign, Custom Team Jerseys"
                  value={quoteTitle}
                  onChange={(e) => setQuoteTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" placeholder="e.g. 250" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  rows={5}
                  placeholder="Tell us about sizing, materials, deadlines, or anything else we should know."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Reference File (optional)</Label>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center gap-3 border border-slate-200 rounded-lg p-3 hover:border-[#e07b39] transition-all text-left disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  ) : uploadedFile ? (
                    <FileText className="h-5 w-5 text-[#e07b39]" />
                  ) : (
                    <Upload className="h-5 w-5 text-slate-400" />
                  )}
                  <span className="text-sm text-slate-600">
                    {uploading ? "Uploading..." : uploadedFile ? uploadedFile.fileName : "Attach a sketch, photo, or sample file"}
                  </span>
                </button>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting || uploading}>
                {submitting ? "Submitting..." : "Submit Quote Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
