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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { fetchDashboardStats, fetchAIBriefings, fetchAllAIInsightPreviews, type DashboardStats } from '@/lib/api-client';

interface AIBriefing {
  id: string;
  briefing_date: string;
  content: string;
  generated_at: string;
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [briefings, setBriefings] = useState<AIBriefing[]>([]);
  const [aiPreviews, setAiPreviews] = useState<{ briefing: any; waste: any; menu: any }>({
    briefing: null,
    waste: null,
    menu: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const [dashboardStats, aiBriefings, previews] = await Promise.all([
        fetchDashboardStats(),
        fetchAIBriefings().catch(() => []),
        fetchAllAIInsightPreviews('default').catch(() => ({ briefing: null, waste: null, menu: null })),
      ]);
      setStats(dashboardStats);
      setBriefings(aiBriefings);
      setAiPreviews(previews);
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
    `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const timeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Derive display values from fetched stats (with fallbacks for loading state)
  const totalExpenses = stats ? formatCurrency(stats.totalExpenses) : '—';
  const lowStockCount = stats?.lowStockCount ?? '—';
  const lowStockLabel = stats
    ? `${stats.lowStockItems.filter((i) => i.quantity === 0).length} critical`
    : '—';
  const renewalCount = stats?.upcomingRenewals ?? '—';
  const renewalLabel = stats?.nextRenewalDays !== null
    ? `Next in ${stats?.nextRenewalDays} days`
    : 'None upcoming';
  const budgetPct = stats ? `${stats.budgetUtilization}%` : '—';

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-heading font-extrabold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Monitor your business performance and AI insights.</p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Expenses" 
          value={totalExpenses} 
          change={stats ? '+this month' : '—'} 
          trend="up" 
          icon={DollarSign}
          description="Total spend this month"
          loading={isLoading}
        />
        <StatCard 
          title="Low Stock Alerts" 
          value={String(lowStockCount)} 
          change={lowStockLabel} 
          trend="warning" 
          icon={AlertTriangle}
          description="Ingredients below threshold"
          highlight
          loading={isLoading}
        />
        <StatCard 
          title="Upcoming Renewals" 
          value={String(renewalCount)} 
          change={renewalLabel} 
          trend="neutral" 
          icon={Calendar}
          description="Machine & software subs"
          loading={isLoading}
        />
        <StatCard 
          title="Monthly Budget" 
          value={budgetPct} 
          change={stats ? `~${formatCurrency(stats.totalExpenses)} spent` : '—'} 
          trend="down" 
          icon={TrendingUp}
          description="Budget utilization"
          loading={isLoading}
        />
      </div>

      {/* AI Insights Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Sparkles size={22} className="text-safety-orange fill-safety-orange/30" />
            AI Insights
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="border-safety-orange/50 hover:bg-safety-orange/10 hover:text-safety-orange"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={cn('mr-1.5', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Daily Briefing Preview */}
          <AIInsightCard
            title="Daily Briefing"
            description="AI-powered business snapshot with risks and recommendations"
            icon={Brain}
            gradient="from-purple-500/20 to-indigo-500/20"
            iconColor="text-purple-500"
            borderColor="border-purple-500/20"
            href="/ai-briefing"
            hasData={!!aiPreviews.briefing}
            lastGenerated={aiPreviews.briefing?.generated_at}
            loading={isLoading}
          />

          {/* Waste Prediction Preview */}
          <AIInsightCard
            title="Waste Prediction"
            description="Expiring ingredients with AI waste prevention suggestions"
            icon={Trash2}
            gradient="from-red-500/20 to-orange-500/20"
            iconColor="text-red-500"
            borderColor="border-red-500/20"
            href="/waste-prediction"
            hasData={!!aiPreviews.waste}
            lastGenerated={aiPreviews.waste?.generated_at}
            loading={isLoading}
          />

          {/* Menu Advisor Preview */}
          <AIInsightCard
            title="Menu Advisor"
            description="Seasonal menu optimization based on sales and availability"
            icon={ChefHat}
            gradient="from-amber-400/20 to-orange-500/20"
            iconColor="text-amber-500"
            borderColor="border-amber-500/20"
            href="/menu-advisor"
            hasData={!!aiPreviews.menu}
            lastGenerated={aiPreviews.menu?.generated_at}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 border-none shadow-2xl bg-gradient-to-br from-card to-muted/20 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Zap size={120} className="text-safety-orange" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold font-heading flex items-center gap-2">
                <Zap size={24} className="text-safety-orange fill-safety-orange" />
                Quick Summary
              </CardTitle>
              <p className="text-sm text-muted-foreground italic">
                {lastRefreshed
                  ? `Refreshed ${timeAgo(lastRefreshed)} based on latest records.`
                  : 'Loading data...'}
              </p>
            </div>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="space-y-4">
              {stats && stats.lowStockItems.length > 0 ? (
                stats.lowStockItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-muted/40 border-l-4 border-safety-orange">
                    <p className="text-sm leading-relaxed">
                      <strong>Low Stock:</strong> {item.name} — {item.quantity} left (reorder at {item.reorder_level})
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-lg bg-muted/40 border-l-4 border-emerald-500">
                  <p className="text-sm leading-relaxed">
                    <strong>All Good:</strong> {isLoading ? 'Checking inventory...' : 'Inventory levels are healthy. No immediate alerts.'}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Link href="/ai-briefing">
                <Button variant="link" className="text-safety-orange font-bold">View Full AI Briefing &rarr;</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-muted/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold font-heading flex items-center gap-2">
              <BellRing size={20} className="text-primary" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats && stats.lowStockItems.length > 0 ? (
                stats.lowStockItems.slice(0, 4).map((item, idx) => (
                  <AlertItem
                    key={idx}
                    type={item.quantity === 0 ? 'critical' : 'warning'}
                    title={`Low Stock: ${item.name}`}
                    time="Now"
                    message={`Current qty: ${item.quantity} (reorder at ${item.reorder_level})`}
                  />
                ))
              ) : (
                <>
                  <AlertItem 
                    type="info" 
                    title="No Low Stock Alerts" 
                    time="Now" 
                    message={isLoading ? 'Checking inventory...' : 'All inventory levels are healthy.'} 
                  />
                </>
              )}
            </div>
            <Button variant="secondary" className="w-full mt-6">View All Activity</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AIInsightCard({
  title,
  description,
  icon: Icon,
  gradient,
  iconColor,
  borderColor,
  href,
  hasData,
  lastGenerated,
  loading,
}: {
  title: string;
  description: string;
  icon: any;
  gradient: string;
  iconColor: string;
  borderColor: string;
  href: string;
  hasData: boolean;
  lastGenerated?: string;
  loading: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={cn(
        'relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer group h-full',
        borderColor,
      )}>
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

function StatCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  description,
  highlight = false,
  loading = false,
}: { 
  title: string; 
  value: string; 
  change: string; 
  trend: 'up' | 'down' | 'warning' | 'neutral'; 
  icon: any;
  description: string;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 duration-300",
      highlight ? "border-safety-orange/50 ring-1 ring-safety-orange/20" : "border-muted/50"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn(
          "p-2 rounded-lg",
          highlight ? "bg-safety-orange/10 text-safety-orange" : "bg-primary/5 text-primary"
        )}>
          <Icon size={18} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold font-heading", loading && "animate-pulse")}>
          {value}
        </div>
        <div className="flex items-center mt-1 text-xs">
          <span className={cn(
            "flex items-center gap-0.5 font-bold mr-2",
            trend === 'up' && "text-green-500",
            trend === 'down' && "text-red-500",
            trend === 'warning' && "text-safety-orange",
            trend === 'neutral' && "text-blue-500"
          )}>
            {trend === 'up' && <ArrowUpRight size={12} />}
            {trend === 'down' && <ArrowDownRight size={12} />}
            {change}
          </span>
          <span className="text-muted-foreground line-clamp-1">{description}</span>
        </div>
      </CardContent>
      {highlight && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-safety-orange/5 rounded-full -mr-8 -mt-8" />
      )}
    </Card>
  );
}

function AlertItem({ 
  type, 
  title, 
  time, 
  message 
}: { 
  type: 'critical' | 'warning' | 'info'; 
  title: string; 
  time: string; 
  message: string 
}) {
  return (
    <div className="flex gap-3 group">
      <div className={cn(
        "mt-1.5 h-2 w-2 rounded-full shrink-0",
        type === 'critical' && "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
        type === 'warning' && "bg-safety-orange shadow-[0_0_8px_rgba(255,102,0,0.5)]",
        type === 'info' && "bg-blue-500"
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
