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
import { api } from '@/lib/api';
import { Loader2, Plus, X, CheckCircle, User } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  const [form, setForm] = useState({
    name: '',
    bio: '',
    city: '',
    state: '',
    hourly_rate: '',
    avatar_url: '',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        city: user.city || '',
        state: user.state || '',
        hourly_rate: user.hourly_rate ? String(user.hourly_rate) : '',
        avatar_url: user.avatar_url || '',
      });
      setSkills(user.skills || []);
    }
  }, [user]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput('');
  };

  const removeSkill = (skill: string) => setSkills((prev) => prev.filter((s) => s !== skill));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await api.auth.updateProfile({
        name: form.name.trim(),
        bio: form.bio.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
        avatar_url: form.avatar_url.trim() || undefined,
        skills,
      });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-primary hover:underline text-sm">← Back to Dashboard</Link>
          <h1 className="text-3xl font-bold text-foreground mt-3">Edit Profile</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg text-sm">{error}</div>
          )}
          {success && (
            <div className="p-4 bg-green-100 text-green-800 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Profile updated successfully!
            </div>
          )}

          {/* Avatar */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Photo</h2>
            <div className="flex items-center gap-5">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1.5">Avatar URL</label>
                <Input
                  placeholder="https://example.com/avatar.jpg"
                  value={form.avatar_url}
                  onChange={(e) => setForm((p) => ({ ...p, avatar_url: e.target.value }))}
                />
              </div>
            </div>
          </Card>

          {/* Basic Info */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Tell clients and employers about yourself..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Mumbai"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">State</label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                  placeholder="e.g. Maharashtra"
                />
              </div>
            </div>

            {user.role === 'worker' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Hourly Rate (₹/hr)</label>
                <Input
                  type="number"
                  value={form.hourly_rate}
                  onChange={(e) => setForm((p) => ({ ...p, hourly_rate: e.target.value }))}
                  placeholder="e.g. 500"
                />
              </div>
            )}
          </Card>

          {/* Skills (workers only) */}
          {user.role === 'worker' && (
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold text-foreground">Skills</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill (e.g. React)"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                />
                <Button type="button" variant="outline" className="bg-transparent shrink-0" onClick={addSkill}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)} className="hover:text-destructive ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Card>
          )}

          <div className="flex gap-3 pb-8">
            <Button type="submit" className="flex-1 h-12 font-semibold" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Save Changes'}
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
