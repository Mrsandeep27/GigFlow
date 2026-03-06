'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { api, Category } from '@/lib/api';
import { Loader2, Plus, X } from 'lucide-react';

const JOB_TYPES = [
  { value: 'gig', label: 'Gig (Short-term)' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'contract', label: 'Contract' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'internship', label: 'Internship' },
];

const BUDGET_TYPES = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'negotiable', label: 'Negotiable' },
];

export default function PostJobPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    job_type: 'gig',
    budget_type: 'fixed',
    budget_min: '',
    budget_max: '',
    city: '',
    state: '',
    is_remote: false,
    skills_required: [] as string[],
    deadline: '',
  });

  useEffect(() => {
    api.gigs.categories().then(setCategories).catch(() => {});
  }, []);

  // Redirect if not employer
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'employer')) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const set = (key: string, value: string | boolean | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills_required.includes(s)) {
      set('skills_required', [...form.skills_required, s]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) =>
    set('skills_required', form.skills_required.filter((s) => s !== skill));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.description.trim()) { setError('Description is required'); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: form.category_id ? Number(form.category_id) : undefined,
        job_type: form.job_type,
        budget_type: form.budget_type,
        budget_min: form.budget_min ? Number(form.budget_min) : undefined,
        budget_max: form.budget_max ? Number(form.budget_max) : undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        is_remote: form.is_remote,
        skills_required: form.skills_required.length > 0 ? form.skills_required : undefined,
        deadline: form.deadline || undefined,
      };
      const res = await api.gigs.create(payload);
      router.push(`/jobs/${res.gigId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post job');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );

  if (!user || user.role !== 'employer') return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-primary hover:underline text-sm">← Back to Dashboard</Link>
          <h1 className="text-3xl font-bold text-foreground mt-3">Post a New Job</h1>
          <p className="text-muted-foreground mt-1">Fill in the details to attract the best freelancers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg text-sm">{error}</div>
          )}

          {/* Basic Info */}
          <Card className="p-6 space-y-5">
            <h2 className="font-semibold text-foreground text-lg">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Job Title *</label>
              <Input
                placeholder="e.g. React Developer for E-commerce Website"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Description *</label>
              <Textarea
                placeholder="Describe the job in detail — requirements, responsibilities, what you're looking for..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) => set('category_id', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Job Type</label>
                <select
                  value={form.job_type}
                  onChange={(e) => set('job_type', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {JOB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Budget */}
          <Card className="p-6 space-y-5">
            <h2 className="font-semibold text-foreground text-lg">Budget</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Budget Type</label>
              <div className="flex gap-3 flex-wrap">
                {BUDGET_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('budget_type', t.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      form.budget_type === t.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {form.budget_type !== 'negotiable' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {form.budget_type === 'hourly' ? 'Min Rate (₹/hr)' : 'Min Budget (₹)'}
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 5000"
                    value={form.budget_min}
                    onChange={(e) => set('budget_min', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {form.budget_type === 'hourly' ? 'Max Rate (₹/hr)' : 'Max Budget (₹)'}
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 15000"
                    value={form.budget_max}
                    onChange={(e) => set('budget_max', e.target.value)}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Location */}
          <Card className="p-6 space-y-5">
            <h2 className="font-semibold text-foreground text-lg">Location</h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set('is_remote', !form.is_remote)}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.is_remote ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${form.is_remote ? 'left-5' : 'left-1'}`} />
              </div>
              <span className="text-sm font-medium text-foreground">Remote work allowed</span>
            </label>

            {!form.is_remote && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
                  <Input placeholder="e.g. Mumbai" value={form.city} onChange={(e) => set('city', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">State</label>
                  <Input placeholder="e.g. Maharashtra" value={form.state} onChange={(e) => set('state', e.target.value)} />
                </div>
              </div>
            )}
          </Card>

          {/* Skills & Deadline */}
          <Card className="p-6 space-y-5">
            <h2 className="font-semibold text-foreground text-lg">Skills & Timeline</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Required Skills</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="e.g. React, Node.js"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                />
                <Button type="button" variant="outline" className="bg-transparent shrink-0" onClick={addSkill}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.skills_required.map((skill) => (
                    <span key={skill} className="flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Application Deadline</label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => set('deadline', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </Card>

          <div className="flex gap-3 pb-8">
            <Button type="submit" className="flex-1 h-12 text-base font-semibold" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Posting...</> : 'Post Job'}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="outline" className="h-12 px-6 bg-transparent">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
