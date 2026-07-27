// Renders a JSON-LD structured-data block. Accepts one schema object or an
// array of them (null/undefined entries are skipped). Safe in Server Components.
export function JsonLd({ data }: { data: object | null | undefined | Array<object | null | undefined> }) {
  const items = (Array.isArray(data) ? data : [data]).filter(Boolean) as object[]
  if (!items.length) return null
  const payload = items.length === 1 ? items[0] : items
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, server-generated content.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
