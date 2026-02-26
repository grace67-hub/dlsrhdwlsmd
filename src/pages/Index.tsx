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
      onClick={() => inputRef.current?.focus()}
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#fff',
        color: '#000',
        fontFamily: 'monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        padding: '10px',
        cursor: 'text',
      }}
    >
      {messages.map((msg) => (
        <div key={msg.id} style={{ whiteSpace: 'pre-wrap', marginBottom: '8px' }}>
          {msg.role === 'user'
            ? msg.content
            : msg.content}
        </div>
      ))}

      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div style={{ color: '#999' }}>...</div>
      )}

      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        autoFocus
        spellCheck={false}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#000',
          width: '100%',
          padding: 0,
          margin: 0,
        }}
      />
      <div ref={bottomRef} />
    </div>
  );
};

export default Index;
