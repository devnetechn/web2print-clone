import { IndustryPage } from "@/components/storefront/industry-page"
import { INDUSTRIES } from "@/lib/industries"

const data = INDUSTRIES["food-restaurants"]

export const metadata = {
  title: data.metaTitle,
  description: data.metaDescription,
}

export default function Page() {
  return <IndustryPage data={data} />
}
