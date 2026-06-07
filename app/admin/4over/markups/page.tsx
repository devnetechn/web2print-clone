"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Save, Percent } from "lucide-react"

const defaultMarkups = [
  { category: "business_cards", name: "Business Cards", markup: 40 },
  { category: "postcards", name: "Postcards", markup: 40 },
  { category: "flyers", name: "Flyers & Brochures", markup: 35 },
  { category: "banners", name: "Banners & Signs", markup: 50 },
  { category: "booklets", name: "Booklets", markup: 45 },
  { category: "stickers", name: "Stickers & Labels", markup: 45 },
  { category: "folders", name: "Folders", markup: 40 },
  { category: "envelopes", name: "Envelopes", markup: 35 },
  { category: "apparel", name: "Apparel", markup: 55 },
  { category: "promotional", name: "Promotional Items", markup: 60 },
  { category: "default", name: "All Other Products", markup: 40 },
]

export default function MarkupSettingsPage() {
  const [markups, setMarkups] = useState(defaultMarkups)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const updateMarkup = (category: string, value: number) => {
    setMarkups((prev) =>
      prev.map((m) => (m.category === category ? { ...m, markup: value } : m))
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    // In production, this would save to the database
    await new Promise((resolve) => setTimeout(resolve, 500))
    setSaving(false)
    setSaved(true)
  }

  const calculateExample = (basePrice: number, markup: number) => {
    return (basePrice * (1 + markup / 100)).toFixed(2)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Markup Settings</h1>
          <p className="text-slate-500">Set your profit margins for each product category</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Category Markups</CardTitle>
            <CardDescription>
              Set the percentage markup for each product category. The customer price = 4over cost × (1 + markup%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Markup %</th>
                    <th className="pb-3 font-medium">Example (4over: $50)</th>
                    <th className="pb-3 font-medium">Your Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {markups.map((item) => (
                    <tr key={item.category} className="border-b">
                      <td className="py-4 font-medium">{item.name}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 max-w-[120px]">
                          <Input
                            type="number"
                            min="0"
                            max="200"
                            value={item.markup}
                            onChange={(e) =>
                              updateMarkup(item.category, Number(e.target.value))
                            }
                            className="text-center"
                          />
                          <Percent className="h-4 w-4 text-slate-400" />
                        </div>
                      </td>
                      <td className="py-4 text-slate-600">
                        ${calculateExample(50, item.markup)}
                      </td>
                      <td className="py-4 text-green-600 font-medium">
                        +${(50 * item.markup / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global Markup Override</CardTitle>
            <CardDescription>
              Apply a single markup percentage to all products (overrides category settings)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="e.g., 45"
                  className="w-24 text-center"
                />
                <Percent className="h-4 w-4 text-slate-400" />
              </div>
              <Button variant="outline">Apply to All</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
