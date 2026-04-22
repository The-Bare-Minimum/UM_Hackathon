'use client';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DashboardNavbarProps {
  businessName?: string;
}

export function DashboardNavbar({ businessName = 'My Business' }: DashboardNavbarProps) {
  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-8">
      <div className="flex items-center gap-4 flex-1">
        <h2 className="font-heading font-semibold text-lg truncate max-w-[200px]">
          {businessName}
        </h2>
        <div className="hidden md:flex relative max-w-sm w-full ml-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search analytics, staff, tools..." 
            className="pl-10 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-safety-orange"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative hover:text-safety-orange">
          <Bell size={20} />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-safety-orange" />
        </Button>
        <div className="h-8 w-[1px] bg-border mx-2" />
        <div className="flex items-center gap-3 mr-4">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-xs font-bold leading-none">Admin User</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tighter mt-1">Super Admin</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
            <User size={18} />
          </div>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
