import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { useChat, Message } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';

const linkify = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#6af', textDecoration: 'underline' }}>
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

type CommandMode = null | 'login_email' | 'login_password' | 'signup_email' | 'signup_password';

const Index = () => {
  const { messages, isLoading, sendMessage, clearMessages, setMessages } = useChat();
  const { user, loading: authLoading, login, signup, logout } = useAuth();
  const {
    conversations,
    currentConversationId,
    loadConversations,
    createConversation,
    loadMessages,
    saveMessage,
    deleteConversation,
    setCurrentConversationId,
  } = useConversations(user?.id);

  const [input, setInput] = useState('');
  const [systemLines, setSystemLines] = useState<string[]>([]);
  const [commandMode, setCommandMode] = useState<CommandMode>(null);
  const [tempEmail, setTempEmail] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, systemLines]);

  // Load conversations on login
  useEffect(() => {
    if (user) {
      loadConversations();
      addSystem('로그인됨: ' + user.email);
    }
  }, [user]);

  const addSystem = (text: string) => {
    setSystemLines(prev => [...prev, text]);
    setTimeout(() => setSystemLines(prev => prev.filter(l => l !== text)), 5000);
  };

  const handleCommand = async (cmd: string) => {
    // Handle command modes (login/signup flow)
    if (commandMode === 'login_email') {
      setTempEmail(cmd);
      setCommandMode('login_password');
      addSystem('비밀번호:');
      return;
    }
    if (commandMode === 'login_password') {
      setCommandMode(null);
      try {
        await login(tempEmail, cmd);
      } catch (e: any) {
        addSystem('로그인 실패: ' + (e.message || '오류'));
      }
      return;
    }
    if (commandMode === 'signup_email') {
      setTempEmail(cmd);
      setCommandMode('signup_password');
      addSystem('비밀번호:');
      return;
    }
    if (commandMode === 'signup_password') {
      setCommandMode(null);
      try {
        await signup(tempEmail, cmd);
        addSystem('가입 완료. 이메일을 확인해주세요.');
      } catch (e: any) {
        addSystem('가입 실패: ' + (e.message || '오류'));
      }
      return;
    }

    // Slash commands
    if (cmd.startsWith('/')) {
      const parts = cmd.split(' ');
      const command = parts[0].toLowerCase();

      switch (command) {
        case '/login':
          if (user) { addSystem('이미 로그인됨'); return; }
          setCommandMode('login_email');
          addSystem('이메일:');
          return;
        case '/signup':
          if (user) { addSystem('이미 로그인됨'); return; }
          setCommandMode('signup_email');
          addSystem('이메일:');
          return;
        case '/logout':
          if (!user) { addSystem('로그인 안됨'); return; }
          await logout();
          clearMessages();
          setCurrentConversationId(null);
          addSystem('로그아웃됨');
          return;
        case '/new':
          if (!user) { addSystem('로그인 필요 (/login)'); return; }
          clearMessages();
          const newId = await createConversation();
          if (newId) addSystem('새 대화 시작');
          return;
        case '/list':
          if (!user) { addSystem('로그인 필요 (/login)'); return; }
          const list = await loadConversations();
          if (list.length === 0) { addSystem('대화 없음'); return; }
          list.forEach((c, i) => addSystem(`${i + 1}. ${c.title}`));
          return;
        case '/open': {
          if (!user) { addSystem('로그인 필요 (/login)'); return; }
          const idx = parseInt(parts[1]) - 1;
          if (isNaN(idx) || idx < 0 || idx >= conversations.length) {
            addSystem('번호를 입력하세요: /open [번호]');
            return;
          }
          const conv = conversations[idx];
          const msgs = await loadMessages(conv.id);
          setMessages(msgs.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })));
          addSystem(`"${conv.title}" 열림`);
          return;
        }
        case '/delete': {
          if (!user) { addSystem('로그인 필요 (/login)'); return; }
          const delIdx = parseInt(parts[1]) - 1;
          if (isNaN(delIdx) || delIdx < 0 || delIdx >= conversations.length) {
            addSystem('번호를 입력하세요: /delete [번호]');
            return;
          }
          await deleteConversation(conversations[delIdx].id);
          clearMessages();
          addSystem('대화 삭제됨');
          return;
        }
        case '/clear':
          clearMessages();
          addSystem('화면 지움');
          return;
        case '/help':
          addSystem('/login - 로그인');
          addSystem('/signup - 회원가입');
          addSystem('/logout - 로그아웃');
          addSystem('/new - 새 대화');
          addSystem('/list - 대화 목록');
          addSystem('/open [번호] - 대화 열기');
          addSystem('/delete [번호] - 대화 삭제');
          addSystem('/clear - 화면 지우기');
          return;
        default:
          addSystem('알 수 없는 명령어. /help 입력');
          return;
      }
    }

    // Normal message - ensure conversation exists for logged in users
    if (user && !currentConversationId) {
      const cId = await createConversation(cmd.slice(0, 50));
      if (cId) {
        await sendMessageWithSave(cmd, cId);
        return;
      }
    }

    await sendMessageWithSave(cmd, currentConversationId);
  };

  const sendMessageWithSave = async (content: string, convId: string | null) => {
    if (convId && user) {
      await saveMessage(convId, 'user', content);
    }
    await sendMessage(content, async (assistantContent: string) => {
      if (convId && user) {
        await saveMessage(convId, 'assistant', assistantContent);
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim() && !isLoading) {
      const val = input.trim();
      setInput('');
      handleCommand(val);
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Only focus input if no text is selected
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      inputRef.current?.focus();
    }
  };

  if (authLoading) return null;

  return (
    <div
      onClick={handleContainerClick}
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
        userSelect: 'text',
        WebkitUserSelect: 'text',
      }}
    >
      {!user && messages.length === 0 && (
        <div style={{ color: '#555', marginBottom: '16px' }}>
          /login 또는 /signup 으로 로그인하세요. /help 로 명령어 확인.
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={msg.id} style={{ whiteSpace: 'pre-wrap' }}>
          {msg.role === 'user' && i > 0 && <div style={{ height: '16px' }} />}
          <div>{linkify(msg.content)}</div>
          {msg.role === 'user' && <div style={{ height: '4px' }} />}
        </div>
      ))}

      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div style={{ color: '#555' }}>...</div>
      )}

      {systemLines.map((line, i) => (
        <div key={i} style={{ color: '#888', whiteSpace: 'pre-wrap' }}>{line}</div>
      ))}

      <div style={{ height: '16px' }} />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {commandMode === 'login_password' || commandMode === 'signup_password' ? (
          <input
            ref={inputRef}
            type="password"
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
        ) : (
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
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
};

export default Index;
