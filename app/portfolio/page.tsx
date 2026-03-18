'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { api, PortfolioItem } from '@/lib/api';
import {
  Plus, Trash2, ExternalLink, Github, Loader2,
  Briefcase, Image, Video, FileText, ArrowLeft, Edit3,
  Globe, X, Check,
} from 'lucide-react';

const TYPE_OPTS = [
  { value: 'project',   label: 'Project',    icon: Briefcase },
  { value: 'case_study',label: 'Case Study', icon: FileText },
  { value: 'design',    label: 'Design',     icon: Image },
  { value: 'video',     label: 'Video',      icon: Video },
] as const;

type PortfolioType = typeof TYPE_OPTS[number]['value'];

interface FormState {
  title: string;
  description: string;
  type: PortfolioType;
  live_url: string;
  github_url: string;
  thumbnail_url: string;
  tags: string;
}

const EMPTY: FormState = {
  title: '', description: '', type: 'project',
  live_url: '', github_url: '', thumbnail_url: '', tags: '',
};

export default function PortfolioPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (!user) return;
    api.portfolio.mine().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      const item = await api.portfolio.add(payload);
      setItems(prev => [item, ...prev]);
      setForm(EMPTY);
      setShowForm(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this portfolio item? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.portfolio.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {}
    setDeletingId(null);
  };

  const typeIcon = (t: string) => {
    const opt = TYPE_OPTS.find(o => o.value === t);
    const Icon = opt?.icon ?? Briefcase;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 mb-4 text-muted-foreground hover:text-foreground h-8">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Button>
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-1">Showcase</p>
              <h1 className="text-3xl font-bold text-foreground">My Portfolio</h1>
              <p className="text-muted-foreground text-sm mt-1">Projects, case studies, and work samples</p>
            </div>
            <Button onClick={() => { setShowForm(true); setError(''); }} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </div>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-white border border-border rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground text-base">New Portfolio Item</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY); setError(''); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {TYPE_OPTS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          form.type === opt.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-foreground hover:border-primary hover:text-primary'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" /> {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Title *</label>
                  <Input placeholder="e.g. E-commerce Dashboard" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Tags (comma-separated)</label>
                  <Input placeholder="React, TypeScript, Figma" value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="h-9" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the project, your role, and the impact..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block flex items-center gap-1"><Globe className="w-3 h-3" /> Live URL</label>
                  <Input placeholder="https://..." value={form.live_url}
                    onChange={e => setForm(f => ({ ...f, live_url: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block flex items-center gap-1"><Github className="w-3 h-3" /> GitHub URL</label>
                  <Input placeholder="https://github.com/..." value={form.github_url}
                    onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block flex items-center gap-1"><Image className="w-3 h-3" /> Thumbnail URL</label>
                  <Input placeholder="https://..." value={form.thumbnail_url}
                    onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} className="h-9" />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY); }} className="h-9 bg-transparent">Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="h-9 gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Item
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio grid */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-24 text-center bg-white">
            <div className="w-14 h-14 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground mb-1">No portfolio items yet</p>
            <p className="text-sm text-muted-foreground mb-5">Showcase your projects to stand out to employers</p>
            <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Your First Item
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {items.map(item => (
              <div key={item.id} className="bg-white border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all group">
                {/* Thumbnail */}
                {item.thumbnail_url ? (
                  <div className="h-44 overflow-hidden bg-muted">
                    <img src={item.thumbnail_url} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-primary/8 to-accent/8 flex items-center justify-center">
                    {typeIcon(item.type)}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-wide uppercase text-muted-foreground">
                          {TYPE_OPTS.find(o => o.value === item.type)?.label ?? item.type}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-sm line-clamp-1">{item.title}</h3>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                  )}

                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="text-[10px] bg-secondary border border-border/60 px-2 py-0.5 rounded-full font-medium">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-3 border-t border-border/60">
                    {item.live_url && (
                      <a href={item.live_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                        <ExternalLink className="w-3 h-3" /> Live
                      </a>
                    )}
                    {item.github_url && (
                      <a href={item.github_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium">
                        <Github className="w-3 h-3" /> Code
                      </a>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
