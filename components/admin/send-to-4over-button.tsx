"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, Loader2, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type PaymentProfile = {
  profile_token: string
  last_four: string
  valid_thru?: string
  type: string
}

// Sending an order to 4over used to mean copying its UUID out of the address
// bar and pasting it into /admin/orders/4over-transfer. This puts the same
// action on the order's own row.
export function SendTo4overButton({
  orderId,
  orderNumber,
  isPaid,
}: {
  orderId: string
  orderNumber: number
  isPaid: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<PaymentProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Fetched when the dialog opens rather than on mount: this button renders
  // once per row, and every one of them calling 4over on page load would be a
  // burst of identical requests for a list the admin may never open.
  async function loadProfiles() {
    setProfilesLoading(true)
    setProfilesError(null)
    try {
      const res = await fetch("/api/print-providers/4over/payment-profiles")
      const data = await res.json()
      if (res.ok) {
        setProfiles(data.profiles || [])
      } else {
        setProfilesError(data.error || "Failed to load payment profiles")
      }
    } catch {
      setProfilesError("Failed to load payment profiles")
    } finally {
      setProfilesLoading(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch("/api/print-providers/4over/submit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, profileToken: selectedToken }),
      })
      const data = await res.json()

      if (res.ok) {
        toast({
          title: `Order #${orderNumber} sent to 4over`,
          description: data.message,
          // An order can land at 4over while its artwork fails to attach -
          // that combination reads as success everywhere else, so it is
          // surfaced as a warning rather than a plain confirmation.
          variant: data.fileWarnings?.length ? "destructive" : undefined,
        })
        setOpen(false)
        router.refresh()
      } else {
        toast({
          title: "Could not send to 4over",
          description: data.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch {
      toast({ title: "Could not send to 4over", description: "Request failed", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-2 whitespace-nowrap"
        onClick={() => {
          setOpen(true)
          if (profiles.length === 0) loadProfiles()
        }}
      >
        <Send className="h-3.5 w-3.5" />
        Send to 4over
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send order #{orderNumber} to 4over</DialogTitle>
            <DialogDescription>
              This submits the order for printing and charges the card you pick below — 4over&apos;s
              card, not the customer&apos;s.
            </DialogDescription>
          </DialogHeader>

          {!isPaid && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                This order is not marked paid yet. You can still send it, but check the payment first.
              </span>
            </div>
          )}

          {profilesLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading cards…
            </div>
          ) : profilesError ? (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{profilesError}</span>
            </div>
          ) : (
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger>
                <SelectValue placeholder="Select a payment profile" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.profile_token} value={p.profile_token}>
                    {p.type} •••• {p.last_four}
                    {p.valid_thru ? ` — exp ${p.valid_thru}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !selectedToken} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Sending…" : "Send to 4over"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
