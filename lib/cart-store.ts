"use client"

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // unique cart item id
  productId: string // 4over product UUID
  productCode: string
  productName: string
  size?: string
  options: {
    groupName: string
    optionName: string
    optionId: string
  }[]
  quantity: number
  unitPrice: number // price per unit from 4over
  totalPrice: number // unitPrice * quantity
  // For 4over order submission
  colorspec_uuid?: string
  runsize_uuid?: string
  turnaround_uuid?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getSubtotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => set((state) => ({
        items: [
          ...state.items,
          {
            ...item,
            id: `${item.productId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }
        ]
      })),
      
      removeItem: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
      })),
      
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map(item => 
          item.id === id 
            ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
            : item
        )
      })),
      
      clearCart: () => set({ items: [] }),
      
      getSubtotal: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + item.totalPrice, 0)
      },
      
      getItemCount: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + item.quantity, 0)
      }
    }),
    {
      name: 'print-cart-storage'
    }
  )
)
