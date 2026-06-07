import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewOrderPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Order</h1>
          <p className="text-slate-600">Create a new order manually</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Form</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">Order creation form will be implemented here...</p>
        </CardContent>
      </Card>
    </div>
  )
}
