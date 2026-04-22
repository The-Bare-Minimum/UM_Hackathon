'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateAIDailyBriefing, fetchLatestBriefing } from '@/lib/api-client';

interface BriefingData {
  response?: string;
  success?: boolean;
  tokens_used?: number;
  latency_ms?: number;
  generated_at?: string;
}

// Parse AI response into 3 sections based on ## headings
function parseBriefingSections(text: string) {
  const sections: { title: string; content: string; icon: 'summary' | 'risks' | 'recommendations' }[] = [];
  
  const summaryMatch = text.match(/##\s*Summary\s*\n([\s\S]*?)(?=##|$)/i);
  const risksMatch = text.match(/##\s*Key\s*Risks?\s*\n([\s\S]*?)(?=##|$)/i);
  const recsMatch = text.match(/##\s*Today'?s?\s*Recommendations?\s*\n([\s\S]*?)(?=##|$)/i);

  if (summaryMatch) sections.push({ title: 'Summary', content: summaryMatch[1].trim(), icon: 'summary' });
  if (risksMatch) sections.push({ title: 'Key Risks', content: risksMatch[1].trim(), icon: 'risks' });
  if (recsMatch) sections.push({ title: "Today's Recommendations", content: recsMatch[1].trim(), icon: 'recommendations' });

  // If parsing failed, show entire response as summary
  if (sections.length === 0 && text.trim()) {
    sections.push({ title: 'Briefing', content: text.trim(), icon: 'summary' });
  }

  return sections;
}

function BriefingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 p-5 rounded-xl border border-border/50 bg-muted/20">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  content,
  icon,
  defaultOpen = true,
}: {
  title: string;
  content: string;
  icon: 'summary' | 'risks' | 'recommendations';
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const iconConfig = {
    summary: { Icon: TrendingUp, gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', text: 'text-blue-500' },
    risks: { Icon: AlertTriangle, gradient: 'from-red-500/20 to-orange-500/20', border: 'border-red-500/30', text: 'text-red-500' },
    recommendations: { Icon: Lightbulb, gradient: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', text: 'text-emerald-500' },
  };

  const cfg = iconConfig[icon];

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-300 overflow-hidden',
        cfg.border,
        isOpen ? 'bg-gradient-to-br from-card to-muted/10 shadow-lg' : 'bg-card/50'
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br', cfg.gradient)}>
            <cfg.Icon size={20} className={cfg.text} />
          </div>
          <h3 className="text-lg font-heading font-bold">{title}</h3>
        </div>
        <div className={cn('transition-transform duration-200', isOpen && 'rotate-180')}>
          <ChevronDown size={18} className="text-muted-foreground" />
        </div>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap pl-[52px]">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DailyBriefingPage() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCachedBriefing = useCallback(async () => {
    try {
      const result = await fetchLatestBriefing('default');
      if (result?.data?.output_json) {
        const output = typeof result.data.output_json === 'string'
          ? JSON.parse(result.data.output_json)
          : result.data.output_json;
        setBriefing({
          ...output,
          generated_at: result.data.generated_at,
        });
      }
    } catch {
      // No cached data — that's fine
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCachedBriefing();
  }, [loadCachedBriefing]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateAIDailyBriefing('default');
      if (result?.data) {
        setBriefing(result.data);
      } else {
        setError(result?.message || 'Failed to generate briefing');
      }
    } catch (e) {
      setError('Failed to reach AI service. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sections = briefing?.response ? parseBriefingSections(briefing.response) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 shadow-lg shadow-purple-500/10">
              <Brain size={24} className="text-purple-500" />
            </div>
            AI Daily Briefing
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive AI-powered business snapshot generated by Z.AI GLM.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all hover:-translate-y-0.5 mt-4 sm:mt-0"
        >
          {isGenerating ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <RefreshCw size={16} className="mr-2" />
          )}
          {isGenerating ? 'Generating...' : briefing ? 'Regenerate' : 'Generate Briefing'}
        </Button>
      </div>

      {/* Timestamp */}
      {briefing?.generated_at && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={14} />
          <span>
            Generated at{' '}
            {new Date(briefing.generated_at).toLocaleString('en-MY', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
          {briefing.tokens_used ? (
            <Badge variant="outline" className="ml-2 text-xs font-mono">
              {briefing.tokens_used} tokens
            </Badge>
          ) : null}
          {briefing.latency_ms ? (
            <Badge variant="outline" className="text-xs font-mono">
              {(briefing.latency_ms / 1000).toFixed(1)}s
            </Badge>
          ) : null}
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

      {/* Loading State */}
      {isLoading || isGenerating ? (
        <BriefingSkeleton />
      ) : sections.length > 0 ? (
        /* Briefing Sections */
        <div className="space-y-4">
          {sections.map((section, idx) => (
            <SectionCard
              key={idx}
              title={section.title}
              content={section.content}
              icon={section.icon}
              defaultOpen={true}
            />
          ))}
        </div>
      ) : !error ? (
        /* Empty State */
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-2xl scale-150" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                <Brain size={36} className="text-purple-400" />
              </div>
            </div>
            <h3 className="text-xl font-heading font-bold mb-2">No briefing yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Click &ldquo;Generate Briefing&rdquo; to get your AI-powered daily business snapshot
              with insights from finances, inventory, staff, and equipment.
            </p>
            <Button
              onClick={handleGenerate}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/25"
            >
              <Sparkles size={16} className="mr-2" />
              Generate Your First Briefing
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles size={12} className="text-purple-400" />
        Powered by Z.AI GLM · UMHackathon 2026
      </div>
    </div>
  );
}
