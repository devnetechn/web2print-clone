import { IndustryPage } from "@/components/storefront/industry-page"
import { INDUSTRIES, industryMetadata } from "@/lib/industries"

const data = INDUSTRIES["home-services-trades"]

export const metadata = industryMetadata(data)

export default function Page() {
  return <IndustryPage data={data} />
}
