'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ChefHat,
  RefreshCw,
  Clock,
  AlertTriangle,
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateMenuAdvice } from '@/lib/api-client';

interface PushItem {
  item: string;
  reason: string;
}

interface RetireItem {
  item: string;
  reason: string;
}

interface NewDish {
  name: string;
  ingredients: string[];
  reason: string;
}

interface MenuAdviceData {
  response?: string;
  success?: boolean;
  parsed_advice?: {
    push?: PushItem[];
    retire?: RetireItem[];
    new_dish?: NewDish;
  } | null;
  month?: string;
  season_context?: string;
  tokens_used?: number;
  latency_ms?: number;
  generated_at?: string;
}

function MenuBoardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4 p-6 rounded-xl border border-border/50 bg-muted/20">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ))}
    </div>
  );
}

function PushCard({ item, reason, index }: { item: string; reason: string; index: number }) {
  return (
    <div
      className="p-5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] to-teal-500/[0.03] transition-all hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 duration-300 group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 shrink-0 group-hover:bg-emerald-500/25 transition-colors">
          <TrendingUp size={20} className="text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-bold text-emerald-700 dark:text-emerald-300 text-lg">
            {item}
          </h4>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{reason}</p>
          <Badge
            variant="outline"
            className="mt-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-semibold"
          >
            📈 PUSH This Week
          </Badge>
        </div>
      </div>
    </div>
  );
}

function RetireCard({ item, reason, index }: { item: string; reason: string; index: number }) {
  return (
    <div
      className="p-5 rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/[0.06] to-orange-500/[0.03] transition-all hover:shadow-lg hover:shadow-red-500/10 hover:-translate-y-0.5 duration-300 group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15 shrink-0 group-hover:bg-red-500/25 transition-colors">
          <TrendingDown size={20} className="text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-bold text-red-700 dark:text-red-300 text-lg">
            {item}
          </h4>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{reason}</p>
          <Badge
            variant="outline"
            className="mt-3 bg-red-500/10 text-red-600 border-red-500/30 text-xs font-semibold"
          >
            📉 Retire / Discount
          </Badge>
        </div>
      </div>
    </div>
  );
}

function NewDishCard({ dish }: { dish: NewDish }) {
  return (
    <div className="p-6 rounded-xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-400/[0.08] via-yellow-400/[0.05] to-orange-400/[0.03] shadow-lg shadow-amber-500/10 relative overflow-hidden">
      {/* Gold shimmer effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-400/10 to-transparent rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-amber-400/10 to-transparent rounded-full -ml-12 -mb-12" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-400/20 shadow-lg shadow-amber-500/10">
            <Lightbulb size={24} className="text-amber-500" />
          </div>
          <div>
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 text-xs font-bold shadow-md shadow-amber-500/20 mb-1">
              ✨ NEW DISH IDEA
            </Badge>
            <h4 className="font-heading font-extrabold text-xl text-amber-700 dark:text-amber-300">
              {dish.name}
            </h4>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{dish.reason}</p>

        {dish.ingredients && dish.ingredients.length > 0 && (
          <div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
              Key Ingredients
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dish.ingredients.map((ing, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs"
                >
                  {ing}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MenuAdvisorPage() {
  const [adviceData, setAdviceData] = useState<MenuAdviceData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateMenuAdvice('default');
      if (result?.data) {
        setAdviceData(result.data);
      } else {
        setError(result?.message || 'Failed to generate advice');
      }
    } catch {
      setError('Failed to reach AI service. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const advice = adviceData?.parsed_advice;
  const pushItems = advice?.push || [];
  const retireItems = advice?.retire || [];
  const newDish = advice?.new_dish;

  // If parsed_advice is null but there's a raw response, try parsing it
  const rawResponse = adviceData?.response;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 shadow-lg shadow-amber-500/10">
              <ChefHat size={24} className="text-amber-500" />
            </div>
            Seasonal Menu Advisor
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered menu optimization based on sales trends, seasonality, and ingredient availability.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5 mt-4 sm:mt-0"
        >
          {isGenerating ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <RefreshCw size={16} className="mr-2" />
          )}
          {isGenerating ? 'Analyzing...' : 'Get Menu Recommendations'}
        </Button>
      </div>

      {/* Season Context */}
      {adviceData?.month && (
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/[0.05] to-transparent">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
              <Clock size={20} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="font-heading font-bold text-sm">{adviceData.month}</p>
              <p className="text-xs text-muted-foreground">{adviceData.season_context}</p>
            </div>
            {adviceData.generated_at && (
              <span className="text-[11px] text-muted-foreground font-mono">
                {new Date(adviceData.generated_at).toLocaleString('en-MY', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            )}
          </CardContent>
        </Card>
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

      {/* Loading State */}
      {isGenerating ? (
        <MenuBoardSkeleton />
      ) : advice ? (
        <div className="space-y-8">
          {/* Push Items */}
          {pushItems.length > 0 && (
            <div>
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-500" />
                Items to Push
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-semibold ml-2">
                  {pushItems.length} items
                </Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {pushItems.map((item, idx) => (
                  <PushCard key={idx} item={item.item} reason={item.reason} index={idx} />
                ))}
              </div>
            </div>
          )}

          {/* Retire Items */}
          {retireItems.length > 0 && (
            <div>
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
                <TrendingDown size={20} className="text-red-500" />
                Items to Retire / Discount
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs font-semibold ml-2">
                  {retireItems.length} items
                </Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {retireItems.map((item, idx) => (
                  <RetireCard key={idx} item={item.item} reason={item.reason} index={idx} />
                ))}
              </div>
            </div>
          )}

          {/* New Dish Idea */}
          {newDish && (
            <div>
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
                <Lightbulb size={20} className="text-amber-500" />
                New Dish Idea
              </h2>
              <NewDishCard dish={newDish} />
            </div>
          )}
        </div>
      ) : rawResponse && !error ? (
        /* Fallback: Show raw response if JSON parsing failed */
        <Card className="border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-lg font-heading font-bold flex items-center gap-2">
              <ChefHat size={20} className="text-amber-500" />
              AI Menu Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {rawResponse}
            </div>
          </CardContent>
        </Card>
      ) : !error && !isGenerating ? (
        /* Empty State */
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-2xl scale-150" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/10 to-orange-500/10 border border-amber-500/20">
                <ChefHat size={36} className="text-amber-400" />
              </div>
            </div>
            <h3 className="text-xl font-heading font-bold mb-2">No Menu Recommendations Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Click &ldquo;Get Menu Recommendations&rdquo; to analyze your sales trends,
              seasonal context, and ingredient availability for AI-powered menu optimization.
            </p>
            <Button
              onClick={handleGenerate}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg shadow-amber-500/25"
            >
              <Sparkles size={16} className="mr-2" />
              Generate Recommendations
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles size={12} className="text-amber-400" />
        Powered by Z.AI GLM · UMHackathon 2026
      </div>
    </div>
  );
}
