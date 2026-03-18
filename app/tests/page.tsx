'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { api, SkillTest, TestQuestion, TestSubmission } from '@/lib/api';
import {
  ArrowLeft, Plus, Loader2, CheckCircle2, XCircle, Clock,
  ChevronRight, Trophy, Target, BookOpen, X, Trash2,
  BarChart2, Users, Check, AlertCircle,
} from 'lucide-react';

/* ── Employer: Create Test ──────────────────────────────────── */
interface QuestionDraft {
  question: string;
  options: string[];
  correct_answer: number;
  points: number;
}

interface CreateForm {
  title: string;
  description: string;
  duration_minutes: string;
  passing_score: string;
  gig_id: string;
}

const BLANK_Q: QuestionDraft = { question: '', options: ['', '', '', ''], correct_answer: 0, points: 10 };
const BLANK_F: CreateForm = { title: '', description: '', duration_minutes: '30', passing_score: '70', gig_id: '' };

function CreateTestPanel({ onCreated }: { onCreated: (t: SkillTest) => void }) {
  const [form, setForm] = useState<CreateForm>(BLANK_F);
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ ...BLANK_Q }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => setQuestions(qs => [...qs, { ...BLANK_Q, options: ['', '', '', ''] }]);
  const removeQuestion = (i: number) => setQuestions(qs => qs.filter((_, idx) => idx !== i));

  const setQ = (i: number, field: keyof QuestionDraft, val: any) =>
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: val } : q));

  const setOpt = (qi: number, oi: number, val: string) =>
    setQuestions(qs => qs.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? val : o) } : q));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Test title is required'); return; }
    if (questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      setError('All questions and options must be filled'); return;
    }
    setSaving(true); setError('');
    try {
      const test = await api.tests.create({
        ...form,
        duration_minutes: Number(form.duration_minutes),
        passing_score: Number(form.passing_score),
        gig_id: form.gig_id ? Number(form.gig_id) : undefined,
        questions,
      });
      onCreated(test);
      setForm(BLANK_F);
      setQuestions([{ ...BLANK_Q }]);
    } catch (e: any) {
      setError(e?.message || 'Failed to create test');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 mb-6 shadow-sm">
      <h2 className="font-bold text-foreground text-base mb-5">Create Skill Test</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Test Title *</label>
            <Input placeholder="e.g. React Fundamentals" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-9" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Linked Job ID (optional)</label>
            <Input placeholder="Job ID to auto-shortlist" value={form.gig_id}
              onChange={e => setForm(f => ({ ...f, gig_id: e.target.value }))} className="h-9" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Description</label>
          <textarea rows={2} placeholder="What will be tested? What skills are evaluated?"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block flex items-center gap-1"><Clock className="w-3 h-3" /> Duration (minutes)</label>
            <Input type="number" value={form.duration_minutes}
              onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} className="h-9" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block flex items-center gap-1"><Trophy className="w-3 h-3" /> Passing Score (%)</label>
            <Input type="number" min={0} max={100} value={form.passing_score}
              onChange={e => setForm(f => ({ ...f, passing_score: e.target.value }))} className="h-9" />
          </div>
        </div>

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-foreground">Questions ({questions.length})</label>
            <Button size="sm" variant="outline" onClick={addQuestion} className="h-7 text-xs gap-1 bg-transparent">
              <Plus className="w-3 h-3" /> Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="border border-border rounded-lg p-4 bg-muted/20">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-1">{qi + 1}</span>
                  <div className="flex-1 space-y-2.5">
                    <Input placeholder="Question text..." value={q.question}
                      onChange={e => setQ(qi, 'question', e.target.value)} className="h-8 text-sm" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            onClick={() => setQ(qi, 'correct_answer', oi)}
                            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${q.correct_answer === oi ? 'border-emerald-500 bg-emerald-500' : 'border-border hover:border-primary'}`}
                          >
                            {q.correct_answer === oi && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <Input placeholder={`Option ${oi + 1}`} value={opt}
                            onChange={e => setOpt(qi, oi, e.target.value)} className="h-7 text-xs" />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Points:</span>
                      <Input type="number" value={q.points} onChange={e => setQ(qi, 'points', Number(e.target.value))}
                        className="h-6 w-16 text-xs text-center" />
                      <span className="text-[10px] text-emerald-600">← select correct answer</span>
                    </div>
                  </div>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(qi)} className="text-muted-foreground hover:text-destructive mt-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Publish Test
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Worker: Take Test ──────────────────────────────────────── */
function TakeTest({ test, onDone }: { test: SkillTest; onDone: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; correct: number; total: number } | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.tests.submit(test.id, { answers });
      setResult(res);
    } catch {}
    setSubmitting(false);
  };

  if (result) {
    return (
      <div className="bg-white border border-border rounded-xl p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {result.passed
            ? <Trophy className="w-10 h-10 text-emerald-500" />
            : <XCircle className="w-10 h-10 text-destructive" />}
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-1">{result.score}%</h3>
        <p className={`font-semibold text-sm mb-2 ${result.passed ? 'text-emerald-600' : 'text-destructive'}`}>
          {result.passed ? 'Passed!' : 'Not Passed'}
        </p>
        <p className="text-sm text-muted-foreground mb-1">{result.correct} / {result.total} correct</p>
        {result.passed && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-sm text-emerald-700 font-medium">
            You may be auto-shortlisted for the linked position!
          </div>
        )}
        <Button onClick={onDone} className="mt-6 gap-2">
          <ChevronRight className="w-4 h-4" /> Back to Tests
        </Button>
      </div>
    );
  }

  const questions = test.questions ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-5">
        <h2 className="font-bold text-foreground text-lg mb-1">{test.title}</h2>
        {test.description && <p className="text-sm text-muted-foreground mb-2">{test.description}</p>}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{test.duration_minutes} min</span>
          <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />Pass at {test.passing_score}%</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{questions.length} questions</span>
        </div>
      </div>

      {questions.map((q: TestQuestion, qi: number) => (
        <div key={q.id} className="bg-white border border-border rounded-xl p-5">
          <p className="font-semibold text-foreground text-sm mb-3">{qi + 1}. {q.question}</p>
          <div className="space-y-2">
            {(q.options ?? []).map((opt: string, oi: number) => (
              <label key={oi} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                answers[q.id] === oi
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}>
                <input type="radio" name={`q${q.id}`} value={oi}
                  checked={answers[q.id] === oi}
                  onChange={() => setAnswers(a => ({ ...a, [q.id]: oi }))}
                  className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  answers[q.id] === oi ? 'border-primary' : 'border-border'
                }`}>
                  {answers[q.id] === oi && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="text-sm text-foreground">{opt}</span>
              </label>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">{q.points} pts</div>
        </div>
      ))}

      <div className="flex justify-between items-center pt-2">
        <p className="text-sm text-muted-foreground">{Object.keys(answers).length} / {questions.length} answered</p>
        <Button onClick={handleSubmit} disabled={submitting || Object.keys(answers).length < questions.length} className="gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Submit Test
        </Button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function TestsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [takingTest, setTakingTest] = useState<SkillTest | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (!user) return;
    api.tests.list().then(setTests).catch(() => {}).finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  const isEmployer = user.role === 'employer';

  const handleCreated = (t: SkillTest) => {
    setTests(prev => [t, ...prev]);
    setShowCreate(false);
  };

  if (takingTest) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <Button variant="ghost" size="sm" onClick={() => setTakingTest(null)} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground h-8">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <TakeTest test={takingTest} onDone={() => setTakingTest(null)} />
        </div>
      </div>
    );
  }

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
              <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-1">Validate Skills</p>
              <h1 className="text-3xl font-bold text-foreground">Skill Tests</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isEmployer ? 'Create tests to filter and auto-shortlist top candidates' : 'Take tests to prove your skills and get shortlisted faster'}
              </p>
            </div>
            {isEmployer && (
              <Button onClick={() => setShowCreate(v => !v)} className="gap-2 shrink-0">
                {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showCreate ? 'Cancel' : 'Create Test'}
              </Button>
            )}
          </div>
        </div>

        {/* Employer Create Form */}
        {isEmployer && showCreate && <CreateTestPanel onCreated={handleCreated} />}

        {/* Tests list */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : tests.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-20 text-center bg-white">
            <div className="w-14 h-14 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground mb-1">No skill tests available</p>
            <p className="text-sm text-muted-foreground">
              {isEmployer ? 'Create your first test to start evaluating candidates' : 'Tests created by employers will appear here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tests.map(t => (
              <div key={t.id} className="bg-white border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-foreground text-sm mb-0.5">{t.title}</h3>
                    {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><Trophy className="w-3 h-3" />Pass: {t.passing_score}%</span>
                  {t.question_count != null && (
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{t.question_count} questions</span>
                  )}
                  {t.submission_count != null && isEmployer && (
                    <span className="flex items-center gap-1 ml-auto"><Users className="w-3 h-3" />{t.submission_count} taken</span>
                  )}
                </div>

                {isEmployer ? (
                  <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                    <span className="text-[10px] text-muted-foreground">
                      {t.pass_count ?? 0} passed · {t.fail_count ?? 0} failed
                    </span>
                    <Button size="sm" variant="outline" className="ml-auto h-7 text-xs bg-transparent gap-1"
                      onClick={async () => {
                        try {
                          const results = await api.tests.results(t.id);
                          alert(`Test Results:\n${results.length === 0 ? 'No submissions yet' : results.map((r: TestSubmission) => `${r.name}: ${r.score}% ${r.passed ? '✓' : '✗'}`).join('\n')}`);
                        } catch { alert('Failed to load results'); }
                      }}>
                      <BarChart2 className="w-3 h-3" /> Results
                    </Button>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-border/60">
                    {t.user_submitted ? (
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold flex items-center gap-1 ${t.user_passed ? 'text-emerald-600' : 'text-destructive'}`}>
                          {t.user_passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {t.user_passed ? `Passed · ${t.user_score}%` : `Score: ${t.user_score}%`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Completed</span>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setTakingTest(t)} className="w-full h-8 text-xs gap-1.5">
                        <Target className="w-3.5 h-3.5" /> Take Test
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
