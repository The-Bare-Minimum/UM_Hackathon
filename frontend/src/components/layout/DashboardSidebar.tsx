'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Carrot,
  Receipt,
  Users,
  Wrench,
  Utensils,
  Brain,
  Settings,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ChefHat,
  Scale,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ElementType;
  group?: string;
}

const sidebarItems: SidebarItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Ingredients', href: '/ingredients', icon: Carrot },
  { title: 'Budget & Expenses', href: '/expenses', icon: Receipt },
  { title: 'Staff & Salary', href: '/staff', icon: Users },
  { title: 'Assets', href: '/assets', icon: Wrench },
  { title: 'Menu Items', href: '/menu-items', icon: Utensils },
  // AI Features group
  { title: 'AI Briefing', href: '/ai-briefing', icon: Brain, group: 'AI Insights' },
  { title: 'Waste Prediction', href: '/waste-prediction', icon: Trash2, group: 'AI Insights' },
  { title: 'Menu Advisor', href: '/menu-advisor', icon: ChefHat, group: 'AI Insights' },
  // Customization group
  { title: 'Business Rules', href: '/rules', icon: Scale, group: 'Customization' },
  { title: 'AI Skills', href: '/skills', icon: Cpu, group: 'Customization' },
];

export function DashboardSidebar() {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();

  // Group items for rendering
  let lastGroup: string | undefined = undefined;

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen flex flex-col border-r bg-card transition-all duration-300 ease-in-out z-20',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b bg-muted/30">
        {!isCollapsed && (
          <span className="font-heading font-bold text-xl tracking-tight text-primary">
            SME<span className="text-safety-orange">.</span>AI
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn('ml-auto text-muted-foreground hover:text-safety-orange')}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          // Render group label when group changes
          const showGroupLabel = item.group && item.group !== lastGroup && !isCollapsed;
          if (item.group) lastGroup = item.group;

          return (
            <React.Fragment key={item.href}>
              {showGroupLabel && (
                <div className="pt-4 pb-1 px-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-safety-orange/70">
                    {item.group}
                  </p>
                </div>
              )}
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  isCollapsed && 'justify-center px-0'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-primary-foreground' : 'group-hover:text-safety-orange',
                    !isCollapsed && 'mr-3'
                  )}
                />
                {!isCollapsed && <span className="font-medium">{item.title}</span>}
                
                {!isCollapsed && (
                  <div className="ml-auto flex items-center gap-2">
                    {item.group === 'AI Insights' && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] py-0 px-1.5 h-4.5 font-bold tracking-tighter transition-colors",
                          isActive 
                            ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/40" 
                            : "bg-safety-orange/10 text-safety-orange border-safety-orange/30"
                        )}
                      >
                        AI
                      </Badge>
                    )}
                    {isActive && (
                      <div className="h-1.5 w-1.5 rounded-full bg-safety-orange animate-pulse" />
                    )}
                  </div>
                )}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="p-4 border-t bg-muted/10">
        {!isCollapsed ? (
          <div className="rounded-xl border border-safety-orange/20 bg-safety-orange/5 p-4">
            <p className="text-xs font-bold text-safety-orange uppercase tracking-widest mb-1">AI Status</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Z.AI GLM operational. Rules & Skills active.
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-2 w-2 rounded-full bg-safety-orange animate-ping" />
          </div>
        )}
      </div>
    </aside>
  );
}
