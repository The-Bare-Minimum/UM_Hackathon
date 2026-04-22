'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Wrench,
  CreditCard,
  RefreshCw,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  FileKey,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchAssets,
  markAssetServiced,
  analyzeAssets,
  fetchMonthlyCost,
  createAsset,
  deleteAsset,
  type Asset,
} from '@/lib/api-client';
import { toast } from 'sonner';

const statusConfig = {
  active: { label: 'OK', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', dot: 'bg-emerald-500' },
  due_soon: { label: 'Due Soon', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', dot: 'bg-amber-500' },
  overdue: { label: 'Overdue', color: 'bg-red-500/15 text-red-600 border-red-500/30', dot: 'bg-red-500' },
  inactive: { label: 'Inactive', color: 'bg-gray-500/15 text-gray-500 border-gray-500/30', dot: 'bg-gray-400' },
};

const typeIcons: Record<string, React.ElementType> = {
  machine: Wrench,
  subscription: CreditCard,
  license: FileKey,
};

function getDueDate(asset: Asset): string | null {
  return asset.next_maintenance || asset.renewal_date || null;
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'machines' | 'subscriptions'>('machines');
  const [monthlyCost, setMonthlyCost] = useState(0);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState<{ name: string; asset_type: 'machine' | 'subscription' | 'license'; cost_per_renewal: number; notes: string }>({ name: '', asset_type: 'machine', cost_per_renewal: 0, notes: '' });

  const loadAssets = useCallback(async () => {
    try {
      const [assetsRes, costRes] = await Promise.all([
        fetchAssets('default'),
        fetchMonthlyCost('default'),
      ]);
      setAssets(assetsRes?.data || []);
      setMonthlyCost(costRes?.data?.monthly_cost || 0);
    } catch {
      console.error('Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleServiceAsset = async (assetId: string) => {
    try {
      await markAssetServiced('default', assetId);
      toast.success('Marked as serviced/renewed');
      await loadAssets();
    } catch {
      toast.error('Failed to mark serviced');
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeAssets('default');
      setAnalysis(result?.data || null);
      setShowAnalysis(true);
    } catch {
      toast.error('Failed to analyze assets');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddAsset = async () => {
    if (!newAsset.name.trim()) return;
    try {
      await createAsset('default', newAsset);
      toast.success('Asset added');
      setShowAddForm(false);
      setNewAsset({ name: '', asset_type: 'machine', cost_per_renewal: 0, notes: '' });
      await loadAssets();
    } catch {
      toast.error('Failed to add asset');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await deleteAsset('default', id);
      toast.success('Asset removed');
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const machines = assets.filter((a) => a.asset_type === 'machine');
  const subs = assets.filter((a) => a.asset_type === 'subscription' || a.asset_type === 'license');
  const displayed = activeTab === 'machines' ? machines : subs;
  const overdueCount = assets.filter((a) => (a.computed_status || a.status) === 'overdue').length;
  const dueSoonCount = assets.filter((a) => (a.computed_status || a.status) === 'due_soon').length;

  // Build 90-day timeline
  const timelineItems = assets
    .map((a) => {
      const due = getDueDate(a);
      const days = daysUntil(due);
      return { ...a, dueDate: due, daysLeft: days };
    })
    .filter((a) => a.daysLeft !== null && a.daysLeft >= -7 && a.daysLeft <= 90)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  const parsedAnalysis = analysis?.parsed_analysis as Record<string, unknown> | null | undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 shadow-lg shadow-teal-500/10">
              <Wrench size={24} className="text-teal-500" />
            </div>
            Asset Tracker
          </h1>
          <p className="text-muted-foreground mt-2">
            Machines, subscriptions, and licenses — all in one place.
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
            className="border-teal-500/30 hover:bg-teal-500/10"
          >
            <Plus size={16} className="mr-1" /> Add Asset
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold shadow-lg shadow-teal-500/25"
          >
            {isAnalyzing ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Sparkles size={16} className="mr-2" />}
            {isAnalyzing ? 'Analysing...' : 'Analyse Assets'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/15">
              <DollarSign size={20} className="text-teal-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">RM {monthlyCost.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Monthly Cost</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
              <Wrench size={20} className="text-foreground" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">{assets.length}</p>
              <p className="text-xs text-muted-foreground">Total Assets</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(overdueCount > 0 && 'border-red-500/20')}>
          <CardContent className="p-5 flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', overdueCount > 0 ? 'bg-red-500/15' : 'bg-muted/50')}>
              <AlertTriangle size={20} className={overdueCount > 0 ? 'text-red-500' : 'text-muted-foreground'} />
            </div>
            <div>
              <p className={cn('text-xl font-heading font-bold', overdueCount > 0 && 'text-red-600')}>{overdueCount}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(dueSoonCount > 0 && 'border-amber-500/20')}>
          <CardContent className="p-5 flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', dueSoonCount > 0 ? 'bg-amber-500/15' : 'bg-muted/50')}>
              <Clock size={20} className={dueSoonCount > 0 ? 'text-amber-500' : 'text-muted-foreground'} />
            </div>
            <div>
              <p className={cn('text-xl font-heading font-bold', dueSoonCount > 0 && 'text-amber-600')}>{dueSoonCount}</p>
              <p className="text-xs text-muted-foreground">Due Soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Asset Form */}
      {showAddForm && (
        <Card className="border-teal-500/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-heading font-bold">New Asset</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
              <X size={16} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input placeholder="Asset name" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} />
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newAsset.asset_type}
                onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value as 'machine' | 'subscription' | 'license' })}
              >
                <option value="machine">Machine</option>
                <option value="subscription">Subscription</option>
                <option value="license">License</option>
              </select>
              <Input type="number" placeholder="Cost (RM)" value={newAsset.cost_per_renewal || ''} onChange={(e) => setNewAsset({ ...newAsset, cost_per_renewal: Number(e.target.value) })} />
              <Input placeholder="Notes" value={newAsset.notes} onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })} />
            </div>
            <Button onClick={handleAddAsset} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
              <Plus size={16} className="mr-1" /> Add
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 90-Day Timeline */}
      {timelineItems.length > 0 && (
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              Next 90 Days Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
              <div className="flex gap-4 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: 'thin' }}>
                {timelineItems.map((item) => {
                  const st = statusConfig[(item.computed_status || item.status) as keyof typeof statusConfig] || statusConfig.active;
                  return (
                    <div key={item.id} className="flex flex-col items-center shrink-0 relative pt-2">
                      <div className={cn('w-3 h-3 rounded-full border-2 border-background z-10', st.dot)} />
                      <div className={cn('mt-3 p-3 rounded-lg border text-center min-w-[120px]', st.color)}>
                        <p className="text-xs font-bold truncate">{item.name}</p>
                        <p className="text-[10px] mt-0.5 opacity-80">{formatDueDate(item.dueDate)}</p>
                        <p className={cn('text-[10px] font-mono font-bold mt-1', (item.daysLeft ?? 0) <= 0 ? 'text-red-600' : '')}>
                          {(item.daysLeft ?? 0) <= 0 ? 'OVERDUE' : `${item.daysLeft}d left`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-0">
        <button
          onClick={() => setActiveTab('machines')}
          className={cn(
            'px-4 py-2.5 text-sm font-bold rounded-t-lg transition-all border-b-2',
            activeTab === 'machines'
              ? 'border-teal-500 text-teal-600 bg-teal-500/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Wrench size={14} className="inline mr-1.5 -mt-0.5" />
          Machines ({machines.length})
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={cn(
            'px-4 py-2.5 text-sm font-bold rounded-t-lg transition-all border-b-2',
            activeTab === 'subscriptions'
              ? 'border-teal-500 text-teal-600 bg-teal-500/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <CreditCard size={14} className="inline mr-1.5 -mt-0.5" />
          Subscriptions & Licenses ({subs.length})
        </button>
      </div>

      {/* Asset Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wrench size={32} className="text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No {activeTab} found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayed.map((asset) => {
            const st = statusConfig[(asset.computed_status || asset.status) as keyof typeof statusConfig] || statusConfig.active;
            const Icon = typeIcons[asset.asset_type] || Wrench;
            const due = getDueDate(asset);
            const days = daysUntil(due);

            return (
              <Card key={asset.id} className="group transition-all hover:shadow-lg duration-300 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                        <Icon size={18} className="text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold">{asset.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] bg-muted/50">{asset.asset_type}</Badge>
                          <Badge variant="outline" className={cn('text-[10px]', st.color)}>
                            <div className={cn('w-1.5 h-1.5 rounded-full mr-1', st.dot)} />
                            {st.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono">RM {Number(asset.cost_per_renewal || 0).toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground">{asset.notes}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="text-xs text-muted-foreground">
                      {due ? (
                        <>
                          <span className="font-medium">Next due:</span> {formatDueDate(due)}
                          {days !== null && (
                            <span className={cn('ml-1 font-mono font-bold', days <= 0 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : '')}>
                              ({days <= 0 ? 'OVERDUE' : `${days}d`})
                            </span>
                          )}
                        </>
                      ) : (
                        'No due date set'
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleServiceAsset(asset.id)}
                        className="text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-semibold"
                      >
                        <CheckCircle2 size={12} className="mr-1" />
                        {asset.asset_type === 'machine' ? 'Serviced' : 'Renewed'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI Analysis Panel */}
      {analysis && (
        <Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/[0.03] to-transparent shadow-lg">
          <CardHeader>
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="flex items-center justify-between w-full text-left"
            >
              <CardTitle className="text-lg font-heading font-bold flex items-center gap-2">
                <Sparkles size={18} className="text-teal-500" />
                AI Asset Analysis
              </CardTitle>
              {showAnalysis ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </CardHeader>
          {showAnalysis && (
            <CardContent className="space-y-4 animate-in fade-in duration-300">
              {parsedAnalysis ? (
                <AnalysisSections data={parsedAnalysis} />
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                  {String((analysis as Record<string, unknown>)?.response || 'No analysis available')}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles size={12} className="text-teal-400" />
        Asset tracking with AI maintenance predictions · UMHackathon 2026
      </div>
    </div>
  );
}

function AnalysisSections({ data }: { data: Record<string, unknown> }) {
  function renderList(items: unknown) {
    if (Array.isArray(items)) {
      return items.map((item, i) => (
        <p key={i}>• {typeof item === 'string' ? item : JSON.stringify(item)}</p>
      ));
    }
    return <p>{JSON.stringify(items)}</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Boolean(data.immediate_actions) && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <h4 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Immediate Actions
          </h4>
          <div className="text-xs text-muted-foreground space-y-1">
            {renderList(data.immediate_actions)}
          </div>
        </div>
      )}
      {Boolean(data.upcoming_schedule) && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <h4 className="text-sm font-bold text-amber-600 mb-2 flex items-center gap-1.5">
            <Clock size={14} /> Upcoming Schedule
          </h4>
          <div className="text-xs text-muted-foreground space-y-1">
            {renderList(data.upcoming_schedule)}
          </div>
        </div>
      )}
      {Boolean(data.cost_tips) && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <h4 className="text-sm font-bold text-emerald-600 mb-2 flex items-center gap-1.5">
            <DollarSign size={14} /> Cost Tips
          </h4>
          <div className="text-xs text-muted-foreground space-y-1">
            {renderList(data.cost_tips)}
          </div>
        </div>
      )}
      {Boolean(data.maintenance_tip) && (
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <h4 className="text-sm font-bold text-blue-600 mb-2 flex items-center gap-1.5">
            <Wrench size={14} /> Maintenance Tip
          </h4>
          <p className="text-xs text-muted-foreground">{String(data.maintenance_tip)}</p>
        </div>
      )}
    </div>
  );
}
