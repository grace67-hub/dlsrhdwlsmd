import { Bot, Trash2, Code, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMode } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  onClear: () => void;
  hasMessages: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export function ChatHeader({ onClear, hasMessages, mode, onModeChange }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl chat-gradient flex items-center justify-center chat-shadow">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground">AI 어시스턴트</h1>
          <p className="text-xs text-muted-foreground">{mode === 'programming' ? '프로그래밍 모드' : '일반 대화 모드'}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Mobile mode toggle */}
        <div className="flex lg:hidden bg-secondary rounded-lg p-0.5">
          <button
            onClick={() => onModeChange('general')}
            className={cn(
              'p-2 rounded-md transition-colors',
              mode === 'general' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
            )}
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => onModeChange('programming')}
            className={cn(
              'p-2 rounded-md transition-colors',
              mode === 'programming' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
            )}
          >
            <Code className="w-4 h-4" />
          </button>
        </div>
        {hasMessages && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
