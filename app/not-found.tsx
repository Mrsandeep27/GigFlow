import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <span className="text-primary-foreground font-bold text-3xl">G</span>
      </div>
      <h1 className="text-6xl font-bold text-foreground mb-3">404</h1>
      <p className="text-xl text-muted-foreground mb-2">Page not found</p>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link href="/">
          <Button className="px-6">Go Home</Button>
        </Link>
        <Link href="/jobs">
          <Button variant="outline" className="bg-transparent px-6">Browse Jobs</Button>
        </Link>
      </div>
    </div>
  );
}
