'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { api, ResumeAnalysis } from '@/lib/api';
import {
  Loader2, ArrowLeft, Zap, CheckCircle2, XCircle,
  AlertCircle, TrendingUp, Star, Lightbulb, Code,
  Upload, FileText,
} from 'lucide-react';

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
        <circle
          cx="50" cy="50" r={radius}
          stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="text-3xl font-bold" style={{ color, marginTop: '-72px', zIndex: 1 }}>{score}</div>
      <div className="text-xs text-muted-foreground mt-16">ATS Score</div>
    </div>
  );
}

export default function ResumeAnalyzerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (!user) return;
    // Load latest analysis if exists
    api.resume.latest().then(setAnalysis).catch(() => {}).finally(() => setChecking(false));
  }, [user, authLoading, router]);

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  const handleAnalyze = async () => {
    if (text.trim().length < 100) { setError('Please paste at least 100 characters of your resume.'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await api.resume.analyze(text);
      setAnalysis(result);
      setText('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { setError('File too large. Max 5MB.'); return; }

    setUploading(true);
    setError('');
    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        setText(await file.text());
      } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(arrayBuffer);
        const xmlFile = zip.file('word/document.xml');
        if (!xmlFile) throw new Error('Invalid .docx file');
        const xmlText = await xmlFile.async('text');
        // Extract text between <w:t> tags (Word paragraph text nodes)
        const matches = xmlText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        const plainText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim();
        if (!plainText) throw new Error('No text found in document');
        setText(plainText);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Load pdf.js from CDN (avoids Next.js bundling issues)
        await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        if (!fullText.trim()) throw new Error('No text extracted from PDF');
        setText(fullText.trim());
      } else {
        setError('Unsupported file type. Upload PDF, DOCX, or TXT.');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err?.message || 'Failed to read file. Try pasting the text instead.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Load pdf.js from CDN to avoid Next.js bundling issues
  function loadPdfJs(): Promise<void> {
    if ((window as any).pdfjsLib) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
      script.type = 'module';
      // Fallback: use non-module version
      const scriptFallback = document.createElement('script');
      scriptFallback.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      scriptFallback.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      scriptFallback.onerror = () => reject(new Error('Failed to load PDF parser'));
      document.head.appendChild(scriptFallback);
    });
  }

  const levelColor = (l: string) => ({ junior: 'text-blue-500', mid: 'text-indigo-500', senior: 'text-emerald-500', lead: 'text-amber-500' }[l] || 'text-muted-foreground');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4 text-muted-foreground h-8">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Button>
        </Link>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-1">Feature 4</p>
            <h1 className="text-3xl font-bold text-foreground">AI Resume Analyzer</h1>
            <p className="text-muted-foreground text-sm mt-1">Get your ATS score, missing keywords, and actionable improvement tips powered by AI</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/8 rounded-lg border border-primary/15">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Powered by Claude AI</span>
          </div>
        </div>

        {/* Input section */}
        {!checking && (
          <div className="bg-white border border-border rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-foreground mb-1">{analysis ? 'Analyze Again' : 'Paste Your Resume'}</h2>
            <p className="text-xs text-muted-foreground mb-3">Upload a file or paste your resume text below.</p>

            {/* File upload */}
            <label className="flex items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-5 mb-4 cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all group">
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
              {uploading ? (
                <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm text-primary font-medium">Reading file...</span></>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <span className="text-sm font-medium text-foreground">Upload PDF, DOCX, or TXT</span>
                    <span className="text-xs text-muted-foreground block">Max 5MB — text will be extracted automatically</span>
                  </div>
                </>
              )}
            </label>

            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or paste text</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <textarea
              className="w-full border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              rows={10}
              placeholder="Paste your resume text here...&#10;&#10;Example:&#10;John Doe | john@email.com | +91 9876543210&#10;&#10;EXPERIENCE&#10;Senior Frontend Developer at Acme Corp (2021-2024)&#10;• Built React applications serving 100K+ users...&#10;&#10;SKILLS&#10;JavaScript, TypeScript, React, Node.js..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">{text.length} characters</span>
              <Button onClick={handleAnalyze} disabled={loading || text.trim().length < 100} className="gap-1.5">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Zap className="w-4 h-4" /> Analyze Resume</>}
              </Button>
            </div>
          </div>
        )}

        {checking && <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>}

        {/* Results */}
        {analysis && (
          <div className="space-y-5">
            {/* Score + Summary */}
            <div className="bg-white border border-border rounded-xl p-6">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <ScoreRing score={analysis.ats_score} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-sm font-bold uppercase tracking-wide ${levelColor(analysis.experience_level)}`}>
                      {analysis.experience_level} Level
                    </span>
                    {analysis.estimated_yoe > 0 && (
                      <span className="text-xs text-muted-foreground">~{analysis.estimated_yoe} years experience</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold text-foreground text-sm">Strengths</h3>
                </div>
                <ul className="space-y-2.5">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Star className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <h3 className="font-semibold text-foreground text-sm">Areas to Improve</h3>
                </div>
                <ul className="space-y-2.5">
                  {analysis.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />{w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Missing Keywords */}
            {analysis.missing_keywords.length > 0 && (
              <div className="bg-white border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Code className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">Missing ATS Keywords</h3>
                  <span className="text-xs text-muted-foreground ml-auto">Add these to improve your ATS score</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.missing_keywords.map((k, i) => (
                    <span key={i} className="px-3 py-1 bg-destructive/8 text-destructive text-xs rounded-full font-medium border border-destructive/20">
                      + {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detected Skills */}
            {analysis.detected_skills.length > 0 && (
              <div className="bg-white border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">Detected Skills</h3>
                  <span className="text-xs text-muted-foreground ml-auto">Auto-added to your profile</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.detected_skills.map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-primary/8 text-primary text-xs rounded-full font-medium border border-primary/20">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { title: 'Formatting Tips', items: analysis.formatting_tips, icon: AlertCircle, color: 'text-blue-500' },
                { title: 'Improvement Tips', items: analysis.improvement_tips, icon: Lightbulb, color: 'text-amber-500' },
              ].map(({ title, items, icon: Icon, color }) => (
                <div key={title} className="bg-white border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {items.map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-muted-foreground/40 font-bold shrink-0 text-xs mt-0.5">{i + 1}.</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {analysis.created_at && (
              <p className="text-xs text-muted-foreground text-center">
                Analysis from {new Date(analysis.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
