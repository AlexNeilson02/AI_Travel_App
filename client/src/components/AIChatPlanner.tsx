import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIChatPlannerProps {
  tripId: number;
  destination: string;
  onPlanCreated: (plan: any) => void;
}

export function AIChatPlanner({ tripId, destination, onPlanCreated }: AIChatPlannerProps) {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize conversation when component mounts
  useEffect(() => {
    setMessages([
      {
        role: 'system',
        content: 'Welcome to Juno AI Travel Planner! I\'m here to help you plan your perfect trip to ' + destination + '. What kind of activities are you interested in?',
        timestamp: new Date()
      }
    ]);
  }, [destination]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === '') return;
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Make API request to get AI response
      const response = await apiRequest('POST', '/api/trips/ai-chat', {
        tripId,
        message: input,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const data = await response.json();
      
      // Add AI message
      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Check if we have a plan to apply
      if (data.plan) {
        onPlanCreated(data.plan);
        toast({
          title: 'Plan created!',
          description: 'The AI has generated a travel plan based on your conversation.',
        });
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: 'Error',
        description: 'Failed to get a response from the AI. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([
      {
        role: 'system',
        content: 'Welcome to Juno AI Travel Planner! I\'m here to help you plan your perfect trip to ' + destination + '. What kind of activities are you interested in?',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>AI Travel Planner</CardTitle>
        <CardDescription>Chat with our AI to create your perfect itinerary</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto px-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : message.role === 'system'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.role !== 'user' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <Badge variant="outline" className="text-xs">Juno AI</Badge>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          {loading && (
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3">
        <div className="flex w-full items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={resetConversation}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your trip, e.g., 'I'd like to see museums and try local food'"
            className="min-h-10 resize-none flex-1"
            disabled={loading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={loading || input.trim() === ''}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}