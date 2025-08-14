import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  Send, 
  MessageCircle, 
  User,
  Bot,
  Paperclip
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatBoxProps {
  jobId: string;
}

export function ChatBox({ jobId }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'ve analyzed the insurance estimate and roof report for this job. I can help answer questions about the findings, explain business rule logic, or clarify any supplement recommendations. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Mock AI response - in real implementation, this would call your AI service
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateMockResponse(inputValue),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const generateMockResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('ridge') || lowerQuestion.includes('hip')) {
      return 'The ridge cap analysis found that the current estimate specifies "cut from 3-tab" shingles, which don\'t meet ASTM D3161/D7158 wind resistance standards. I recommend upgrading to purpose-built ridge caps for proper wind resistance in the most exposed part of the roof.';
    }
    
    if (lowerQuestion.includes('starter')) {
      return 'The starter strip analysis shows the estimate includes starter course "in waste calculation" rather than as a dedicated line item. Cut 3-tab shingles lack the factory adhesive strips needed for proper wind uplift resistance at roof edges. Universal starter strips are recommended.';
    }
    
    if (lowerQuestion.includes('drip') || lowerQuestion.includes('gutter')) {
      return 'The drip edge analysis found adequate rake coverage (120 LF) but missing gutter apron for eaves (180 LF). Different profiles are needed: L-shaped drip edge for rakes and elongated gutter apron for eave-to-gutter transitions.';
    }
    
    if (lowerQuestion.includes('ice') || lowerQuestion.includes('water')) {
      return 'The ice & water barrier coverage (1,200 SF) actually exceeds the IRC R905.1.2 code requirement (1,167 SF) based on the 24" soffit depth, 6" wall thickness, and 6/12 pitch. This item is compliant.';
    }
    
    if (lowerQuestion.includes('cost') || lowerQuestion.includes('price') || lowerQuestion.includes('total')) {
      return 'The total supplement recommendation is $1,366.25, broken down as: Ridge Cap upgrade (+$106.25), Universal Starter Strip (+$495.00), and Gutter Apron addition (+$765.00). The original estimate was $24,750, making the new total $26,116.25.';
    }
    
    return 'I can help explain any of the business rule findings, cost calculations, or code requirements. Feel free to ask about specific line items, measurements, or why certain recommendations were made. I have access to both the insurance estimate and roof report data.';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    'Why was the ridge cap flagged?',
    'Explain the starter strip issue',
    'Show me the cost breakdown'
  ];

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Ask Questions About This Job
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          I have the insurance estimate and roof report loaded as context
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={`text-xs ${
                    message.role === 'user' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`p-3 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-muted'
                  }`}>
                    {message.content}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-green-100 text-green-700">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-75"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about ridge caps, measurements, code requirements..."
                className="pr-10"
                disabled={isLoading}
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              >
                <Paperclip className="h-3 w-3" />
              </Button>
            </div>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Suggested Questions - Now Vertical Stack */}
          <div className="space-y-2">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              Suggested questions:
            </div>
            {suggestedQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInputValue(question)}
                disabled={isLoading}
                className="w-full text-left justify-start h-auto py-2 px-3 text-xs"
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