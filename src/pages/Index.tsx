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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-10 h-10 rounded-xl chat-gradient flex items-center justify-center chat-shadow">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-sm">AI 어시스턴트</h1>
            <p className="text-xs text-muted-foreground">Powered by AI</p>
          </div>
        </div>
        <div className="flex-1 p-3">
          <button
            onClick={clearMessages}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            새 대화
          </button>
        </div>
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">v1.0 · Gemini 기반</p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader onClear={clearMessages} hasMessages={messages.length > 0} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-2xl chat-gradient flex items-center justify-center mb-6 chat-shadow">
                <MessageSquare className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                안녕하세요! 👋
              </h2>
              <p className="text-muted-foreground max-w-md text-base">
                궁금한 것이 있으시면 무엇이든 물어보세요. 
                코딩, 번역, 글쓰기 등 다양한 도움을 드릴 수 있어요.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-lg w-full">
                {["💡 아이디어 브레인스토밍", "📝 글쓰기 도움", "💻 코딩 질문", "🌐 번역 요청"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion.slice(2).trim())}
                    className="p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 text-sm text-foreground transition-colors text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <TypingIndicator />
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <div className="max-w-3xl mx-auto w-full px-4 lg:px-0">
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
