// Renders a JSON-LD structured-data block. Accepts one schema object or an
// array of them. Safe to use in Server Components.
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data)
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, server-generated content.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
