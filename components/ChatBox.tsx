'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Send,
  MessageCircle,
  User,
  Bot,
  Paperclip,
  RotateCcw,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';

interface ChatBoxProps {
  jobId: string;
}

export function ChatBox({ jobId }: ChatBoxProps) {
  const storageKey = useMemo(() => `eod_chat_messages_${jobId}`, [jobId]);
  const initKey = useMemo(() => `eod_chat_initialized_${jobId}`, [jobId]);
  const initSentRef = useRef(false);

  const initialMessages = useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      // Sanitize any legacy bootstrapping user prompts that might have been persisted
      const filtered = arr.filter((m: any) => {
        const parts = Array.isArray(m?.parts) ? m.parts : [];
        const text = parts
          .filter((p: any) => p && p.type === 'text')
          .map((p: any) => String(p.text))
          .join('\n');
        const looksLikeBootstrap =
          /Generate the first reply for user\s*"?Storm"?/i.test(text) ||
          /Provide a summary about this job that hits these rules/i.test(text);
        return !(m?.role === 'user' && looksLikeBootstrap);
      });
      return filtered;
    } catch {
      return [];
    }
  }, [storageKey]);

  const [input, setInput] = useState('');

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `job-chat-${jobId}`,
    transport: new DefaultChatTransport({ api: `/api/jobs/${jobId}/chat` }),
    messages: initialMessages as any,
    onFinish: () => {
      try {
        localStorage.setItem(initKey, '1');
      } catch {
        // ignore
      }
    },
  });

  const isLoading = status !== 'ready';

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, storageKey]);

  // Simplified: do not auto-send; seed a friendly assistant message if no history yet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const already = localStorage.getItem(initKey);
      if (!already && messages.length === 0 && !initSentRef.current) {
        initSentRef.current = true;
        const welcome = {
          id: 'welcome',
          role: 'assistant' as const,
          parts: [
            {
              type: 'text',
              text: "Welcome! I have the estimate and roof report loaded for this job. Ask me about rule compliance, measurements, or costs and I'll reference specifics.",
            },
          ],
        } as any;
        setMessages([welcome]);
        localStorage.setItem(initKey, '1');
      }
    } catch {
      // ignore
    }
  }, [messages.length, initKey, setMessages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage({ text: input });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const suggestedQuestions = ['Give me an update on this job'];
  const hasUserMessage = useMemo(
    () => messages.some(m => m.role === 'user'),
    [messages]
  );

  return (
    <Card className='h-[600px] flex flex-col overflow-hidden w-full'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2'>
          <MessageCircle className='h-5 w-5' />
          Ask Questions About This Job
        </CardTitle>
        <p className='text-sm text-muted-foreground'>
          I have the insurance estimate and roof report loaded as context
        </p>
      </CardHeader>

      <CardContent className='flex-1 flex flex-col p-0 min-h-0'>
        {/* Messages */}
        <ScrollArea className='flex-1 px-6 h-full min-h-0'>
          <div className='space-y-4 pb-4'>
            {messages
              .filter(m => m.role === 'user' || m.role === 'assistant')
              .map(message => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className='w-8 h-8'>
                    <AvatarFallback
                      className={`text-xs ${
                        message.role === 'user'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className='w-4 h-4' />
                      ) : (
                        <Bot className='w-4 h-4' />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}
                  >
                    <div
                      className={`p-3 rounded-lg text-sm break-words whitespace-pre-wrap ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white ml-auto'
                          : 'bg-muted'
                      }`}
                    >
                      {Array.isArray((message as any).parts)
                        ? (message as any).parts
                            .filter((p: any) => p && p.type === 'text')
                            .map((p: any, i: number) => (
                              <div key={`${message.id}-${i}`}>{p.text}</div>
                            ))
                        : null}
                    </div>
                  </div>
                </div>
              ))}

            {isLoading && (
              <div className='flex gap-3'>
                <Avatar className='w-8 h-8'>
                  <AvatarFallback className='bg-green-100 text-green-700'>
                    <Bot className='w-4 h-4' />
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1'>
                  <div className='bg-muted p-3 rounded-lg text-sm'>
                    <div className='flex items-center gap-1'>
                      <div className='w-2 h-2 bg-muted-foreground rounded-full animate-pulse'></div>
                      <div className='w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-75'></div>
                      <div className='w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150'></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form
          className='border-t p-4'
          onSubmit={e => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className='flex gap-2 mb-3'>
            <div className='flex-1 relative'>
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Ask about ridge caps, measurements, code requirements...'
                className='pr-10'
                disabled={isLoading}
              />
              <Button
                size='sm'
                variant='ghost'
                className='absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0'
              >
                <Paperclip className='h-3 w-3' />
              </Button>
            </div>
            <Button
              type='submit'
              disabled={!input.trim() || isLoading}
              size='sm'
            >
              <Send className='h-4 w-4' />
            </Button>
          </div>

          {/* Suggested Question (hides after first user message) */}
          {!hasUserMessage && (
            <div className='space-y-2'>
              <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>
                Suggested question:
              </div>
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    if (isLoading) return;
                    setInput('');
                    sendMessage({ text: question });
                  }}
                  disabled={isLoading}
                  className='w-full text-left justify-start h-auto py-2 px-3 text-xs'
                >
                  {question}
                </Button>
              ))}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
