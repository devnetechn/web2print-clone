import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import Link from "next/link"

export default function CheckoutCancelPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-bold">Checkout Cancelled</h1>
        <p className="mb-8 text-slate-600">Your order was not completed. Your cart items are still saved.</p>

        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">
              If you experienced any issues during checkout, please contact our support team for assistance.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link href="/cart">Return to Cart</Link>
          </Button>
          <Button variant="outline" asChild className="bg-transparent">
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
