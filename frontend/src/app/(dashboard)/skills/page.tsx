'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Brain,
  Trash2,
  ChefHat,
  TrendingUp,
  Users,
  BarChart3,
  Eye,
  Sparkles,
  Lock,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchSkills, toggleSkill, type AISkill } from '@/lib/api-client';
import { toast } from 'sonner';

const skillIcons: Record<string, { icon: React.ElementType; gradient: string; color: string }> = {
  'Daily Briefing': { icon: Brain, gradient: 'from-purple-500/20 to-indigo-500/20', color: 'text-purple-500' },
  'Waste Prediction': { icon: Trash2, gradient: 'from-red-500/20 to-orange-500/20', color: 'text-red-500' },
  'Menu Advisor': { icon: ChefHat, gradient: 'from-amber-400/20 to-orange-500/20', color: 'text-amber-500' },
  'Anomaly Detection': { icon: TrendingUp, gradient: 'from-emerald-500/20 to-teal-500/20', color: 'text-emerald-500' },
  'Staff Optimizer': { icon: Users, gradient: 'from-blue-500/20 to-cyan-500/20', color: 'text-blue-500' },
  'Demand Forecasting': { icon: BarChart3, gradient: 'from-violet-500/20 to-purple-500/20', color: 'text-violet-500' },
  'Competitor Awareness': { icon: Eye, gradient: 'from-pink-500/20 to-rose-500/20', color: 'text-pink-500' },
};

const categoryColors: Record<string, string> = {
  insights: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  inventory: 'bg-red-500/10 text-red-600 border-red-500/20',
  menu: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  finance: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  staff: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  advanced: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Not yet used';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Used just now';
  if (hours < 24) return `Last used: ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Last used: ${days}d ago`;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<AISkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initializingSkill, setInitializingSkill] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    try {
      const result = await fetchSkills('default');
      setSkills(result?.data || []);
    } catch {
      console.error('Failed to load skills');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleToggle = async (skill: AISkill) => {
    const newEnabled = !skill.is_enabled;

    // Optimistic update
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, is_enabled: newEnabled } : s))
    );

    // Show initializing animation for first-time enable
    if (newEnabled && !skill.last_used) {
      setInitializingSkill(skill.skill_name);
      setTimeout(() => setInitializingSkill(null), 2500);
    }

    try {
      await toggleSkill('default', skill.skill_name, newEnabled);
      toast.success(`${skill.skill_name} ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch {
      // Revert on failure
      setSkills((prev) =>
        prev.map((s) => (s.id === skill.id ? { ...s, is_enabled: !newEnabled } : s))
      );
      toast.error('Failed to toggle skill');
    }
  };

  const enabledCount = skills.filter((s) => s.is_enabled).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-lg shadow-cyan-500/10">
              <Cpu size={24} className="text-cyan-500" />
            </div>
            AI Skills
          </h1>
          <p className="text-muted-foreground mt-2">
            Toggle which AI capabilities are active. Disabled skills save API tokens.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 font-bold px-4 py-1.5 text-sm">
            {enabledCount} of {skills.length} Active
          </Badge>
        </div>
      </div>

      {/* Skills Grid */}
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => {
            const config = skillIcons[skill.skill_name] || { icon: Sparkles, gradient: 'from-gray-500/20 to-gray-500/10', color: 'text-gray-500' };
            const Icon = config.icon;
            const isInit = initializingSkill === skill.skill_name;

            return (
              <Card
                key={skill.id}
                className={cn(
                  'relative overflow-hidden transition-all duration-500 group',
                  skill.is_enabled
                    ? 'border-border/60 hover:shadow-xl hover:-translate-y-1'
                    : 'border-border/30 bg-muted/20',
                  isInit && 'ring-2 ring-cyan-500/50 shadow-xl shadow-cyan-500/20'
                )}
              >
                {/* Initializing overlay */}
                {isInit && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 animate-pulse z-10 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                      <Sparkles size={16} className="text-cyan-500 animate-spin" />
                      <span className="text-sm font-bold text-cyan-600">Initializing...</span>
                    </div>
                  </div>
                )}

                {/* Disabled overlay */}
                {!skill.is_enabled && !isInit && (
                  <div className="absolute top-3 right-3 z-10">
                    <Lock size={14} className="text-muted-foreground/50" />
                  </div>
                )}

                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br transition-all',
                      config.gradient,
                      !skill.is_enabled && 'grayscale opacity-40'
                    )}>
                      <Icon size={22} className={cn(config.color, !skill.is_enabled && 'opacity-50')} />
                    </div>
                    <Switch
                      checked={skill.is_enabled}
                      onCheckedChange={() => handleToggle(skill)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-blue-600"
                    />
                  </div>

                  <div>
                    <h3 className={cn(
                      'font-heading font-bold text-lg mb-1 transition-colors',
                      !skill.is_enabled && 'text-muted-foreground'
                    )}>
                      {skill.skill_name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {skill.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-semibold',
                        categoryColors[skill.category] || 'bg-muted'
                      )}
                    >
                      {skill.category}
                    </Badge>
                    <span className={cn(
                      'text-[10px] font-mono',
                      skill.is_enabled ? 'text-muted-foreground' : 'text-muted-foreground/50'
                    )}>
                      {timeAgo(skill.last_used)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles size={12} className="text-cyan-400" />
        Disabled skills skip Z.AI API calls to save tokens · UMHackathon 2026
      </div>
    </div>
  );
}
