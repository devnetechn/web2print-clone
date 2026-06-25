import { createClient } from "@/lib/supabase/server"
import { QuotesTable } from "@/components/admin/quotes-table"
import { ApparelQuotesTable } from "@/components/admin/apparel-quotes-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function AdminQuotesPage() {
  const supabase = await createClient()

  const [{ data: customQuotes, error: customError }, { data: apparelQuotes, error: apparelError }] = await Promise.all([
    supabase.from("custom_quote_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("quote_requests").select("*").order("created_at", { ascending: false }),
  ])

  if (customError) {
    console.error("Error fetching custom quote requests:", customError)
  }
  if (apparelError) {
    console.error("Error fetching apparel quote requests:", apparelError)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quote Management</h1>
        <p className="text-slate-600">Custom quote requests across all product types</p>
      </div>

      <Tabs defaultValue="custom">
        <TabsList>
          <TabsTrigger value="custom">Custom / Non-Standard ({customQuotes?.length || 0})</TabsTrigger>
          <TabsTrigger value="apparel">Apparel Bulk Orders ({apparelQuotes?.length || 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="custom" className="mt-4">
          <QuotesTable quotes={customQuotes || []} />
        </TabsContent>
        <TabsContent value="apparel" className="mt-4">
          <ApparelQuotesTable quotes={apparelQuotes || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
