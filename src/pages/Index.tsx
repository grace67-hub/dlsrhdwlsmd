import { useRef, useEffect } from 'react';
import { MessageSquare, Code, Sparkles } from 'lucide-react';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useChat } from '@/hooks/useChat';
import type { ChatMode } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

const Index = () => {
  const { messages, isLoading, sendMessage, clearMessages, mode, setMode } = useChat();
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
            <h1 className="font-semibold text-foreground text-sm">채팅</h1>
            <p className="text-xs text-muted-foreground">무엇이든 물어보세요</p>
          </div>
        </div>
        <div className="flex-1 p-3 space-y-1">
          <button
            onClick={clearMessages}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            새 대화
          </button>
          <div className="mt-4 px-1">
            <p className="text-xs text-muted-foreground mb-2 font-medium">모드</p>
            {([
              { id: 'general' as ChatMode, label: '일반 대화', icon: Sparkles },
              { id: 'programming' as ChatMode, label: '프로그래밍', icon: Code },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                  mode === id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">{mode === 'programming' ? '코딩' : '일반'}</p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader onClear={clearMessages} hasMessages={messages.length > 0} mode={mode} onModeChange={setMode} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-2xl chat-gradient flex items-center justify-center mb-6 chat-shadow">
                <MessageSquare className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                무엇이 궁금하세요? 👋
              </h2>
              <p className="text-muted-foreground max-w-md text-base">
                편하게 물어보세요.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-lg w-full">
                {(mode === 'programming'
                  ? ["💻 React 컴포넌트 만들기", "🐛 버그 디버깅 도움", "📦 API 연동 방법", "⚡ 코드 최적화"]
                  : ["💡 아이디어 브레인스토밍", "📝 글쓰기 도움", "💻 코딩 질문", "🌐 번역 요청"]
                ).map((suggestion) => (
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
