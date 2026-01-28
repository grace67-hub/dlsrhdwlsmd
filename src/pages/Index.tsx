import { useRef, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useChat } from '@/hooks/useChat';

const Index = () => {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-card shadow-xl">
      <ChatHeader onClear={clearMessages} hasMessages={messages.length > 0} />

      <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl chat-gradient flex items-center justify-center mb-4 chat-shadow">
              <MessageSquare className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              안녕하세요! 👋
            </h2>
            <p className="text-muted-foreground max-w-sm">
              궁금한 것이 있으시면 무엇이든 물어보세요. 
              코딩, 번역, 글쓰기 등 다양한 도움을 드릴 수 있어요.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <TypingIndicator />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </main>

      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
};

export default Index;
