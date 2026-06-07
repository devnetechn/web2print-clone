/**
 * lib/4over-api.ts
 * 
 * Thin re-export shim. All real 4over API logic lives in lib/4over/client.ts
 * which uses the correct endpoints and auth as verified from the official docs.
 * This file exists only for backward compatibility with any imports of fourOverAPI.
 */

export { fourOverClient as fourOverAPI } from "@/lib/4over/client"
export type { FourOverJob } from "@/lib/4over/client"
