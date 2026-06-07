import { redirect } from "next/navigation"

// Redirects to the parent category page which now handles products listing directly
export default async function ProductsRedirect({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  redirect(`/print/${category}`)
}
