"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import type { ProductContent, FAQ, FilePrepInfo, TemplateLink } from "@/lib/print/product-content"
import { saveProductContent } from "@/app/actions/product-content"

interface ContentEditFormProps {
  slug: string
  initialContent: ProductContent | null
}

export function ContentEditForm({ slug, initialContent }: ContentEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [description, setDescription] = useState(initialContent?.description ?? "")

  const [faqs, setFaqs] = useState<FAQ[]>(initialContent?.faqs ?? [])

  const [filePrepEnabled, setFilePrepEnabled] = useState(!!initialContent?.template_file_prep)
  const [filePrep, setFilePrep] = useState<FilePrepInfo>(
    initialContent?.template_file_prep ?? {
      note: "",
      resolution: "300dpi",
      color_mode: "CMYK",
      bleed: '0.125" (0.0625" on each side)',
      file_types: ["PDF (recommended)", "JPG", "EPS", "TIFF"],
    }
  )

  const [templateUrls, setTemplateUrls] = useState<TemplateLink[]>(
    initialContent?.template_urls ?? []
  )

  const addFaq = () => setFaqs(prev => [...prev, { q: "", a: "" }])
  const removeFaq = (i: number) => setFaqs(prev => prev.filter((_, idx) => idx !== i))
  const updateFaq = (i: number, field: "q" | "a", value: string) =>
    setFaqs(prev => prev.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)))

  const addTemplate = () => setTemplateUrls(prev => [...prev, { size: "", url: "" }])
  const removeTemplate = (i: number) =>
    setTemplateUrls(prev => prev.filter((_, idx) => idx !== i))
  const updateTemplate = (i: number, field: "size" | "url", value: string) =>
    setTemplateUrls(prev => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveProductContent(slug, {
        description,
        faqs: faqs.filter(f => f.q.trim() || f.a.trim()),
        template_file_prep: filePrepEnabled ? filePrep : null,
        template_urls: templateUrls.filter(t => t.size.trim() || t.url.trim()),
      })
      if (result.success) {
        setSaved(true)
        router.refresh()
      } else {
        setError(result.error ?? "Save failed")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter product description..."
            rows={6}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            FAQs
            <Button type="button" size="sm" variant="outline" onClick={addFaq} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add FAQ
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.length === 0 && (
            <p className="text-sm text-slate-400">No FAQs yet. Click &quot;Add FAQ&quot; to start.</p>
          )}
          {faqs.map((faq, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 relative">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeFaq(i)}
                aria-label="Remove FAQ"
                className="absolute top-2 right-2 h-7 w-7 p-0 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <div className="space-y-1">
                <Label className="text-xs">Question</Label>
                <Input
                  value={faq.q}
                  onChange={e => updateFaq(i, "q", e.target.value)}
                  placeholder="e.g. Are silk business cards waterproof?"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Answer</Label>
                <Textarea
                  value={faq.a}
                  onChange={e => updateFaq(i, "a", e.target.value)}
                  placeholder="Answer..."
                  rows={3}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* File Prep (Templates tab) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            File Preparation Info
            <label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
              <input
                type="checkbox"
                checked={filePrepEnabled}
                onChange={e => setFilePrepEnabled(e.target.checked)}
                className="rounded"
              />
              Enable
            </label>
          </CardTitle>
        </CardHeader>
        {filePrepEnabled && (
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Note (optional)</Label>
              <Input
                value={filePrep.note ?? ""}
                onChange={e => setFilePrep(p => ({ ...p, note: e.target.value }))}
                placeholder="e.g. For specific instructions see our FAQs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Resolution</Label>
                <Input
                  value={filePrep.resolution}
                  onChange={e => setFilePrep(p => ({ ...p, resolution: e.target.value }))}
                  placeholder="300dpi"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color Mode</Label>
                <Input
                  value={filePrep.color_mode}
                  onChange={e => setFilePrep(p => ({ ...p, color_mode: e.target.value }))}
                  placeholder="CMYK"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bleed</Label>
              <Input
                value={filePrep.bleed}
                onChange={e => setFilePrep(p => ({ ...p, bleed: e.target.value }))}
                placeholder='0.125" (0.0625" on each side)'
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">File Types (comma-separated)</Label>
              <Input
                value={filePrep.file_types.join(", ")}
                onChange={e =>
                  setFilePrep(p => ({
                    ...p,
                    file_types: e.target.value.split(",").map(s => s.trim()).filter(Boolean),
                  }))
                }
                placeholder="PDF (recommended), JPG, EPS, TIFF"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Template URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Template Downloads
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addTemplate}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Template
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {templateUrls.length === 0 && (
            <p className="text-sm text-slate-400">
              No templates yet. Paste links from 4over&apos;s Templates tab.
            </p>
          )}
          {templateUrls.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={t.size}
                onChange={e => updateTemplate(i, "size", e.target.value)}
                placeholder='Size (e.g. 2" x 3.5")'
                className="w-36 flex-shrink-0"
              />
              <Input
                value={t.url}
                onChange={e => updateTemplate(i, "url", e.target.value)}
                placeholder="https://4over.com/media/..."
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeTemplate(i)}
                aria-label="Remove template"
                className="h-9 w-9 p-0 text-slate-400 hover:text-red-500 flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Content"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved successfully.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  )
}
