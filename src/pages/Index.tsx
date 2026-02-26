import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { useChat } from '@/hooks/useChat';

const Index = () => {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleGlobal = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        clearMessages();
      }
    };
    window.addEventListener('keydown', handleGlobal);
    return () => window.removeEventListener('keydown', handleGlobal);
  }, [clearMessages]);

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
        background: '#000',
        color: '#ccc',
        fontFamily: 'monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        padding: '10px',
        cursor: 'text',
      }}
    >
      {messages.map((msg, i) => (
        <div key={msg.id} style={{ whiteSpace: 'pre-wrap' }}>
          {msg.role === 'user' && i > 0 && <div style={{ height: '16px' }} />}
          <div>{msg.content}</div>
          {msg.role === 'user' && <div style={{ height: '4px' }} />}
        </div>
      ))}

      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div style={{ color: '#555' }}>...</div>
      )}

      <div style={{ height: '16px' }} />
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
          color: '#ccc',
          width: '100%',
          padding: 0,
          margin: 0,
          caretColor: '#666',
        }}
      />
      <div ref={bottomRef} />
    </div>
  );
};

export default Index;
