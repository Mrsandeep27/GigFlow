'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { api, Conversation } from '@/lib/api';
import { Loader2, MessageSquare, ArrowLeft } from 'lucide-react';

export default function ChatListPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (!user) return;
    api.chat.list().then(setConversations).catch(() => {}).finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  const isEmployer = user.role === 'employer';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4 text-muted-foreground h-8">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Button>
        </Link>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase mb-1">Messaging</p>
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : conversations.length === 0 ? (
          <div className="bg-white border border-dashed border-border rounded-xl py-20 text-center">
            <div className="w-14 h-14 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground mb-1">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
              {isEmployer ? 'Messages from applicants will appear here' : 'Apply to jobs to start chatting with recruiters'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(conv => {
              const otherName = isEmployer ? conv.worker_name : conv.employer_name;
              const otherAvatar = isEmployer ? conv.worker_avatar : conv.employer_avatar;
              const unread = isEmployer ? conv.employer_unread : conv.worker_unread;

              return (
                <Link key={conv.id} href={`/chat/${conv.id}`}>
                  <div className="bg-white border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all flex items-center gap-4 cursor-pointer">
                    {otherAvatar ? (
                      <img src={otherAvatar} alt={otherName} className="w-12 h-12 rounded-full object-cover border border-border shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {otherName?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-foreground text-sm">{otherName}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(conv.last_message_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      {conv.gig_title && (
                        <div className="text-[10px] text-primary/70 font-medium mb-0.5 truncate">{conv.gig_title}</div>
                      )}
                      <p className="text-xs text-muted-foreground truncate">{conv.last_message || 'No messages yet'}</p>
                    </div>
                    {unread > 0 && (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                        {unread}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
