// 4over API Client
// Documentation: https://api.4over.com/docs

import { createHmac, createHash } from "crypto"

type FourOverConfig = {
  publicKey: string
  privateKey: string
  baseUrl: string
}

type FourOverProduct = {
  productId: string
  name: string
  sku: string
  price: number
  attributes: Record<string, any>
}

type FourOverOrder = {
  orderId: string
  items: Array<{
    productId: string
    quantity: number
    specifications: Record<string, any>
    files: string[]
  }>
  shipping: {
    name: string
    address1: string
    city: string
    state: string
    zip: string
    country: string
  }
}

export class FourOverAPI {
  private config: FourOverConfig

  constructor() {
    this.config = {
      // Use the SAME variable names as the working lib/4over/client.ts
      publicKey: process.env.FOUROVER_PUBLIC_KEY || "web2printusa",
      privateKey: process.env.FOUROVER_API_SECRET || "3KHNXZFZ",
      baseUrl: process.env.FOUROVER_API_URL || "https://api.4over.com",
    }
  }

  // Generate 4over signature: HMAC-SHA256 of the HTTP method, keyed by the
  // SHA256 hash of the private key. Matches lib/4over/client.ts exactly.
  private getAuthParams(httpMethod = "GET"): string {
    const hashedPrivateKey = createHash("sha256").update(this.config.privateKey).digest("hex")
    const signature = createHmac("sha256", hashedPrivateKey).update(httpMethod.toUpperCase()).digest("hex")
    return `apikey=${this.config.publicKey}&signature=${signature}`
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const method = (options.method || "GET").toUpperCase()
    const separator = endpoint.includes("?") ? "&" : "?"
    const url = `${this.config.baseUrl}${endpoint}${separator}${this.getAuthParams(method)}`

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`4over API Error: ${response.status} ${response.statusText} ${body}`)
      }

      return await response.json()
    } catch (error) {
      console.error("[v0] 4over API request failed:", error)
      throw error
    }
  }

  // Get product catalog
  async getProducts(): Promise<FourOverProduct[]> {
    return await this.request("/products")
  }

  // Get product details
  async getProduct(productId: string): Promise<FourOverProduct> {
    return await this.request(`/products/${productId}`)
  }

  // Get pricing for product configuration
  async getPrice(productId: string, specifications: Record<string, any>): Promise<number> {
    return await this.request("/pricing", {
      method: "POST",
      body: JSON.stringify({
        productId,
        specifications,
      }),
    })
  }

  // Submit order to 4over
  async submitOrder(order: FourOverOrder): Promise<{ success: boolean; fourOverOrderId: string; trackingInfo?: any }> {
    const response = await this.request("/orders", {
      method: "POST",
      body: JSON.stringify(order),
    })

    return {
      success: true,
      fourOverOrderId: response.orderId,
      trackingInfo: response.tracking,
    }
  }

  // Get order status
  async getOrderStatus(fourOverOrderId: string): Promise<{
    status: string
    trackingNumber?: string
    estimatedDelivery?: string
  }> {
    return await this.request(`/orders/${fourOverOrderId}/status`)
  }

  // Upload design file to 4over
  async uploadFile(file: Buffer, filename: string): Promise<{ fileUrl: string }> {
    const formData = new FormData()
    formData.append("file", new Blob([file]), filename)

    const response = await fetch(`${this.config.baseUrl}/files/upload`, {
      method: "POST",
      headers: {
        "X-API-Key": this.config.apiKey,
        "X-API-Secret": this.config.apiSecret,
      },
      body: formData,
    })

    const data = await response.json()
    return { fileUrl: data.url }
  }

  // Validate design file
  async validateFile(fileUrl: string): Promise<{ valid: boolean; errors?: string[] }> {
    return await this.request("/files/validate", {
      method: "POST",
      body: JSON.stringify({ fileUrl }),
    })
  }
}

export const fourOverAPI = new FourOverAPI()
