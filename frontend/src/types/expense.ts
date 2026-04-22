// ─── Expense Types ─────────────────────────────────────────────────────

export interface Expense {
  id: string;
  business_id: string | null;
  name: string | null;
  category: string | null;
  amount: number;
  frequency: string | null;
  transaction_date: string | null;
  description: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface ExpenseFormData {
  name: string;
  category: string;
  amount: number;
  frequency: string;
  transaction_date: string;
  notes: string;
}

// ─── Budget Types ──────────────────────────────────────────────────────

export interface Budget {
  id: string;
  business_id: string | null;
  category: string;
  allocated_amount: number;
  month: number;
  year: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface BudgetFormData {
  category: string;
  allocated_amount: number;
  month: number;
  year: number;
}

// ─── Summary Types ─────────────────────────────────────────────────────

export interface MonthlySummary {
  total_spent: number;
  by_category: Record<string, number>;
  biggest_category: string | null;
  expense_count: number;
}

export interface MonthComparison {
  month: number;
  year: number;
  label: string;
  total_spent: number;
  by_category: Record<string, number>;
}

// ─── Budget Status ─────────────────────────────────────────────────────

export type BudgetStatus = 'over' | 'near' | 'on-track';

export function getBudgetStatus(spent: number, allocated: number): BudgetStatus {
  if (allocated <= 0) return 'on-track';
  const pct = (spent / allocated) * 100;
  if (pct > 100) return 'over';
  if (pct > 80) return 'near';
  return 'on-track';
}

export function getBudgetPercentage(spent: number, allocated: number): number {
  if (allocated <= 0) return 0;
  return Math.round((spent / allocated) * 100);
}

// ─── Constants ─────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Other' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'one-time', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['value'];
export type FrequencyType = (typeof FREQUENCY_OPTIONS)[number]['value'];
