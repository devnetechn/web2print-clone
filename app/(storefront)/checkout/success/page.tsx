import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import Link from "next/link"

export default function CheckoutSuccessPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <h1 className="mb-4 text-4xl font-bold">Order Confirmed!</h1>
        <p className="mb-8 text-lg text-slate-600">
          Thank you for your order. We've received your payment and will start processing your order shortly.
        </p>

        <Card className="mb-8 text-left">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                1
              </div>
              <div>
                <p className="font-medium">Order Confirmation</p>
                <p className="text-slate-600">You'll receive an email confirmation with your order details</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                2
              </div>
              <div>
                <p className="font-medium">Production</p>
                <p className="text-slate-600">Your order will be sent to production and prepared for printing</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                3
              </div>
              <div>
                <p className="font-medium">Shipping</p>
                <p className="text-slate-600">Once complete, your order will be shipped to your address</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/products">Continue Shopping</Link>
          </Button>
          <Button variant="outline" asChild size="lg" className="bg-transparent">
            <Link href="/">Go to Homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
