'use client';

import { useEffect, useMemo } from 'react';
import { useChat } from 'ai/react';
import { Send, MessageCircle, User, Bot, Paperclip } from 'lucide-react';

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

  const initialMessages = useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    append,
    setMessages,
  } = useChat({
    api: `/api/jobs/${jobId}/chat`,
    id: `job-chat-${jobId}`,
    initialMessages,
    onFinish: () => {
      try {
        localStorage.setItem(initKey, '1');
      } catch {
        // ignore
      }
    },
  });

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, storageKey]);

  // First-load auto prompt
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const already = localStorage.getItem(initKey);
      if (!already) {
        const INITIAL_PROMPT = `Generate the first reply for user "Storm". Start with: "Welcome Storm, let me tell you about this job." Then state: "It passes X of 4 quick rules." where X is the number of rules with status COMPLIANT among: HIP_RIDGE_CAP, STARTER_STRIP, DRIP_EDGE_GUTTER_APRON, ICE_WATER_BARRIER (match available rule names). Mention the roof material if present (e.g., composite/asphalt). Then write a single concise sentence for each of the four rules describing material/spec, quantities vs required, and compliance result. End with: "What else can I help you with?" Use ONLY the provided context.`;
        // Kick off the initial user message to the API (which will respond as assistant)
        append({ role: 'user', content: INITIAL_PROMPT }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [append, initKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const suggestedQuestions = [
    'Why was the ridge cap flagged?',
    'Explain the starter strip issue',
    'Show me the cost breakdown',
  ];

  return (
    <Card className='h-[600px] flex flex-col'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2'>
          <MessageCircle className='h-5 w-5' />
          Ask Questions About This Job
        </CardTitle>
        <p className='text-sm text-muted-foreground'>
          I have the insurance estimate and roof report loaded as context
        </p>
      </CardHeader>

      <CardContent className='flex-1 flex flex-col p-0'>
        {/* Messages */}
        <ScrollArea className='flex-1 px-6'>
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
                      className={`p-3 rounded-lg text-sm ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white ml-auto'
                          : 'bg-muted'
                      }`}
                    >
                      {message.content as any}
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
        <div className='border-t p-4'>
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

          {/* Suggested Questions - Now Vertical Stack */}
          <div className='space-y-2'>
            <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>
              Suggested questions:
            </div>
            {suggestedQuestions.map((question, index) => (
              <Button
                key={index}
                variant='outline'
                size='sm'
                onClick={() => setInput(question)}
                disabled={isLoading}
                className='w-full text-left justify-start h-auto py-2 px-3 text-xs'
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
