'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useIngredientStore } from '@/stores/ingredient-store';
import type { Ingredient, IngredientFormData, IngredientStatus } from '@/types/ingredient';
import { UNIT_OPTIONS } from '@/types/ingredient';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// shadcn/ui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Lucide icons
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  PackageOpen,
  Loader2,
  Carrot,
  ChevronDown,
  Search,
  Sparkles,
} from 'lucide-react';

// ─── AI Response Card ──────────────────────────────────────────────────
function AIResponseCard({
  response,
  analyzedAt,
  latencyMs,
  tokensUsed,
}: {
  response: string;
  analyzedAt: string;
  latencyMs: number;
  tokensUsed: number;
}) {
  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/[0.04] via-transparent to-indigo-500/[0.04] shadow-xl shadow-purple-500/[0.03] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-heading font-bold flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20">
            <span className="text-lg">🤖</span>
          </div>
          AI Ingredient Analysis
        </CardTitle>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {tokensUsed > 0 && (
            <span className="font-mono">{tokensUsed} tokens</span>
          )}
          {latencyMs > 0 && (
            <span className="font-mono">{(latencyMs / 1000).toFixed(1)}s</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
          {response}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles size={12} className="text-purple-400" />
            Powered by Z.AI GLM
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {new Date(analyzedAt).toLocaleString('en-MY', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatus(ingredient: Ingredient): IngredientStatus {
  const days = daysUntil(ingredient.expiry_date);
  const belowThreshold = ingredient.quantity < ingredient.min_threshold;
  if (belowThreshold || (days !== null && days <= 3)) return 'critical';
  if (days !== null && days <= 7) return 'warning';
  return 'good';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

// ─── Status Badge ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: IngredientStatus }) {
  const config = {
    critical: {
      label: 'Critical',
      emoji: '🔴',
      className: 'bg-red-500/10 text-red-600 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
    },
    warning: {
      label: 'Warning',
      emoji: '🟡',
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    },
    good: {
      label: 'Good',
      emoji: '🟢',
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
  };

  const c = config[status];
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-semibold text-xs px-2.5 py-1 transition-all', c.className)}>
      <span className="text-[10px]">{c.emoji}</span>
      {c.label}
    </Badge>
  );
}

// ─── Alert Banners ─────────────────────────────────────────────────────
function AlertBanners({
  onScrollToExpiring,
  onScrollToLowStock,
}: {
  onScrollToExpiring: () => void;
  onScrollToLowStock: () => void;
}) {
  const { alerts } = useIngredientStore();
  if (!alerts) return null;

  const expiringCount = alerts.expiring_soon?.length ?? 0;
  const lowStockCount = alerts.low_stock?.length ?? 0;

  if (expiringCount === 0 && lowStockCount === 0) return null;

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
      {expiringCount > 0 && (
        <button
          onClick={onScrollToExpiring}
          className="w-full flex items-center gap-3 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent px-5 py-3.5 text-left transition-all hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/5 group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 group-hover:bg-red-500/25 transition-colors">
            <Clock size={18} className="text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-600 dark:text-red-400">
              {expiringCount} item{expiringCount !== 1 ? 's' : ''} expiring within 7 days
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Click to view affected items</p>
          </div>
          <ChevronDown size={16} className="text-red-400 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      {lowStockCount > 0 && (
        <button
          onClick={onScrollToLowStock}
          className="w-full flex items-center gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-5 py-3.5 text-left transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5 group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 group-hover:bg-amber-500/25 transition-colors">
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} below minimum stock
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Click to view affected items</p>
          </div>
          <ChevronDown size={16} className="text-amber-400 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
      <div className="border-b bg-muted/30 px-6 py-4 flex items-center gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-24 ml-auto" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-6 px-6 py-4 border-b border-border/30 last:border-0"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-safety-orange/10 blur-2xl scale-150" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border/50">
          <PackageOpen size={40} className="text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-xl font-heading font-bold mb-2">No ingredients yet</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-8 leading-relaxed">
        Start tracking your inventory by adding your first ingredient.
        You&apos;ll get alerts for low stock and expiring items automatically.
      </p>
      <Button
        onClick={onAdd}
        className="bg-safety-orange hover:bg-safety-orange/90 text-white font-bold shadow-lg shadow-safety-orange/25 hover:shadow-xl hover:shadow-safety-orange/30 transition-all"
      >
        <Plus size={16} className="mr-2" />
        Add Your First Ingredient
      </Button>
    </div>
  );
}

// ─── Ingredient Form Modal ────────────────────────────────────────────
function IngredientFormDialog() {
  const { isFormOpen, editingIngredient, isSubmitting, closeForm, createIngredient, updateIngredient } =
    useIngredientStore();

  const isEditing = !!editingIngredient;

  const [form, setForm] = useState<IngredientFormData>({
    name: '',
    quantity: 0,
    unit: 'kg',
    min_threshold: 0,
    expiry_date: '',
    cost_per_unit: 0,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isFormOpen) {
      if (editingIngredient) {
        setForm({
          name: editingIngredient.name,
          quantity: editingIngredient.quantity,
          unit: editingIngredient.unit,
          min_threshold: editingIngredient.min_threshold,
          expiry_date: editingIngredient.expiry_date ?? '',
          cost_per_unit: editingIngredient.cost_per_unit,
        });
      } else {
        setForm({
          name: '',
          quantity: 0,
          unit: 'kg',
          min_threshold: 0,
          expiry_date: '',
          cost_per_unit: 0,
        });
      }
    }
  }, [isFormOpen, editingIngredient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Please enter an ingredient name');
      return;
    }

    const payload: IngredientFormData = {
      ...form,
      expiry_date: form.expiry_date || '',
    };

    // Remove empty expiry_date for API
    const apiPayload: Record<string, unknown> = { ...payload };
    if (!apiPayload.expiry_date) {
      delete apiPayload.expiry_date;
    }

    let success: boolean;
    if (isEditing) {
      success = await updateIngredient(editingIngredient!.id, apiPayload as Partial<IngredientFormData>);
      if (success) toast.success(`"${form.name}" updated successfully`);
      else toast.error('Failed to update ingredient');
    } else {
      success = await createIngredient(apiPayload as unknown as IngredientFormData);
      if (success) toast.success(`"${form.name}" added to inventory`);
      else toast.error('Failed to add ingredient');
    }
  };

  return (
    <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
      <DialogContent className="sm:max-w-[520px] border-border/50 bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-safety-orange/10">
              <Carrot size={16} className="text-safety-orange" />
            </div>
            {isEditing ? 'Edit Ingredient' : 'Add Ingredient'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing
              ? 'Update the details of this ingredient.'
              : 'Fill in the details to add a new ingredient to your inventory.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="ingredient-name" className="text-sm font-semibold">
              Name
            </Label>
            <Input
              id="ingredient-name"
              placeholder="e.g. All-Purpose Flour"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-11 bg-muted/30 border-border/50 focus:border-safety-orange/50 focus:ring-safety-orange/20"
              required
            />
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ingredient-qty" className="text-sm font-semibold">
                Quantity
              </Label>
              <Input
                id="ingredient-qty"
                type="number"
                min={0}
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="h-11 bg-muted/30 border-border/50 focus:border-safety-orange/50 focus:ring-safety-orange/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingredient-unit" className="text-sm font-semibold">
                Unit
              </Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger id="ingredient-unit" className="h-11 bg-muted/30 border-border/50">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Min Threshold + Expiry Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ingredient-threshold" className="text-sm font-semibold">
                Min Threshold
              </Label>
              <Input
                id="ingredient-threshold"
                type="number"
                min={0}
                step="0.01"
                value={form.min_threshold}
                onChange={(e) => setForm({ ...form, min_threshold: Number(e.target.value) })}
                className="h-11 bg-muted/30 border-border/50 focus:border-safety-orange/50 focus:ring-safety-orange/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingredient-expiry" className="text-sm font-semibold">
                Expiry Date
              </Label>
              <Input
                id="ingredient-expiry"
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="h-11 bg-muted/30 border-border/50 focus:border-safety-orange/50 focus:ring-safety-orange/20"
              />
            </div>
          </div>

          {/* Cost per Unit */}
          <div className="space-y-2">
            <Label htmlFor="ingredient-cost" className="text-sm font-semibold">
              Cost per Unit
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                RM
              </span>
              <Input
                id="ingredient-cost"
                type="number"
                min={0}
                step="0.01"
                value={form.cost_per_unit}
                onChange={(e) => setForm({ ...form, cost_per_unit: Number(e.target.value) })}
                className="h-11 pl-10 bg-muted/30 border-border/50 focus:border-safety-orange/50 focus:ring-safety-orange/20"
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting} className="border-border/50">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-safety-orange hover:bg-safety-orange/90 text-white font-bold shadow-md shadow-safety-orange/20"
            >
              {isSubmitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Ingredient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Dialog ────────────────────────────────────────
function DeleteConfirmDialog() {
  const { isDeleteOpen, deletingIngredient, isSubmitting, closeDeleteDialog, deleteIngredient } =
    useIngredientStore();

  const handleDelete = async () => {
    if (!deletingIngredient) return;
    const name = deletingIngredient.name;
    const success = await deleteIngredient(deletingIngredient.id);
    if (success) toast.success(`"${name}" removed from inventory`);
    else toast.error('Failed to delete ingredient');
  };

  return (
    <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
      <DialogContent className="sm:max-w-[420px] border-border/50 bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <ShieldAlert size={16} className="text-red-500" />
            </div>
            Delete Ingredient
          </DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-bold text-foreground">&quot;{deletingIngredient?.name}&quot;</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={closeDeleteDialog} disabled={isSubmitting} className="border-border/50">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="font-bold shadow-md"
          >
            {isSubmitting && <Loader2 size={14} className="mr-2 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ingredient Table Row ──────────────────────────────────────────────
function IngredientRow({
  ingredient,
  index,
}: {
  ingredient: Ingredient;
  index: number;
}) {
  const { openEditForm, openDeleteDialog } = useIngredientStore();
  const status = getStatus(ingredient);
  const days = daysUntil(ingredient.expiry_date);

  return (
    <TableRow
      className={cn(
        'group transition-colors duration-200',
        status === 'critical' && 'bg-red-500/[0.03] hover:bg-red-500/[0.06]',
        status === 'warning' && 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]',
        status === 'good' && 'hover:bg-muted/50'
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      data-ingredient-id={ingredient.id}
    >
      <TableCell className="font-semibold">{ingredient.name}</TableCell>
      <TableCell>
        <span className={cn(
          'font-mono text-sm',
          ingredient.quantity < ingredient.min_threshold && 'text-red-500 font-bold'
        )}>
          {ingredient.quantity}
        </span>
        <span className="text-muted-foreground text-xs ml-1.5">{ingredient.unit}</span>
      </TableCell>
      <TableCell className="text-muted-foreground font-mono text-sm">
        {ingredient.min_threshold} {ingredient.unit}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm">{formatDate(ingredient.expiry_date)}</span>
          {days !== null && days <= 7 && (
            <span
              className={cn(
                'text-[11px] font-semibold mt-0.5',
                days <= 3 ? 'text-red-500' : 'text-amber-500'
              )}
            >
              {days <= 0 ? 'Expired!' : `${days} day${days !== 1 ? 's' : ''} left`}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{formatCurrency(ingredient.cost_per_unit)}</TableCell>
      <TableCell>
        <StatusBadge status={status} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-safety-orange hover:bg-safety-orange/10"
            onClick={() => openEditForm(ingredient)}
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            onClick={() => openDeleteDialog(ingredient)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────
export default function IngredientsPage() {
  const { ingredients, isLoading, fetchIngredients, fetchAlerts, openCreateForm } =
    useIngredientStore();
  const tableRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // AI analysis state
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiAnalyzedAt, setAiAnalyzedAt] = useState<string | null>(null);
  const [aiLatencyMs, setAiLatencyMs] = useState(0);
  const [aiTokensUsed, setAiTokensUsed] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchIngredients();
    fetchAlerts();
  }, [fetchIngredients, fetchAlerts]);

  // Scroll to first matching row
  const scrollToRow = useCallback(
    (predicate: (ing: Ingredient) => boolean) => {
      if (!tableRef.current) return;
      const match = ingredients.find(predicate);
      if (!match) return;
      const row = tableRef.current.querySelector(`[data-ingredient-id="${match.id}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('ring-2', 'ring-safety-orange/50');
        setTimeout(() => row.classList.remove('ring-2', 'ring-safety-orange/50'), 2000);
      }
    },
    [ingredients]
  );

  const handleScrollToExpiring = useCallback(() => {
    scrollToRow((ing) => {
      const days = daysUntil(ing.expiry_date);
      return days !== null && days <= 7;
    });
  }, [scrollToRow]);

  const handleScrollToLowStock = useCallback(() => {
    scrollToRow((ing) => ing.quantity < ing.min_threshold);
  }, [scrollToRow]);

  // AI analysis handler
  const handleAskAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: '' }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAiResponse(json.data.response);
        setAiAnalyzedAt(json.data.analyzed_at);
        setAiLatencyMs(json.data.latency_ms || 0);
        setAiTokensUsed(json.data.tokens_used || 0);
        toast.success('AI analysis complete');
      } else {
        toast.error(json.data?.response || json.message || 'AI analysis failed');
      }
    } catch {
      toast.error('Failed to reach AI service');
    } finally {
      setAiLoading(false);
    }
  };

  // Filter ingredients by search
  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: critical first, then warning, then good
  const sortedIngredients = [...filteredIngredients].sort((a, b) => {
    const priority = { critical: 0, warning: 1, good: 2 };
    return priority[getStatus(a)] - priority[getStatus(b)];
  });

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight">
            Ingredient Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your inventory, track costs, and get expiry alerts.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button
            onClick={handleAskAI}
            disabled={aiLoading || isLoading || ingredients.length === 0}
            variant="outline"
            className="border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/60 font-bold shadow-md transition-all hover:-translate-y-0.5"
          >
            {aiLoading ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Sparkles size={16} className="mr-2" />
            )}
            {aiLoading ? 'Analysing...' : 'Ask AI'}
          </Button>
          <Button
            onClick={openCreateForm}
            className="bg-safety-orange hover:bg-safety-orange/90 text-white font-bold shadow-lg shadow-safety-orange/25 hover:shadow-xl hover:shadow-safety-orange/30 transition-all hover:-translate-y-0.5"
          >
            <Plus size={16} className="mr-2" />
            Add Ingredient
          </Button>
        </div>
      </div>

      {/* ── Alert Banners ──────────────────────────────────────────── */}
      <AlertBanners
        onScrollToExpiring={handleScrollToExpiring}
        onScrollToLowStock={handleScrollToLowStock}
      />

      {/* ── Content ────────────────────────────────────────────────── */}
      {isLoading ? (
        <TableSkeleton />
      ) : ingredients.length === 0 ? (
        <EmptyState onAdd={openCreateForm} />
      ) : (
        <div ref={tableRef} className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-muted/30 border-border/50 focus:border-safety-orange/50 focus:ring-safety-orange/20"
            />
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm shadow-xl shadow-black/[0.03]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-2 border-border/50">
                  <TableHead className="font-heading font-bold text-foreground">Name</TableHead>
                  <TableHead className="font-heading font-bold text-foreground">Quantity</TableHead>
                  <TableHead className="font-heading font-bold text-foreground">Min Threshold</TableHead>
                  <TableHead className="font-heading font-bold text-foreground">Expiry Date</TableHead>
                  <TableHead className="font-heading font-bold text-foreground">Cost / Unit</TableHead>
                  <TableHead className="font-heading font-bold text-foreground">Status</TableHead>
                  <TableHead className="font-heading font-bold text-foreground w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedIngredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={20} className="opacity-40" />
                        <p className="text-sm">No ingredients match &quot;{searchQuery}&quot;</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedIngredients.map((ingredient, idx) => (
                    <IngredientRow key={ingredient.id} ingredient={ingredient} index={idx} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Stats footer */}
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>
              {filteredIngredients.length} of {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
            </span>
            <span>
              Total inventory value:{' '}
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(ingredients.reduce((sum, ing) => sum + ing.quantity * ing.cost_per_unit, 0))}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ── AI Analysis Response ────────────────────────────────────── */}
      {aiResponse && aiAnalyzedAt && (
        <AIResponseCard
          response={aiResponse}
          analyzedAt={aiAnalyzedAt}
          latencyMs={aiLatencyMs}
          tokensUsed={aiTokensUsed}
        />
      )}

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <IngredientFormDialog />
      <DeleteConfirmDialog />
    </div>
  );
}

