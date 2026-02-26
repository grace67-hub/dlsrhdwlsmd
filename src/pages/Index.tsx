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
        background: '#000',
        color: '#ccc',
        fontFamily: 'monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        padding: '10px',
        cursor: 'text',
      }}
    >
      {messages.map((msg) => (
        <div key={msg.id} style={{ whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
          {msg.role === 'user' ? (
            <>
              <div style={{ color: '#666' }}>사용자:</div>
              <div>{msg.content}</div>
              <div style={{ color: '#666' }}>---</div>
            </>
          ) : (
            <>
              <div style={{ color: '#666' }}>:</div>
              <div>{msg.content}</div>
            </>
          )}
        </div>
      ))}

      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div style={{ color: '#555' }}>: ...</div>
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
