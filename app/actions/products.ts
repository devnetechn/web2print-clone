"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type ProductData = {
  id?: string
  name: string
  slug: string
  description: string | null
  category: string
  base_price: number
  is_active: boolean
  provider_product_id: string | null
  image_url: string | null
  options: any
}

export async function saveProduct(data: ProductData) {
  const supabase = await createClient()

  if (data.id) {
    // Update existing product
    const { error } = await supabase
      .from("products")
      .update({
        name: data.name,
        slug: data.slug,
        description: data.description,
        category: data.category,
        base_price: data.base_price,
        is_active: data.is_active,
        provider_product_id: data.provider_product_id,
        image_url: data.image_url,
        options: data.options,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)

    if (error) throw new Error(`Failed to update product: ${error.message}`)
  } else {
    // Create new product
    const { error } = await supabase.from("products").insert({
      name: data.name,
      slug: data.slug,
      description: data.description,
      category: data.category,
      base_price: data.base_price,
      is_active: data.is_active,
      provider_product_id: data.provider_product_id,
      image_url: data.image_url,
      options: data.options,
    })

    if (error) throw new Error(`Failed to create product: ${error.message}`)
  }

  revalidatePath("/admin/products")
  revalidatePath("/products")
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) throw new Error(`Failed to delete product: ${error.message}`)

  revalidatePath("/admin/products")
  revalidatePath("/products")
}

export async function toggleProductStatus(id: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(`Failed to update product status: ${error.message}`)

  revalidatePath("/admin/products")
  revalidatePath("/products")
}
