export interface Ingredient {
  id: string;
  business_id: string;
  name: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  expiry_date: string | null;
  cost_per_unit: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface IngredientFormData {
  name: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  expiry_date: string;
  cost_per_unit: number;
}

export interface IngredientAlerts {
  low_stock: Ingredient[];
  expiring_soon: Ingredient[];
}

export type IngredientStatus = 'critical' | 'warning' | 'good';

export const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'litre', label: 'Litre (L)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'box', label: 'Box' },
  { value: 'bottle', label: 'Bottle' },
] as const;

export type UnitType = (typeof UNIT_OPTIONS)[number]['value'];
