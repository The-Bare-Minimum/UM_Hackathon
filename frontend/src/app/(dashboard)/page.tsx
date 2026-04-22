'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  BellRing,
  RefreshCw,
  Brain,
  Trash2,
  ChefHat,
  ArrowRight,
  Sparkles,
  Scale,
  Cpu,
  Wrench,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  fetchDashboardStats,
  fetchAllAIInsightPreviews,
  fetchHealthScore,
  fetchTriggeredRules,
  fetchEnabledSkills,
  fetchAssets,
  type DashboardStats,
} from '@/lib/api-client';

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aiPreviews, setAiPreviews] = useState<{ briefing: unknown; waste: unknown; menu: unknown }>({
    briefing: null, waste: null, menu: null,
  });
  const [healthScore, setHealthScore] = useState<{ score: number; breakdown: Record<string, { score: number }>; tip: string } | null>(null);
  const [triggeredRules, setTriggeredRules] = useState<{ total_triggered: number }>({ total_triggered: 0 });
  const [skillsStatus, setSkillsStatus] = useState<{ enabled: number; total: number }>({ enabled: 0, total: 7 });
  const [assetAlerts, setAssetAlerts] = useState<{ overdue: number; dueSoon: number }>({ overdue: 0, dueSoon: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [showRulesBanner, setShowRulesBanner] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [dashboardStats, previews, health, rules, skills, assets] = await Promise.all([
        fetchDashboardStats(),
        fetchAllAIInsightPreviews('default').catch(() => ({ briefing: null, waste: null, menu: null })),
        fetchHealthScore('default').catch(() => ({ data: null })),
        fetchTriggeredRules('default').catch(() => ({ data: { total_triggered: 0 } })),
        fetchEnabledSkills('default').catch(() => ({ data: [] })),
        fetchAssets('default').catch(() => ({ data: [] })),
      ]);

      setStats(dashboardStats);
      setAiPreviews(previews);
      if (health?.data) setHealthScore(health.data);
      if (rules?.data) setTriggeredRules(rules.data);

      const enabledList = skills?.data || [];
      setSkillsStatus({ enabled: Array.isArray(enabledList) ? enabledList.length : 0, total: 7 });

      const assetList = assets?.data || [];
      if (Array.isArray(assetList)) {
        setAssetAlerts({
          overdue: assetList.filter((a: Record<string, unknown>) => a.computed_status === 'overdue' || a.status === 'overdue').length,
          dueSoon: assetList.filter((a: Record<string, unknown>) => a.computed_status === 'due_soon' || a.status === 'due_soon').length,
        });
      }

      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadDashboardData();
      setIsLoading(false);
    };
    init();
  }, [loadDashboardData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const formatCurrency = (amount: number) =>
    `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const timeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const totalExpenses = stats ? formatCurrency(stats.totalExpenses) : '—';
  const lowStockCount = stats?.lowStockCount ?? '—';
  const renewalCount = stats?.upcomingRenewals ?? '—';
  const budgetPct = stats ? `${stats.budgetUtilization}%` : '—';

  const scoreColor = !healthScore ? 'text-muted-foreground' :
    healthScore.score >= 75 ? 'text-emerald-500' :
    healthScore.score >= 50 ? 'text-amber-500' : 'text-red-500';

  const scoreRingColor = !healthScore ? 'stroke-muted' :
    healthScore.score >= 75 ? 'stroke-emerald-500' :
    healthScore.score >= 50 ? 'stroke-amber-500' : 'stroke-red-500';

  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (circumference * (healthScore?.score ?? 0)) / 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">Your AI-powered business overview.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-safety-orange/50 hover:bg-safety-orange/10 hover:text-safety-orange"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={14} className={cn('mr-1.5', isRefreshing && 'animate-spin')} />
          {isRefreshing ? 'Refreshing...' : `Refresh · ${timeAgo(lastRefreshed)}`}
        </Button>
      </div>

      {/* Triggered Rules Banner */}
      {triggeredRules.total_triggered > 0 && showRulesBanner && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15">
              <Scale size={18} className="text-amber-500" />
            </div>
            <p className="text-sm font-medium">
              ⚠️ <strong>{triggeredRules.total_triggered}</strong> business rule{triggeredRules.total_triggered > 1 ? 's' : ''} triggered
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/rules">
              <Button variant="outline" size="sm" className="text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                View Details
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setShowRulesBanner(false)} className="h-7 w-7">
              <X size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Top Row: Health Score + Quick Stats */}
      <div className="grid gap-6 md:grid-cols-5">
        {/* Health Score Gauge */}
        <Card className="md:col-span-1 border-none shadow-2xl bg-gradient-to-br from-card to-muted/20 overflow-hidden">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="relative w-28 h-28 mb-3">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="stroke-muted/30" />
                <circle
                  cx="50" cy="50" r="45" fill="none" strokeWidth="6"
                  strokeLinecap="round"
                  className={cn('transition-all duration-1000', scoreRingColor)}
                  strokeDasharray={circumference}
                  strokeDashoffset={isLoading ? circumference : dashOffset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn('text-2xl font-heading font-extrabold', scoreColor)}>
                  {isLoading ? '—' : healthScore?.score ?? '—'}
                </span>
              </div>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Health Score</p>
            {healthScore?.tip && (
              <p className="text-[10px] text-muted-foreground text-center mt-2 leading-tight">{healthScore.tip}</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="md:col-span-4 grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard title="Expenses" value={totalExpenses} trend="up" icon={DollarSign} desc="This month" loading={isLoading} />
          <StatCard title="Low Stock" value={String(lowStockCount)} trend="warning" icon={AlertTriangle} desc="Items below threshold" highlight loading={isLoading} />
          <StatCard title="Renewals" value={String(renewalCount)} trend="neutral" icon={Calendar} desc="Due within 30 days" loading={isLoading} />
          <StatCard title="Budget" value={budgetPct} trend="down" icon={TrendingUp} desc="Utilization" loading={isLoading} />
        </div>
      </div>

      {/* AI Insights Row */}
      <div>
        <h2 className="text-2xl font-heading font-bold flex items-center gap-2 mb-4">
          <Sparkles size={22} className="text-safety-orange fill-safety-orange/30" />
          AI Insights
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <AIInsightCard title="Daily Briefing" description="AI-powered business snapshot" icon={Brain}
            gradient="from-purple-500/20 to-indigo-500/20" iconColor="text-purple-500" borderColor="border-purple-500/20"
            href="/ai-briefing" hasData={!!(aiPreviews.briefing)} lastGenerated={(aiPreviews.briefing as Record<string, string>)?.generated_at} loading={isLoading} />
          <AIInsightCard title="Waste Prediction" description="Expiring ingredient alerts" icon={Trash2}
            gradient="from-red-500/20 to-orange-500/20" iconColor="text-red-500" borderColor="border-red-500/20"
            href="/waste-prediction" hasData={!!(aiPreviews.waste)} lastGenerated={(aiPreviews.waste as Record<string, string>)?.generated_at} loading={isLoading} />
          <AIInsightCard title="Menu Advisor" description="Seasonal menu optimization" icon={ChefHat}
            gradient="from-amber-400/20 to-orange-500/20" iconColor="text-amber-500" borderColor="border-amber-500/20"
            href="/menu-advisor" hasData={!!(aiPreviews.menu)} lastGenerated={(aiPreviews.menu as Record<string, string>)?.generated_at} loading={isLoading} />
        </div>
      </div>

      {/* Asset Alerts + Active Rules Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Asset Alerts */}
        <Card className="border-muted/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-heading font-bold flex items-center gap-2">
              <Wrench size={18} className="text-teal-500" /> Asset Status
            </CardTitle>
            <Link href="/assets">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-teal-500">
                View All <ArrowRight size={12} className="ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assetAlerts.overdue > 0 && (
                <div className="p-3 rounded-lg bg-red-500/[0.05] border border-red-500/20 flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                  <p className="text-sm"><strong className="text-red-600">{assetAlerts.overdue}</strong> overdue maintenance/renewal{assetAlerts.overdue > 1 ? 's' : ''}</p>
                </div>
              )}
              {assetAlerts.dueSoon > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/20 flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                  <p className="text-sm"><strong className="text-amber-600">{assetAlerts.dueSoon}</strong> due within 30 days</p>
                </div>
              )}
              {assetAlerts.overdue === 0 && assetAlerts.dueSoon === 0 && (
                <div className="p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="text-sm text-muted-foreground">All assets are up to date</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Summary */}
        <Card className="border-muted/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-heading font-bold flex items-center gap-2">
              <BellRing size={18} className="text-primary" /> Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats && stats.lowStockItems.length > 0 ? (
                stats.lowStockItems.slice(0, 4).map((item, idx) => (
                  <AlertItem key={idx} type={item.quantity === 0 ? 'critical' : 'warning'} title={`Low Stock: ${item.name}`} time="Now" message={`Qty: ${item.quantity} (reorder at ${item.reorder_level})`} />
                ))
              ) : (
                <AlertItem type="info" title="No Alerts" time="Now" message={isLoading ? 'Checking...' : 'All inventory levels healthy.'} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skills Status Bar */}
      <Link href="/skills">
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/10 hover:shadow-lg hover:border-cyan-500/20 transition-all duration-300 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
              <Cpu size={16} className="text-cyan-500" />
            </div>
            <span className="text-sm font-medium">
              <strong className="text-cyan-600">{skillsStatus.enabled}</strong> of <strong>{skillsStatus.total}</strong> AI Skills active
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress bar */}
            <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-700"
                style={{ width: `${(skillsStatus.enabled / skillsStatus.total) * 100}%` }}
              />
            </div>
            <ArrowRight size={14} className="text-muted-foreground group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </Link>
    </div>
  );
}


function AIInsightCard({ title, description, icon: Icon, gradient, iconColor, borderColor, href, hasData, lastGenerated, loading }: {
  title: string; description: string; icon: React.ElementType; gradient: string; iconColor: string; borderColor: string;
  href: string; hasData: boolean; lastGenerated?: string; loading: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={cn('relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer group h-full', borderColor)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br', gradient)}>
            <Icon size={20} className={iconColor} />
          </div>
          <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </CardHeader>
        <CardContent>
          <h3 className="font-heading font-bold text-lg mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{description}</p>
          {loading ? (
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          ) : hasData ? (
            <p className="text-[11px] text-muted-foreground font-mono">
              Last: {new Date(lastGenerated!).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          ) : (
            <p className="text-[11px] text-safety-orange font-semibold">Click to generate →</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}


function StatCard({ title, value, trend, icon: Icon, desc, highlight = false, loading = false }: {
  title: string; value: string; trend: 'up' | 'down' | 'warning' | 'neutral'; icon: React.ElementType; desc: string; highlight?: boolean; loading?: boolean;
}) {
  return (
    <Card className={cn(
      'relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 duration-300',
      highlight ? 'border-safety-orange/50 ring-1 ring-safety-orange/20' : 'border-muted/50'
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg', highlight ? 'bg-safety-orange/10 text-safety-orange' : 'bg-primary/5 text-primary')}>
          <Icon size={18} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold font-heading', loading && 'animate-pulse')}>{value}</div>
        <div className="flex items-center mt-1 text-xs">
          <span className={cn(
            'flex items-center gap-0.5 font-bold mr-2',
            trend === 'up' && 'text-green-500',
            trend === 'down' && 'text-red-500',
            trend === 'warning' && 'text-safety-orange',
            trend === 'neutral' && 'text-blue-500'
          )}>
            {trend === 'up' && <ArrowUpRight size={12} />}
            {trend === 'down' && <ArrowDownRight size={12} />}
          </span>
          <span className="text-muted-foreground line-clamp-1">{desc}</span>
        </div>
      </CardContent>
    </Card>
  );
}


function AlertItem({ type, title, time, message }: { type: 'critical' | 'warning' | 'info'; title: string; time: string; message: string }) {
  return (
    <div className="flex gap-3 group">
      <div className={cn(
        'mt-1.5 h-2 w-2 rounded-full shrink-0',
        type === 'critical' && 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
        type === 'warning' && 'bg-safety-orange shadow-[0_0_8px_rgba(255,102,0,0.5)]',
        type === 'info' && 'bg-blue-500'
      )} />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold group-hover:text-safety-orange transition-colors">{title}</p>
          <span className="text-[10px] text-muted-foreground">{time}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-snug">{message}</p>
      </div>
    </div>
  );
}
