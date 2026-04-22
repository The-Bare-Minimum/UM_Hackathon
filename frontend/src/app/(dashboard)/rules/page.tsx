'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Scale,
  Sparkles,
  Loader2,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Send,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchRules,
  parseRule,
  createRule,
  deleteRule,
  toggleRule,
  type BusinessRule,
} from '@/lib/api-client';
import { toast } from 'sonner';

const ruleTypeConfig = {
  alert: {
    color: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    gradient: 'from-amber-500/10 to-yellow-500/5',
    border: 'border-amber-500/25',
    icon: AlertTriangle,
    label: 'Alert',
  },
  behavior: {
    color: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    gradient: 'from-blue-500/10 to-cyan-500/5',
    border: 'border-blue-500/25',
    icon: Zap,
    label: 'Behavior',
  },
  constraint: {
    color: 'bg-red-500/15 text-red-600 border-red-500/30',
    gradient: 'from-red-500/10 to-rose-500/5',
    border: 'border-red-500/25',
    icon: ShieldCheck,
    label: 'Constraint',
  },
};

const severityConfig: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
};

interface ParsedRule {
  rule_text: string;
  rule_type: 'alert' | 'behavior' | 'constraint';
  trigger_condition: string;
  action: string;
  applies_to: string[];
  severity: string;
  success?: boolean;
}

export default function RulesPage() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedRule | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadRules = useCallback(async () => {
    try {
      const result = await fetchRules('default');
      setRules(result?.data || []);
    } catch {
      console.error('Failed to load rules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    setParsedPreview(null);
    try {
      const result = await parseRule('default', inputText.trim());
      if (result?.data?.success !== false) {
        setParsedPreview(result?.data);
      } else {
        toast.error('Failed to parse rule — try rephrasing');
      }
    } catch {
      toast.error('AI service unavailable');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!parsedPreview) return;
    setIsSaving(true);
    try {
      await createRule('default', {
        rule_text: parsedPreview.rule_text || inputText,
        rule_type: parsedPreview.rule_type || 'behavior',
        trigger_condition: parsedPreview.trigger_condition,
        action: parsedPreview.action,
        applies_to: parsedPreview.applies_to,
        severity: parsedPreview.severity || 'info',
      } as Partial<BusinessRule>);
      toast.success('Rule saved successfully');
      setParsedPreview(null);
      setInputText('');
      await loadRules();
    } catch {
      toast.error('Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (ruleId: string, currentActive: boolean) => {
    try {
      await toggleRule('default', ruleId, !currentActive);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, is_active: !currentActive } : r))
      );
    } catch {
      toast.error('Failed to toggle rule');
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteRule('default', ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      toast.success('Rule deleted');
    } catch {
      toast.error('Failed to delete rule');
    }
  };

  const examples = [
    'Alert me when any ingredient stock falls below 20%',
    'Never recommend removing Nasi Lemak from the menu',
    'Flag any single expense above RM 500',
    'Always prioritize reducing waste over profit in recommendations',
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-heading font-extrabold tracking-tight flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 shadow-lg shadow-violet-500/10">
            <Scale size={24} className="text-violet-500" />
          </div>
          Business Rules
        </h1>
        <p className="text-muted-foreground mt-2">
          Define rules in plain English — AI will follow them across all features.
        </p>
      </div>

      {/* Rule Input */}
      <Card className="border-violet-500/20 bg-gradient-to-br from-card via-card to-violet-500/[0.03] shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-full -mr-24 -mt-24 pointer-events-none" />
        <CardHeader>
          <CardTitle className="text-lg font-heading font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-violet-500" />
            Create New Rule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          <div className="flex gap-3">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a business rule in plain English..."
              className="flex-1 h-12 text-base border-violet-500/20 focus-visible:ring-violet-500/30"
              onKeyDown={(e) => e.key === 'Enter' && handleParse()}
            />
            <Button
              onClick={handleParse}
              disabled={isParsing || !inputText.trim()}
              className="h-12 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-violet-500/25"
            >
              {isParsing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              <span className="ml-2">{isParsing ? 'Parsing...' : 'Parse with AI'}</span>
            </Button>
          </div>

          {/* Example suggestions */}
          <div className="flex flex-wrap gap-2">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setInputText(ex)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-muted-foreground hover:bg-violet-500/10 hover:text-violet-600 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parsed Preview */}
      {parsedPreview && (
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.05] to-transparent shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-heading font-bold flex items-center gap-2">
              <Eye size={18} className="text-emerald-500" />
              Parsed Rule Preview
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParsedPreview(null)}
                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
              >
                <X size={14} className="mr-1" /> Discard
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
                Confirm & Save
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Type</p>
                <Badge variant="outline" className={ruleTypeConfig[parsedPreview.rule_type as keyof typeof ruleTypeConfig]?.color || 'bg-muted'}>
                  {parsedPreview.rule_type}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Severity</p>
                <Badge variant="outline" className={severityConfig[parsedPreview.severity] || 'bg-muted'}>
                  {parsedPreview.severity}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Applies To</p>
                <div className="flex flex-wrap gap-1">
                  {(parsedPreview.applies_to || []).map((m: string) => (
                    <Badge key={m} variant="outline" className="text-[10px] bg-muted/50">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="col-span-2 md:col-span-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Rule</p>
                <p className="text-sm font-medium">{parsedPreview.rule_text}</p>
              </div>
              {parsedPreview.trigger_condition && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Trigger</p>
                  <p className="text-xs text-muted-foreground">{parsedPreview.trigger_condition}</p>
                </div>
              )}
              {parsedPreview.action && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Action</p>
                  <p className="text-xs text-muted-foreground">{parsedPreview.action}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      <div>
        <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
          Active Rules
          <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20 font-mono">
            {rules.length}
          </Badge>
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-violet-500/10 blur-2xl scale-150" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                  <Scale size={28} className="text-violet-400" />
                </div>
              </div>
              <h3 className="text-lg font-heading font-bold mb-1">No rules yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Type a rule above in plain English and AI will classify it for you.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => {
              const cfg = ruleTypeConfig[rule.rule_type as keyof typeof ruleTypeConfig] || ruleTypeConfig.behavior;
              const IconComp = cfg.icon;
              return (
                <Card
                  key={rule.id}
                  className={cn(
                    'transition-all duration-300 hover:shadow-lg group',
                    cfg.border,
                    !rule.is_active && 'opacity-50 grayscale'
                  )}
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br shrink-0', cfg.gradient)}>
                      <IconComp size={18} className={cfg.color.split(' ')[1]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-relaxed">{rule.rule_text}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px]', cfg.color)}>
                          {cfg.label}
                        </Badge>
                        <Badge variant="outline" className={cn('text-[10px]', severityConfig[rule.severity])}>
                          {rule.severity}
                        </Badge>
                        {(rule.applies_to || []).map((m: string) => (
                          <Badge key={m} variant="outline" className="text-[10px] bg-muted/50">
                            {m}
                          </Badge>
                        ))}
                        {rule.triggered_count > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20 font-mono">
                            Triggered {rule.triggered_count}×
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggle(rule.id, rule.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rule.id)}
                        className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles size={12} className="text-violet-400" />
        Rules are injected into all AI prompts · Powered by Z.AI GLM
      </div>
    </div>
  );
}
