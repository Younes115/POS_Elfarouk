import { create } from 'zustand';
import type { ProductRecord } from '../../main/types';

// ── Cart Item ────────────────────────────────

export interface CartItem {
  product: ProductRecord;
  quantity: number;
}

// ── Store Interface ──────────────────────────

interface CartStore {
  cart: CartItem[];
  addToCart: (product: ProductRecord) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

// ── Store ────────────────────────────────────

export const useCartStore = create<CartStore>((set) => ({
  cart: [],

  addToCart: (product) => {
    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id);
      if (existing) {
        // Auto-merge: increment quantity by 1
        return {
          cart: state.cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      // New item: push with quantity 1
      return { cart: [...state.cart, { product, quantity: 1 }] };
    });
  },

  updateQuantity: (productId, quantity) => {
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    }));
  },

  removeFromCart: (productId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.product.id !== productId),
    }));
  },

  clearCart: () => set({ cart: [] }),
}));
