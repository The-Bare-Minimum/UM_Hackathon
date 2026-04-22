'use client';

import { useEffect, useState, useMemo } from 'react';
import { useBudgetStore } from '@/stores/budget-store';
import type {
  Expense,
  ExpenseFormData,
  BudgetFormData,
  BudgetStatus,
} from '@/types/expense';
import {
  EXPENSE_CATEGORIES,
  FREQUENCY_OPTIONS,
  MONTH_NAMES,
  getBudgetStatus,
  getBudgetPercentage,
} from '@/types/expense';
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

// Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Lucide icons
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Settings2,
  Receipt,
  Search,
  ArrowUpDown,
  ReceiptText,
  Sparkles,
} from 'lucide-react';

// ─── AI Budget Response Card ──────────────────────────────────────────
function AIBudgetResponseCard({
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
          AI Budget Analysis
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

function formatCurrency(amount: number): string {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getCategoryLabel(value: string | null): string {
  if (!value) return 'Uncategorized';
  const cat = EXPENSE_CATEGORIES.find((c) => c.value === value);
  return cat?.label ?? value.charAt(0).toUpperCase() + value.slice(1);
}

function getFrequencyLabel(value: string | null): string {
  if (!value) return 'One-time';
  const freq = FREQUENCY_OPTIONS.find((f) => f.value === value);
  return freq?.label ?? value;
}

// Colour palette for chart bars
const CHART_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6',
  '#ec4899', '#f59e0b', '#06b6d4', '#ef4444',
  '#84cc16', '#6366f1',
];

// ─── Summary Cards ─────────────────────────────────────────────────────

function SummaryCards({ loading }: { loading: boolean }) {
  const { summary, lastMonthSummary, budgets } = useBudgetStore();

  const totalSpent = summary?.total_spent ?? 0;
  const totalAllocated = budgets.reduce((s, b) => s + b.allocated_amount, 0);
  const remaining = totalAllocated - totalSpent;
  const biggestCat = summary?.biggest_category
    ? getCategoryLabel(summary.biggest_category)
    : '—';

  // Month vs last month change
  const lastTotal = lastMonthSummary?.total_spent ?? 0;
  const change = lastTotal > 0
    ? Math.round(((totalSpent - lastTotal) / lastTotal) * 100)
    : 0;

  const cards = [
    {
      title: 'Total Spent This Month',
      value: loading ? '—' : formatCurrency(totalSpent),
      icon: DollarSign,
      accent: false,
      sub: loading ? '—' : `${summary?.expense_count ?? 0} transaction(s)`,
    },
    {
      title: 'Remaining Budget',
      value: loading ? '—' : formatCurrency(Math.max(0, remaining)),
      icon: Wallet,
      accent: remaining < 0,
      sub: loading ? '—' : (
        totalAllocated > 0
          ? `of ${formatCurrency(totalAllocated)} allocated`
          : 'No budget set'
      ),
    },
    {
      title: 'Biggest Category',
      value: loading ? '—' : biggestCat,
      icon: Target,
      accent: false,
      sub: loading ? '—' : (
        summary?.biggest_category
          ? formatCurrency(summary.by_category[summary.biggest_category] ?? 0)
          : 'No data yet'
      ),
    },
    {
      title: 'vs Last Month',
      value: loading ? '—' : `${change >= 0 ? '+' : ''}${change}%`,
      icon: change >= 0 ? TrendingUp : TrendingDown,
      accent: change > 20,
      sub: loading ? '—' : (
        lastTotal > 0
          ? `Last month: ${formatCurrency(lastTotal)}`
          : 'No data to compare'
      ),
      trend: change,
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card
          key={i}
          className={cn(
            'relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 duration-300 border-border/40',
            card.accent && 'border-red-500/30 ring-1 ring-red-500/10'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div
              className={cn(
                'p-2 rounded-lg',
                card.accent
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-safety-orange/10 text-safety-orange'
              )}
            >
              <card.icon size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold font-heading', loading && 'animate-pulse')}>
              {card.value}
            </div>
            <div className="flex items-center mt-1 text-xs gap-1.5">
              {'trend' in card && card.trend !== undefined && (
                <span
                  className={cn(
                    'flex items-center font-bold',
                    card.trend >= 0 ? 'text-red-500' : 'text-emerald-500'
                  )}
                >
                  {card.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                </span>
              )}
              <span className="text-muted-foreground line-clamp-1">{card.sub}</span>
            </div>
          </CardContent>
          {card.accent && (
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full -mr-8 -mt-8" />
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Budget Progress Section ───────────────────────────────────────────

function BudgetProgressSection({ loading }: { loading: boolean }) {
  const { budgets, summary, openBudgetForm } = useBudgetStore();
  const spentByCategory = summary?.by_category ?? {};

  // Merge: show every budgeted category + any spent categories without budgets
  const allCategories = new Set([
    ...budgets.map((b) => b.category),
    ...Object.keys(spentByCategory),
  ]);

  const rows = Array.from(allCategories).map((cat) => {
    const budget = budgets.find((b) => b.category === cat);
    const allocated = budget?.allocated_amount ?? 0;
    const spent = spentByCategory[cat] ?? 0;
    const pct = getBudgetPercentage(spent, allocated);
    const status = getBudgetStatus(spent, allocated);
    return { category: cat, allocated, spent, pct, status };
  });

  // Sort by percentage descending (over-budget first)
  rows.sort((a, b) => b.pct - a.pct);

  if (loading) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-xl font-heading font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-safety-orange/10">
              <Target size={16} className="text-safety-orange" />
            </div>
            Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <Wallet size={28} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              No budgets set yet. Set category budgets to track your spending.
            </p>
            <Button
              onClick={() => openBudgetForm()}
              variant="outline"
              className="border-safety-orange/50 text-safety-orange hover:bg-safety-orange/10"
            >
              <Plus size={14} className="mr-2" />
              Set First Budget
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-heading font-bold flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-safety-orange/10">
            <Target size={16} className="text-safety-orange" />
          </div>
          Budget Status
        </CardTitle>
        <Button
          onClick={() => openBudgetForm()}
          variant="outline"
          size="sm"
          className="border-safety-orange/50 text-safety-orange hover:bg-safety-orange/10"
        >
          <Plus size={14} className="mr-1.5" />
          Set Budget
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.map((row) => (
          <BudgetProgressRow
            key={row.category}
            category={row.category}
            allocated={row.allocated}
            spent={row.spent}
            pct={row.pct}
            status={row.status}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function BudgetProgressRow({
  category,
  allocated,
  spent,
  pct,
  status,
}: {
  category: string;
  allocated: number;
  spent: number;
  pct: number;
  status: BudgetStatus;
}) {
  const { openBudgetForm } = useBudgetStore();

  const statusConfig = {
    over: {
      emoji: '🔴',
      color: 'bg-red-500',
      track: 'bg-red-500/10',
      text: 'text-red-500',
      label: 'Over budget',
    },
    near: {
      emoji: '🟡',
      color: 'bg-amber-500',
      track: 'bg-amber-500/10',
      text: 'text-amber-500',
      label: 'Near limit',
    },
    'on-track': {
      emoji: '🟢',
      color: 'bg-emerald-500',
      track: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      label: 'On track',
    },
  };

  const s = statusConfig[status];

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs">{s.emoji}</span>
          <span className="text-sm font-semibold">{getCategoryLabel(category)}</span>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0 font-semibold', s.text)}
          >
            {s.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {formatCurrency(spent)} / {allocated > 0 ? formatCurrency(allocated) : '—'}
          </span>
          <span className={cn('text-xs font-bold font-mono', s.text)}>
            {allocated > 0 ? `${pct}%` : '—'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-safety-orange"
            onClick={() => openBudgetForm(category)}
          >
            <Settings2 size={12} />
          </Button>
        </div>
      </div>
      <div className={cn('h-2.5 rounded-full overflow-hidden', s.track)}>
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', s.color)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Spending Chart ────────────────────────────────────────────────────

function SpendingChart({ loading }: { loading: boolean }) {
  const { comparison } = useBudgetStore();

  if (loading) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Build chart data: each month is a bar group, with keys per-category
  const allCats = new Set<string>();
  comparison.forEach((m) => {
    Object.keys(m.by_category).forEach((c) => allCats.add(c));
  });
  const categories = Array.from(allCats);

  const chartData = comparison.map((m) => {
    const row: Record<string, string | number> = { name: m.label };
    categories.forEach((c) => {
      row[getCategoryLabel(c)] = m.by_category[c] ?? 0;
    });
    return row;
  });

  if (chartData.length === 0 || categories.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-xl font-heading font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-safety-orange/10">
              <TrendingUp size={16} className="text-safety-orange" />
            </div>
            Monthly Spending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <TrendingUp size={28} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No spending data yet. Add expenses to see your spending trends.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="text-xl font-heading font-bold flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-safety-orange/10">
            <TrendingUp size={16} className="text-safety-orange" />
          </div>
          Monthly Spending by Category
        </CardTitle>
        <p className="text-sm text-muted-foreground">Last 3 months comparison</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `RM${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [formatCurrency(value), undefined]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
            {categories.map((cat, i) => (
              <Bar
                key={cat}
                dataKey={getCategoryLabel(cat)}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Expense Table ─────────────────────────────────────────────────────

function ExpenseTable({ loading }: { loading: boolean }) {
  const {
    expenses,
    filterCategory,
    filterMonth,
    filterYear,
    sortBy,
    sortDir,
    setFilterCategory,
    setSortBy,
    toggleSortDir,
    openExpenseForm,
    openEditExpenseForm,
    openDeleteDialog,
  } = useBudgetStore();

  // Filter
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      // Category filter
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      // Month/year filter
      if (e.transaction_date) {
        const d = new Date(e.transaction_date);
        if (d.getMonth() + 1 !== filterMonth || d.getFullYear() !== filterYear) return false;
      }
      return true;
    });
  }, [expenses, filterCategory, filterMonth, filterYear]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = (a.transaction_date ?? '').localeCompare(b.transaction_date ?? '');
      } else {
        cmp = a.amount - b.amount;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-heading font-bold flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-safety-orange/10">
            <Receipt size={16} className="text-safety-orange" />
          </div>
          Expenses
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px] h-9 bg-muted/30 border-border/50 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs border-border/50"
            onClick={() => {
              if (sortBy === 'date') setSortBy('amount');
              else setSortBy('date');
            }}
          >
            <ArrowUpDown size={12} className="mr-1.5" />
            {sortBy === 'date' ? 'Date' : 'Amount'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs border-border/50"
            onClick={toggleSortDir}
          >
            {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
          </Button>

          {/* Add */}
          <Button
            onClick={openExpenseForm}
            className="bg-safety-orange hover:bg-safety-orange/90 text-white font-bold shadow-lg shadow-safety-orange/25 hover:shadow-xl hover:shadow-safety-orange/30 transition-all hover:-translate-y-0.5 h-9 text-xs"
          >
            <Plus size={14} className="mr-1.5" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <ExpenseEmptyState />
      ) : (
        <>
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm shadow-xl shadow-black/[0.03]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-2 border-border/50">
                  <TableHead className="font-heading font-bold text-foreground">Date</TableHead>
                  <TableHead className="font-heading font-bold text-foreground">Name</TableHead>
                  <TableHead className="font-heading font-bold text-foreground">Category</TableHead>
                  <TableHead className="font-heading font-bold text-foreground">Amount</TableHead>
                  <TableHead className="font-heading font-bold text-foreground">Frequency</TableHead>
                  <TableHead className="font-heading font-bold text-foreground">Notes</TableHead>
                  <TableHead className="font-heading font-bold text-foreground w-[90px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((exp, idx) => (
                  <TableRow
                    key={exp.id}
                    className="group transition-colors duration-200 hover:bg-muted/50"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <TableCell className="text-sm">{formatDate(exp.transaction_date)}</TableCell>
                    <TableCell className="font-semibold text-sm">
                      {exp.name || exp.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {getCategoryLabel(exp.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold">
                      {formatCurrency(exp.amount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {getFrequencyLabel(exp.frequency)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {exp.notes || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-safety-orange hover:bg-safety-orange/10"
                          onClick={() => openEditExpenseForm(exp)}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => openDeleteDialog(exp)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>{sorted.length} expense(s) shown</span>
            <span>
              Total:{' '}
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(sorted.reduce((s, e) => s + e.amount, 0))}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <div className="border-b bg-muted/30 px-6 py-4 flex items-center gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24 ml-auto" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 px-6 py-4 border-b border-border/30 last:border-0"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────

function ExpenseEmptyState() {
  const { openExpenseForm } = useBudgetStore();
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-safety-orange/10 blur-2xl scale-150" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border/50">
          <ReceiptText size={36} className="text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-xl font-heading font-bold mb-2">No expenses found</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-8 leading-relaxed">
        Start tracking your business expenses. Add your first expense to get budget insights and spending trends.
      </p>
      <Button
        onClick={openExpenseForm}
        className="bg-safety-orange hover:bg-safety-orange/90 text-white font-bold shadow-lg shadow-safety-orange/25 hover:shadow-xl hover:shadow-safety-orange/30 transition-all"
      >
        <Plus size={16} className="mr-2" />
        Add Your First Expense
      </Button>
    </div>
  );
}

// ─── Add/Edit Expense Modal ────────────────────────────────────────────

function ExpenseFormDialog() {
  const {
    isExpenseFormOpen,
    editingExpense,
    isSubmitting,
    closeExpenseForm,
    createExpense,
    updateExpense,
  } = useBudgetStore();

  const isEditing = !!editingExpense;

  const [form, setForm] = useState<ExpenseFormData>({
    name: '',
    category: 'other',
    amount: 0,
    frequency: 'one-time',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (isExpenseFormOpen) {
      if (editingExpense) {
        setForm({
          name: editingExpense.name ?? editingExpense.description ?? '',
          category: editingExpense.category ?? 'other',
          amount: editingExpense.amount,
          frequency: editingExpense.frequency ?? 'one-time',
          transaction_date: editingExpense.transaction_date?.split('T')[0] ?? '',
          notes: editingExpense.notes ?? '',
        });
      } else {
        setForm({
          name: '',
          category: 'other',
          amount: 0,
          frequency: 'one-time',
          transaction_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
      }
    }
  }, [isExpenseFormOpen, editingExpense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter an expense name');
      return;
    }
    if (form.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    let success: boolean;
    if (isEditing) {
      success = await updateExpense(editingExpense!.id, form);
      if (success) toast.success(`"${form.name}" updated`);
      else toast.error('Failed to update expense');
    } else {
      success = await createExpense(form);
      if (success) toast.success(`"${form.name}" added`);
      else toast.error('Failed to add expense');
    }
  };

  return (
    <Dialog open={isExpenseFormOpen} onOpenChange={(open) => !open && closeExpenseForm()}>
      <DialogContent className="sm:max-w-[540px] border-border/50 bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-safety-orange/10">
              <Receipt size={16} className="text-safety-orange" />
            </div>
            {isEditing ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing
              ? 'Update the details of this expense.'
              : 'Fill in the details to record a new expense.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="expense-name" className="text-sm font-semibold">
              Name
            </Label>
            <Input
              id="expense-name"
              placeholder="e.g. Monthly Electricity Bill"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-11 bg-muted/30 border-border/50 focus:border-safety-orange/50 focus:ring-safety-orange/20"
              required
            />
          </div>

          {/* Category + Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense-category" className="text-sm font-semibold">
                Category
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger id="expense-category" className="h-11 bg-muted/30 border-border/50">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-frequency" className="text-sm font-semibold">
                Frequency
              </Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v })}
              >
                <SelectTrigger id="expense-frequency" className="h-11 bg-muted/30 border-border/50">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense-amount" className="text-sm font-semibold">
                Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  RM
                </span>
                <Input
                  id="expense-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount || ''}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className="h-11 pl-10 bg-muted/30 border-border/50 focus:border-safety-orange/50 focus:ring-safety-orange/20"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date" className="text-sm font-semibold">
                Date
              </Label>
              <Input
                id="expense-date"
                type="date"
                value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                className="h-11 bg-muted/30 border-border/50 focus:border-safety-orange/50 focus:ring-safety-orange/20"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="expense-notes" className="text-sm font-semibold">
              Notes
            </Label>
            <textarea
              id="expense-notes"
              placeholder="Additional notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-md bg-muted/30 border border-border/50 px-3 py-2 text-sm focus:border-safety-orange/50 focus:ring-1 focus:ring-safety-orange/20 focus:outline-none resize-none"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeExpenseForm}
              disabled={isSubmitting}
              className="border-border/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-safety-orange hover:bg-safety-orange/90 text-white font-bold shadow-md shadow-safety-orange/20"
            >
              {isSubmitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Set Budget Modal ──────────────────────────────────────────────────

function BudgetFormDialog() {
  const {
    isBudgetFormOpen,
    budgetCategory,
    isSubmitting,
    closeBudgetForm,
    setBudget,
    filterMonth,
    filterYear,
  } = useBudgetStore();

  const [form, setForm] = useState<BudgetFormData>({
    category: '',
    allocated_amount: 0,
    month: filterMonth,
    year: filterYear,
  });

  useEffect(() => {
    if (isBudgetFormOpen) {
      setForm({
        category: budgetCategory || '',
        allocated_amount: 0,
        month: filterMonth,
        year: filterYear,
      });
    }
  }, [isBudgetFormOpen, budgetCategory, filterMonth, filterYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) {
      toast.error('Please select a category');
      return;
    }
    const success = await setBudget(form);
    if (success) toast.success(`Budget set for ${getCategoryLabel(form.category)}`);
    else toast.error('Failed to set budget');
  };

  return (
    <Dialog open={isBudgetFormOpen} onOpenChange={(open) => !open && closeBudgetForm()}>
      <DialogContent className="sm:max-w-[440px] border-border/50 bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-safety-orange/10">
              <Target size={16} className="text-safety-orange" />
            </div>
            Set Budget
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set a monthly budget allocation for a category.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="budget-category" className="text-sm font-semibold">
              Category
            </Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger id="budget-category" className="h-11 bg-muted/30 border-border/50">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Allocated Amount */}
          <div className="space-y-2">
            <Label htmlFor="budget-amount" className="text-sm font-semibold">
              Allocated Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                RM
              </span>
              <Input
                id="budget-amount"
                type="number"
                min={0}
                step="0.01"
                value={form.allocated_amount || ''}
                onChange={(e) => setForm({ ...form, allocated_amount: Number(e.target.value) })}
                className="h-11 pl-10 bg-muted/30 border-border/50 focus:border-safety-orange/50 focus:ring-safety-orange/20"
                required
              />
            </div>
          </div>

          {/* Month + Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget-month" className="text-sm font-semibold">
                Month
              </Label>
              <Select
                value={String(form.month)}
                onValueChange={(v) => setForm({ ...form, month: Number(v) })}
              >
                <SelectTrigger id="budget-month" className="h-11 bg-muted/30 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-year" className="text-sm font-semibold">
                Year
              </Label>
              <Select
                value={String(form.year)}
                onValueChange={(v) => setForm({ ...form, year: Number(v) })}
              >
                <SelectTrigger id="budget-year" className="h-11 bg-muted/30 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeBudgetForm}
              disabled={isSubmitting}
              className="border-border/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-safety-orange hover:bg-safety-orange/90 text-white font-bold shadow-md shadow-safety-orange/20"
            >
              {isSubmitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              Set Budget
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation ───────────────────────────────────────────────

function DeleteConfirmDialog() {
  const { isDeleteOpen, deletingExpense, isSubmitting, closeDeleteDialog, deleteExpense } =
    useBudgetStore();

  const handleDelete = async () => {
    if (!deletingExpense) return;
    const name = deletingExpense.name || deletingExpense.description || 'Expense';
    const success = await deleteExpense(deletingExpense.id);
    if (success) toast.success(`"${name}" removed`);
    else toast.error('Failed to delete expense');
  };

  return (
    <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
      <DialogContent className="sm:max-w-[420px] border-border/50 bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <Trash2 size={16} className="text-red-500" />
            </div>
            Delete Expense
          </DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-bold text-foreground">
              &quot;{deletingExpense?.name || deletingExpense?.description || 'this expense'}&quot;
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={closeDeleteDialog}
            disabled={isSubmitting}
            className="border-border/50"
          >
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

// ─── Summary Skeleton ──────────────────────────────────────────────────

function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Month/Year Selector ───────────────────────────────────────────────

function MonthYearSelector() {
  const { filterMonth, filterYear, setFilterMonth, setFilterYear, fetchAll } = useBudgetStore();

  const handleMonthChange = async (v: string) => {
    setFilterMonth(Number(v));
    // Re-fetch after state update
    setTimeout(() => fetchAll(), 50);
  };

  const handleYearChange = async (v: string) => {
    setFilterYear(Number(v));
    setTimeout(() => fetchAll(), 50);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={String(filterMonth)} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-[130px] h-9 bg-muted/30 border-border/50 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, idx) => (
            <SelectItem key={idx} value={String(idx + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(filterYear)} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[90px] h-9 bg-muted/30 border-border/50 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[2024, 2025, 2026, 2027].map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────

export default function BudgetExpensesPage() {
  const { isLoading, fetchAll } = useBudgetStore();

  // AI analysis state
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiAnalyzedAt, setAiAnalyzedAt] = useState<string | null>(null);
  const [aiLatencyMs, setAiLatencyMs] = useState(0);
  const [aiTokensUsed, setAiTokensUsed] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // AI analysis handler
  const handleAskAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze-budget', {
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
        toast.success('AI budget analysis complete');
      } else {
        toast.error(json.data?.response || json.message || 'AI analysis failed');
      }
    } catch {
      toast.error('Failed to reach AI service');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight">
            Budget & Expenses
          </h1>
          <p className="text-muted-foreground mt-1">
            Track spending, manage budgets, and monitor your financial health.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button
            onClick={handleAskAI}
            disabled={aiLoading || isLoading}
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
          <MonthYearSelector />
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? <SummaryCardsSkeleton /> : <SummaryCards loading={isLoading} />}

      {/* Budget Progress + Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BudgetProgressSection loading={isLoading} />
        <SpendingChart loading={isLoading} />
      </div>

      {/* Expenses Table */}
      <ExpenseTable loading={isLoading} />

      {/* ── AI Analysis Response ────────────────────────────────────── */}
      {aiResponse && aiAnalyzedAt && (
        <AIBudgetResponseCard
          response={aiResponse}
          analyzedAt={aiAnalyzedAt}
          latencyMs={aiLatencyMs}
          tokensUsed={aiTokensUsed}
        />
      )}

      {/* Modals */}
      <ExpenseFormDialog />
      <BudgetFormDialog />
      <DeleteConfirmDialog />
    </div>
  );
}
