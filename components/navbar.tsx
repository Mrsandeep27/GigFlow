'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { Menu, X, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-white/98 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
              <span className="text-white font-bold text-sm tracking-tight">G</span>
            </div>
            <span className="font-bold text-base text-foreground tracking-tight">GigFlow</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {(!user || user.role === 'worker') && (
              <Link href="/jobs" className="relative px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                Find Work
                <span className="absolute bottom-1 left-3.5 right-3.5 h-px bg-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
              </Link>
            )}
            {(!user || user.role === 'employer') && (
              <Link href="/freelancers" className="relative px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                Find Talent
                <span className="absolute bottom-1 left-3.5 right-3.5 h-px bg-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
              </Link>
            )}
            {user?.role === 'employer' && (
              <Link href="/jobs/post" className="relative px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                Post a Job
                <span className="absolute bottom-1 left-3.5 right-3.5 h-px bg-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
              </Link>
            )}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-2">
            {!isLoading && (
              user ? (
                <>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors cursor-default">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-[11px] shrink-0">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div className="leading-tight">
                      <div className="font-semibold text-foreground text-sm">{user.name.split(' ')[0]}</div>
                      <div className="text-[10px] text-muted-foreground capitalize tracking-wide">{user.role}</div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
                  </div>
                  <div className="w-px h-5 bg-border mx-1" />
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="text-sm font-medium gap-1.5 h-8 hover:bg-primary/8 hover:text-primary transition-colors">
                      <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sm font-medium gap-1.5 h-8 bg-transparent text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm" className="text-sm font-medium h-8 text-muted-foreground hover:text-foreground">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm" className="text-sm font-semibold h-8 px-4 shadow-sm hover:shadow-md transition-shadow">
                      Get Started
                    </Button>
                  </Link>
                </>
              )
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden border-t border-border/60 py-3 space-y-0.5">
            {(!user || user.role === 'worker') && (
              <Link href="/jobs" className="flex items-center px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 rounded-lg transition-colors" onClick={() => setIsOpen(false)}>
                Find Work
              </Link>
            )}
            {(!user || user.role === 'employer') && (
              <Link href="/freelancers" className="flex items-center px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 rounded-lg transition-colors" onClick={() => setIsOpen(false)}>
                Find Talent
              </Link>
            )}
            {user?.role === 'employer' && (
              <Link href="/jobs/post" className="flex items-center px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 rounded-lg transition-colors" onClick={() => setIsOpen(false)}>
                Post a Job
              </Link>
            )}
            <div className="flex gap-2 pt-3 pb-1 px-1">
              {user ? (
                <>
                  <Link href="/dashboard" className="flex-1" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full text-sm bg-transparent">Dashboard</Button>
                  </Link>
                  <Button variant="outline" className="flex-1 text-sm bg-transparent text-destructive hover:border-destructive/30" onClick={() => { handleLogout(); setIsOpen(false); }}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="flex-1" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full text-sm bg-transparent">Log In</Button>
                  </Link>
                  <Link href="/auth/signup" className="flex-1" onClick={() => setIsOpen(false)}>
                    <Button className="w-full text-sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
