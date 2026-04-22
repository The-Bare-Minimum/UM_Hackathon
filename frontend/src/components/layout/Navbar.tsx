import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="border-b bg-background px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-lg text-primary">
          SME Manager
        </Link>
        <div className="hidden md:flex gap-4">
          <Link href="/inventory" className="text-sm text-muted-foreground hover:text-foreground">
            Inventory
          </Link>
          <Link href="/finances" className="text-sm text-muted-foreground hover:text-foreground">
            Finances
          </Link>
          <Link href="/staff" className="text-sm text-muted-foreground hover:text-foreground">
            Staff
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* We would place a user avatar or login button here */}
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
          A
        </div>
      </div>
    </nav>
  );
}
