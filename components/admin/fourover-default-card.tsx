"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Check, Loader2 } from "lucide-react"
import { getFourOverDefaultProfile, setFourOverDefaultProfile } from "@/app/actions/settings"

type PaymentProfile = {
  profile_token: string
  last_four: string
  valid_thru?: string
  type: string
}

const OFF = "__off__"

// The card 4over charges when an order is handed off automatically on payment.
// This used to be an environment variable, which meant a redeploy to change
// and no way for the owner to set it himself.
export function FourOverDefaultCard() {
  const [profiles, setProfiles] = useState<PaymentProfile[]>([])
  const [selected, setSelected] = useState<string>(OFF)
  const [savedToken, setSavedToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [profilesRes, current] = await Promise.all([
        fetch("/api/print-providers/4over/payment-profiles").then((r) => r.json()),
        getFourOverDefaultProfile(),
      ])
      if (profilesRes.profiles) setProfiles(profilesRes.profiles)
      else setError(profilesRes.error || "Could not load cards from 4over")
      if (current.token) {
        setSavedToken(current.token)
        setSelected(current.token)
      }
      setLoading(false)
    })()
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    const token = selected === OFF ? null : selected
    const result = await setFourOverDefaultProfile(token)
    if (result.success) {
      setSavedToken(token)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } else {
      setError(result.error || "Could not save")
    }
    setSaving(false)
  }

  const isOn = !!savedToken
  const dirty = (savedToken || OFF) !== selected

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Automatic 4over hand-off</span>
          <Badge className={isOn ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-slate-100 text-slate-700 hover:bg-slate-100"}>
            {isOn ? "On" : "Off"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Pick the card 4over charges when an order is sent automatically after a customer pays.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading cards from 4over…
          </div>
        ) : (
          <>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OFF}>Off — send orders to 4over manually</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.profile_token} value={p.profile_token}>
                    {p.type} •••• {p.last_four}
                    {p.valid_thru ? ` — exp ${p.valid_thru}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selected !== OFF && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-amber-900">
                  With a card selected, every paid order is sent to 4over on its own and charges this
                  card — nobody reviews the artwork first. Leave this Off to keep sending orders
                  yourself from Orders &rsaquo; 4over Transfer.
                </p>
              </div>
            )}

            {error && (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving…" : "Save"}
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-700">
                  <Check className="h-4 w-4" />
                  Saved
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Separate from whether 4over treats the order as real: that stays on the{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">FOUROVER_LIVE_ORDERS</code>{" "}
              environment variable, deliberately, so real print jobs need more than a click here.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
