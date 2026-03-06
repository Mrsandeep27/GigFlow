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
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm tracking-tight">G</span>
            </div>
            <span className="font-bold text-base text-foreground tracking-tight">GigFlow</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {(!user || user.role === 'worker') && (
              <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Find Work
              </Link>
            )}
            {(!user || user.role === 'employer') && (
              <Link href="/freelancers" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Find Talent
              </Link>
            )}
            {user?.role === 'employer' && (
              <Link href="/jobs/post" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Post a Job
              </Link>
            )}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {!isLoading && (
              user ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div className="leading-tight">
                      <div className="font-medium text-foreground text-sm">{user.name.split(' ')[0]}</div>
                      <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="w-px h-5 bg-border" />
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="text-sm font-medium gap-1.5 h-8">
                      <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sm font-medium gap-1.5 h-8 bg-transparent text-muted-foreground hover:text-foreground"
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
                    <Button size="sm" className="text-sm font-semibold h-8 px-4">
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
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {(!user || user.role === 'worker') && (
              <Link href="/jobs" className="block px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors" onClick={() => setIsOpen(false)}>
                Find Work
              </Link>
            )}
            {(!user || user.role === 'employer') && (
              <Link href="/freelancers" className="block px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors" onClick={() => setIsOpen(false)}>
                Find Talent
              </Link>
            )}
            {user?.role === 'employer' && (
              <Link href="/jobs/post" className="block px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors" onClick={() => setIsOpen(false)}>
                Post a Job
              </Link>
            )}
            <div className="flex gap-2 pt-3 pb-1 px-1">
              {user ? (
                <>
                  <Link href="/dashboard" className="flex-1" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full text-sm bg-transparent">Dashboard</Button>
                  </Link>
                  <Button variant="outline" className="flex-1 text-sm bg-transparent" onClick={() => { handleLogout(); setIsOpen(false); }}>
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
