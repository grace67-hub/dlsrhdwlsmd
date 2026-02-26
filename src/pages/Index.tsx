import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { useChat } from '@/hooks/useChat';

interface TerminalLine {
  type: 'input' | 'output' | 'system';
  content: string;
}

const Index = () => {
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
  }, [messages, isLoading]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className="h-screen w-screen bg-black text-green-400 font-mono text-sm flex flex-col cursor-text"
      onClick={focusInput}
    >
      <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        <div className="text-neutral-500 mb-4">session started. type anything.</div>

        {messages.map((msg) => (
          <div key={msg.id} className="whitespace-pre-wrap">
            {msg.role === 'user' ? (
              <div>
                <span className="text-neutral-500">&gt; </span>
                <span className="text-neutral-200">{msg.content}</span>
              </div>
            ) : (
              <div className="mt-1 mb-3">
                <span className="text-green-500">ai: </span>
                <span className="text-neutral-300 leading-relaxed">{msg.content}</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="text-green-500 animate-pulse">ai: ...</div>
        )}

        {/* Input line */}
        <div className="flex items-center">
          <span className="text-neutral-500">&gt; </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-neutral-200 outline-none caret-green-400 font-mono text-sm"
            autoFocus
            disabled={isLoading}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
