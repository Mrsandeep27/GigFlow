'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { api, Message, Conversation } from '@/lib/api';
import { Loader2, Send, ArrowLeft } from 'lucide-react';

export default function ChatConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const convId = parseInt(id);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return; }
    if (!user) return;

    // Load conversation info + messages
    api.chat.list().then(convs => {
      const conv = convs.find(c => c.id === convId);
      if (conv) setConversation(conv);
    }).catch(() => {});

    api.chat.messages(convId).then(setMessages).catch(() => {}).finally(() => setLoading(false));

    // Poll every 5s — pause when tab is hidden to save bandwidth
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        api.chat.messages(convId, { limit: 20 }).then(msgs => setMessages(msgs)).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, authLoading, convId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const msg = await api.chat.send(convId, content);
      setMessages(prev => [...prev, { ...msg, sender_id: user!.id, sender_name: user!.name }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send';
      alert(message);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  const isEmployer = user.role === 'employer';
  const otherName = conversation ? (isEmployer ? conversation.worker_name : conversation.employer_name) : 'Chat';
  const otherAvatar = conversation ? (isEmployer ? conversation.worker_avatar : conversation.employer_avatar) : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Chat header */}
      <div className="bg-white border-b border-border sticky top-16 z-30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          {otherAvatar ? (
            <img src={otherAvatar} alt={otherName} className="w-9 h-9 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shrink-0">
              {otherName?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold text-foreground text-sm">{otherName}</div>
            {conversation?.gig_title && (
              <div className="text-[10px] text-muted-foreground truncate">{conversation.gig_title}</div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs sm:max-w-sm ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isMine && msg.sender_name && (
                    <span className="text-[10px] text-muted-foreground px-1">{msg.sender_name}</span>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-white border border-border text-foreground rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-border sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex gap-2">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1 h-10"
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={sending || !input.trim()} className="h-10 w-10 p-0 shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
