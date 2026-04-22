import { create } from 'zustand';
import type {
  Expense,
  ExpenseFormData,
  Budget,
  BudgetFormData,
  MonthlySummary,
  MonthComparison,
} from '@/types/expense';

interface BudgetState {
  // Data
  expenses: Expense[];
  budgets: Budget[];
  summary: MonthlySummary | null;
  lastMonthSummary: MonthlySummary | null;
  comparison: MonthComparison[];

  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;

  // Filter state
  filterCategory: string;
  filterMonth: number;
  filterYear: number;
  sortBy: 'date' | 'amount';
  sortDir: 'asc' | 'desc';

  // Modal states
  isExpenseFormOpen: boolean;
  isBudgetFormOpen: boolean;
  isDeleteOpen: boolean;
  editingExpense: Expense | null;
  budgetCategory: string;
  deletingExpense: Expense | null;

  // Actions – data fetching
  fetchExpenses: () => Promise<void>;
  fetchBudgets: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchComparison: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // Actions – CRUD
  createExpense: (data: ExpenseFormData) => Promise<boolean>;
  updateExpense: (id: string, data: Partial<ExpenseFormData>) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  setBudget: (data: BudgetFormData) => Promise<boolean>;

  // Filters
  setFilterCategory: (cat: string) => void;
  setFilterMonth: (m: number) => void;
  setFilterYear: (y: number) => void;
  setSortBy: (sort: 'date' | 'amount') => void;
  toggleSortDir: () => void;

  // Modal controls
  openExpenseForm: () => void;
  openEditExpenseForm: (e: Expense) => void;
  closeExpenseForm: () => void;
  openBudgetForm: (category?: string) => void;
  closeBudgetForm: () => void;
  openDeleteDialog: (e: Expense) => void;
  closeDeleteDialog: () => void;
}

const now = new Date();

export const useBudgetStore = create<BudgetState>((set, get) => ({
  expenses: [],
  budgets: [],
  summary: null,
  lastMonthSummary: null,
  comparison: [],

  isLoading: true,
  isSubmitting: false,

  filterCategory: 'all',
  filterMonth: now.getMonth() + 1,
  filterYear: now.getFullYear(),
  sortBy: 'date',
  sortDir: 'desc',

  isExpenseFormOpen: false,
  isBudgetFormOpen: false,
  isDeleteOpen: false,
  editingExpense: null,
  budgetCategory: '',
  deletingExpense: null,

  // ── Fetch Actions ──────────────────────────────────────────────

  fetchExpenses: async () => {
    try {
      const res = await fetch('/api/expenses/');
      const json = await res.json();
      if (json.success && json.data) {
        set({ expenses: json.data });
      } else {
        set({ expenses: [] });
      }
    } catch {
      set({ expenses: [] });
    }
  },

  fetchBudgets: async () => {
    const { filterMonth, filterYear } = get();
    try {
      const res = await fetch(`/api/expenses/budgets?month=${filterMonth}&year=${filterYear}`);
      const json = await res.json();
      if (json.success && json.data) {
        set({ budgets: json.data });
      } else {
        set({ budgets: [] });
      }
    } catch {
      set({ budgets: [] });
    }
  },

  fetchSummary: async () => {
    const { filterMonth, filterYear } = get();
    try {
      // Current month
      const res = await fetch(`/api/expenses/summary?month=${filterMonth}&year=${filterYear}`);
      const json = await res.json();
      if (json.success && json.data) {
        set({ summary: json.data });
      }

      // Last month for comparison
      let lastMonth = filterMonth - 1;
      let lastYear = filterYear;
      if (lastMonth <= 0) {
        lastMonth = 12;
        lastYear -= 1;
      }
      const res2 = await fetch(`/api/expenses/summary?month=${lastMonth}&year=${lastYear}`);
      const json2 = await res2.json();
      if (json2.success && json2.data) {
        set({ lastMonthSummary: json2.data });
      }
    } catch {
      // silent
    }
  },

  fetchComparison: async () => {
    try {
      const res = await fetch('/api/expenses/comparison?months=3');
      const json = await res.json();
      if (json.success && json.data) {
        set({ comparison: json.data });
      }
    } catch {
      set({ comparison: [] });
    }
  },

  fetchAll: async () => {
    set({ isLoading: true });
    await Promise.all([
      get().fetchExpenses(),
      get().fetchBudgets(),
      get().fetchSummary(),
      get().fetchComparison(),
    ]);
    set({ isLoading: false });
  },

  // ── CRUD Actions ───────────────────────────────────────────────

  createExpense: async (data) => {
    set({ isSubmitting: true });
    try {
      const res = await fetch('/api/expenses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        await get().fetchAll();
        set({ isExpenseFormOpen: false, editingExpense: null });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateExpense: async (id, data) => {
    set({ isSubmitting: true });
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        await get().fetchAll();
        set({ isExpenseFormOpen: false, editingExpense: null });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteExpense: async (id) => {
    set({ isSubmitting: true });
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await get().fetchAll();
        set({ isDeleteOpen: false, deletingExpense: null });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  setBudget: async (data) => {
    set({ isSubmitting: true });
    try {
      const res = await fetch('/api/expenses/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        await get().fetchBudgets();
        set({ isBudgetFormOpen: false, budgetCategory: '' });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  // ── Filter Actions ─────────────────────────────────────────────

  setFilterCategory: (cat) => set({ filterCategory: cat }),
  setFilterMonth: (m) => set({ filterMonth: m }),
  setFilterYear: (y) => set({ filterYear: y }),
  setSortBy: (sort) => set({ sortBy: sort }),
  toggleSortDir: () => set((s) => ({ sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' })),

  // ── Modal Controls ─────────────────────────────────────────────

  openExpenseForm: () => set({ isExpenseFormOpen: true, editingExpense: null }),
  openEditExpenseForm: (e) => set({ isExpenseFormOpen: true, editingExpense: e }),
  closeExpenseForm: () => set({ isExpenseFormOpen: false, editingExpense: null }),
  openBudgetForm: (category) => set({ isBudgetFormOpen: true, budgetCategory: category || '' }),
  closeBudgetForm: () => set({ isBudgetFormOpen: false, budgetCategory: '' }),
  openDeleteDialog: (e) => set({ isDeleteOpen: true, deletingExpense: e }),
  closeDeleteDialog: () => set({ isDeleteOpen: false, deletingExpense: null }),
}));
