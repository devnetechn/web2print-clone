import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  { id: 1, label: "Shopping Cart" },
  { id: 2, label: "Shipping" },
  { id: 3, label: "Payment Details" },
] as const

export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium",
                step.id < current && "border-green-600 bg-green-600 text-white",
                step.id === current && "border-green-600 bg-green-600 text-white",
                step.id > current && "border-slate-300 text-slate-400",
              )}
            >
              {step.id < current ? <Check className="h-4 w-4" /> : step.id}
            </div>
            <span
              className={cn(
                "text-sm font-medium uppercase tracking-wide",
                step.id <= current ? "text-green-600" : "text-slate-400",
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className="h-px w-8 bg-slate-200 sm:w-16" />}
        </div>
      ))}
    </div>
  )
}
