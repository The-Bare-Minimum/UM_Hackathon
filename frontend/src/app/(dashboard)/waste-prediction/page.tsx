'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Trash2,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Loader2,
  ShieldAlert,
  Timer,
  Leaf,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateWastePrediction, markWasteActioned } from '@/lib/api-client';
import { toast } from 'sonner';

interface InventoryItem {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  days_until_expiry: number | null;
  urgency: 'critical' | 'warning' | 'safe' | 'no_expiry';
}

interface AISuggestion {
  item_name: string;
  urgency: string;
  suggestion: string;
  action_type: 'use_now' | 'promote' | 'prep' | 'dispose';
}

interface WasteData {
  response?: string;
  success?: boolean;
  parsed_suggestions?: AISuggestion[];
  all_items?: InventoryItem[];
  critical_count?: number;
  warning_count?: number;
  tokens_used?: number;
  latency_ms?: number;
  generated_at?: string;
}

const urgencyConfig = {
  critical: {
    label: 'Critical',
    emoji: '🔴',
    bg: 'bg-red-500/8',
    border: 'border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-500/15 text-red-600 border-red-500/30',
    glow: 'shadow-red-500/10',
  },
  warning: {
    label: 'Warning',
    emoji: '🟡',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    glow: 'shadow-amber-500/10',
  },
  safe: {
    label: 'Safe',
    emoji: '🟢',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
  },
  no_expiry: {
    label: 'No Expiry',
    emoji: '⚪',
    bg: 'bg-muted/30',
    border: 'border-border/50',
    text: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-border',
    glow: '',
  },
};

const actionTypeConfig: Record<string, { label: string; color: string }> = {
  use_now: { label: '🍳 Use Now', color: 'bg-red-500/15 text-red-600 border-red-500/30' },
  promote: { label: '📢 Promote', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  prep: { label: '🧊 Prep/Store', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  dispose: { label: '🗑️ Dispose', color: 'bg-gray-500/15 text-gray-600 border-gray-500/30' },
};

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
      <div className="border-b bg-muted/30 px-6 py-4 flex items-center gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-24 ml-auto" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-6 py-4 border-b border-border/30 last:border-0">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-48 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export default function WastePredictionPage() {
  const [wasteData, setWasteData] = useState<WasteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionedItems, setActionedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateWastePrediction('default');
      if (result?.data) {
        setWasteData(result.data);
      } else {
        setError(result?.message || 'Failed to generate prediction');
      }
    } catch {
      setError('Failed to reach AI service. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkActioned = async (itemName: string, actionType: string) => {
    try {
      await markWasteActioned('default', itemName, actionType);
      setActionedItems((prev) => new Set(prev).add(itemName));
      toast.success(`Marked "${itemName}" as actioned`);
    } catch {
      toast.error('Failed to mark as actioned');
    }
  };

  // Auto-load waste data on mount (just the items, no AI call)
  useEffect(() => {
    handleGenerate();
  }, []);

  const allItems = wasteData?.all_items || [];
  const suggestions = wasteData?.parsed_suggestions || [];

  // Create a lookup for AI suggestions by item name
  const suggestionMap = new Map<string, AISuggestion>();
  suggestions.forEach((s) => suggestionMap.set(s.item_name?.toLowerCase(), s));

  // Sort items: critical first, then warning, then safe, then no_expiry
  const sortedItems = [...allItems].sort((a, b) => {
    const order = { critical: 0, warning: 1, safe: 2, no_expiry: 3 };
    return (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3);
  });

  const criticalCount = allItems.filter((i) => i.urgency === 'critical').length;
  const warningCount = allItems.filter((i) => i.urgency === 'warning').length;
  const safeCount = allItems.filter((i) => i.urgency === 'safe').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 shadow-lg shadow-red-500/10">
              <Trash2 size={24} className="text-red-500" />
            </div>
            Waste Prediction
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered waste prevention with actionable suggestions per ingredient.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold shadow-lg shadow-red-500/25 transition-all hover:-translate-y-0.5 mt-4 sm:mt-0"
        >
          {isGenerating ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <RefreshCw size={16} className="mr-2" />
          )}
          {isGenerating ? 'Analyzing...' : 'Get AI Suggestions'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-3">
        <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15">
              <ShieldAlert size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-red-600 dark:text-red-400">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Critical (0-2 days)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
              <Timer size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-amber-600 dark:text-amber-400">{warningCount}</p>
              <p className="text-xs text-muted-foreground">Warning (3-5 days)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
              <Leaf size={20} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-emerald-600 dark:text-emerald-400">{safeCount}</p>
              <p className="text-xs text-muted-foreground">Safe (6+ days)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timestamp */}
      {wasteData?.generated_at && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={14} />
          <span>
            Last analyzed:{' '}
            {new Date(wasteData.generated_at).toLocaleString('en-MY', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-5">
            <AlertTriangle size={20} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={handleGenerate} className="ml-auto shrink-0">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {isGenerating ? (
        <TableSkeleton />
      ) : sortedItems.length > 0 ? (
        <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm shadow-xl shadow-black/[0.03]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-2 border-border/50">
                <TableHead className="font-heading font-bold text-foreground">Ingredient</TableHead>
                <TableHead className="font-heading font-bold text-foreground">Qty</TableHead>
                <TableHead className="font-heading font-bold text-foreground">Expiry</TableHead>
                <TableHead className="font-heading font-bold text-foreground">Days Left</TableHead>
                <TableHead className="font-heading font-bold text-foreground">Status</TableHead>
                <TableHead className="font-heading font-bold text-foreground">AI Suggestion</TableHead>
                <TableHead className="font-heading font-bold text-foreground w-[140px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item, idx) => {
                const cfg = urgencyConfig[item.urgency];
                const suggestion = suggestionMap.get(item.name?.toLowerCase());
                const isActioned = actionedItems.has(item.name);

                return (
                  <TableRow
                    key={item.id || idx}
                    className={cn(
                      'group transition-colors duration-200',
                      item.urgency === 'critical' && 'bg-red-500/[0.03] hover:bg-red-500/[0.06]',
                      item.urgency === 'warning' && 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]',
                      item.urgency === 'safe' && 'hover:bg-muted/50',
                      isActioned && 'opacity-50'
                    )}
                  >
                    <TableCell className="font-semibold">{item.name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{item.quantity}</span>
                      <span className="text-muted-foreground text-xs ml-1">{item.unit}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.expiry_date
                        ? new Date(item.expiry_date).toLocaleDateString('en-MY', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {item.days_until_expiry !== null ? (
                        <span className={cn('font-mono font-bold text-sm', cfg.text)}>
                          {item.days_until_expiry <= 0 ? 'Expired!' : `${item.days_until_expiry}d`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs font-semibold', cfg.badge)}>
                        {cfg.emoji} {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {suggestion ? (
                        <div className="space-y-1.5">
                          <p className="text-xs leading-relaxed max-w-xs">{suggestion.suggestion}</p>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              actionTypeConfig[suggestion.action_type]?.color || 'bg-muted'
                            )}
                          >
                            {actionTypeConfig[suggestion.action_type]?.label || suggestion.action_type}
                          </Badge>
                        </div>
                      ) : item.urgency === 'critical' || item.urgency === 'warning' ? (
                        <span className="text-xs text-muted-foreground italic">
                          Click &quot;Get AI Suggestions&quot;
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {suggestion && !isActioned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkActioned(item.name, suggestion.action_type)}
                          className="text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/60 font-semibold"
                        >
                          <CheckCircle2 size={14} className="mr-1" />
                          Actioned
                        </Button>
                      ) : isActioned ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                          ✅ Done
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : !error && !isGenerating ? (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-2xl scale-150" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20">
                <Trash2 size={36} className="text-red-400" />
              </div>
            </div>
            <h3 className="text-xl font-heading font-bold mb-2">No inventory data</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Add ingredients with expiry dates to get AI-powered waste predictions.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles size={12} className="text-red-400" />
        Powered by Z.AI GLM · UMHackathon 2026
      </div>
    </div>
  );
}
