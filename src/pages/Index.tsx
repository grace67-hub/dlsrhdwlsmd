import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { useChat } from '@/hooks/useChat';

const Index = () => {
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div
      className="h-screen w-screen bg-black overflow-y-auto p-6"
      onClick={() => inputRef.current?.focus()}
      style={{ fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.8' }}
    >
      {messages.map((msg) => (
        <div key={msg.id} className="mb-4 whitespace-pre-wrap">
          {msg.role === 'user' ? (
            <span style={{ color: '#888' }}>{msg.content}</span>
          ) : (
            <div style={{ color: '#ccc' }}>
              <span style={{ color: '#555' }}>→ </span>
              {msg.content}
            </div>
          )}
        </div>
      ))}

      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div style={{ color: '#555' }} className="mb-4 animate-pulse">→ ...</div>
      )}

      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        autoFocus
        spellCheck={false}
        placeholder=""
        className="bg-transparent outline-none border-none w-full"
        style={{ color: '#888', caretColor: '#666', fontFamily: 'monospace', fontSize: '14px' }}
      />
      <div ref={bottomRef} />
    </div>
  );
};

export default Index;
