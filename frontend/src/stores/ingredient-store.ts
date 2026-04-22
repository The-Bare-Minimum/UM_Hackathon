import { create } from 'zustand';
import type { Ingredient, IngredientAlerts, IngredientFormData } from '@/types/ingredient';

interface IngredientState {
  // Data
  ingredients: Ingredient[];
  alerts: IngredientAlerts | null;

  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;

  // Modal states
  isFormOpen: boolean;
  isDeleteOpen: boolean;
  editingIngredient: Ingredient | null;
  deletingIngredient: Ingredient | null;

  // Actions
  fetchIngredients: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  createIngredient: (data: IngredientFormData) => Promise<boolean>;
  updateIngredient: (id: string, data: Partial<IngredientFormData>) => Promise<boolean>;
  deleteIngredient: (id: string) => Promise<boolean>;

  // Modal controls
  openCreateForm: () => void;
  openEditForm: (ingredient: Ingredient) => void;
  closeForm: () => void;
  openDeleteDialog: (ingredient: Ingredient) => void;
  closeDeleteDialog: () => void;
}

export const useIngredientStore = create<IngredientState>((set, get) => ({
  ingredients: [],
  alerts: null,
  isLoading: true,
  isSubmitting: false,
  isFormOpen: false,
  isDeleteOpen: false,
  editingIngredient: null,
  deletingIngredient: null,

  fetchIngredients: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/ingredients');
      const json = await res.json();
      if (json.success && json.data) {
        set({ ingredients: json.data });
      } else {
        set({ ingredients: [] });
      }
    } catch {
      set({ ingredients: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAlerts: async () => {
    try {
      const res = await fetch('/api/ingredients/alerts');
      const json = await res.json();
      if (json.success && json.data) {
        set({ alerts: json.data });
      }
    } catch {
      // Silently fail – alerts are supplementary
    }
  },

  createIngredient: async (data) => {
    set({ isSubmitting: true });
    try {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        // Refetch to get fresh data
        await get().fetchIngredients();
        await get().fetchAlerts();
        set({ isFormOpen: false, editingIngredient: null });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateIngredient: async (id, data) => {
    set({ isSubmitting: true });
    try {
      const res = await fetch(`/api/ingredients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        await get().fetchIngredients();
        await get().fetchAlerts();
        set({ isFormOpen: false, editingIngredient: null });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteIngredient: async (id) => {
    set({ isSubmitting: true });
    try {
      const res = await fetch(`/api/ingredients/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await get().fetchIngredients();
        await get().fetchAlerts();
        set({ isDeleteOpen: false, deletingIngredient: null });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  openCreateForm: () => set({ isFormOpen: true, editingIngredient: null }),
  openEditForm: (ingredient) => set({ isFormOpen: true, editingIngredient: ingredient }),
  closeForm: () => set({ isFormOpen: false, editingIngredient: null }),
  openDeleteDialog: (ingredient) => set({ isDeleteOpen: true, deletingIngredient: ingredient }),
  closeDeleteDialog: () => set({ isDeleteOpen: false, deletingIngredient: null }),
}));
