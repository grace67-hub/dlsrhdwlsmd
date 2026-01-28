import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 message-appear">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
        <Bot className="w-4 h-4 text-secondary-foreground" />
      </div>
      <div className="bg-chat-assistant text-chat-assistant-foreground rounded-2xl rounded-bl-md shadow-sm border border-border px-4 py-3">
        <div className="typing-indicator flex gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    </div>
  );
}
