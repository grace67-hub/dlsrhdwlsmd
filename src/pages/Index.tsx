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

type InputMode = null | 'login_id' | 'login_pw' | 'signup_id' | 'signup_pw' | 'open' | 'delete';
type ThemeMode = 'dark' | 'light';

const Index = () => {
  const { messages, isLoading, sendMessage, clearMessages, setMessages } = useChat();
  const { user, username, loading: authLoading, login, signup, logout } = useAuth();
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
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [tempId, setTempId] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#000' : '#f5f5f5',
    text: isDark ? '#ccc' : '#333',
    dim: isDark ? '#555' : '#999',
    dimmer: isDark ? '#666' : '#aaa',
    border: isDark ? '#222' : '#ddd',
    system: isDark ? '#888' : '#666',
    link: isDark ? '#6af' : '#07c',
    menuBg: isDark ? '#111' : '#fff',
    menuHover: isDark ? '#222' : '#eee',
    menuBorder: isDark ? '#333' : '#ccc',
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, systemLines]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const hasShownLogin = useRef(false);
  const prevUserId = useRef<string | null>(null);
  useEffect(() => {
    if (user) {
      loadConversations();
      if (prevUserId.current !== user.id && username) {
        if (!hasShownLogin.current) {
          hasShownLogin.current = true;
          addSystem('로그인됨: ' + username);
        }
      }
      prevUserId.current = user.id;
    } else {
      hasShownLogin.current = false;
      prevUserId.current = null;
    }
  }, [user, username]);

  const addSystem = (text: string) => {
    setSystemLines(prev => [...prev, text]);
    setTimeout(() => setSystemLines(prev => prev.filter(l => l !== text)), 5000);
  };

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (inputMode) return;
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'l':
            e.preventDefault();
            if (user) { addSystem('이미 로그인됨'); return; }
            setInputMode('login_id'); addSystem('아이디:'); return;
          case 'r':
            e.preventDefault();
            if (user) { addSystem('이미 로그인됨'); return; }
            setInputMode('signup_id'); addSystem('아이디:'); return;
          case 'q':
            e.preventDefault();
            if (!user) { addSystem('로그인 안됨'); return; }
            logout().then(() => { clearMessages(); setCurrentConversationId(null); addSystem('로그아웃됨'); }); return;
          case 'n':
            e.preventDefault();
            if (!user) { addSystem('로그인 필요 (Ctrl+L)'); return; }
            clearMessages(); createConversation().then(id => { if (id) addSystem('새 대화 시작'); }); return;
          case 'o':
            e.preventDefault();
            if (!user) { addSystem('로그인 필요 (Ctrl+L)'); return; }
            loadConversations().then(list => {
              if (list.length === 0) { addSystem('대화 없음'); return; }
              list.forEach((c, i) => addSystem(`${i + 1}. ${c.title}`));
              setInputMode('open'); addSystem('번호 입력:');
            }); return;
          case 'd':
            e.preventDefault();
            if (!user) { addSystem('로그인 필요 (Ctrl+L)'); return; }
            loadConversations().then(list => {
              if (list.length === 0) { addSystem('대화 없음'); return; }
              list.forEach((c, i) => addSystem(`${i + 1}. ${c.title}`));
              setInputMode('delete'); addSystem('삭제할 번호:');
            }); return;
          case 'k':
            e.preventDefault(); clearMessages(); addSystem('화면 지움'); return;
          case 'h':
            e.preventDefault(); setShowHelp(prev => !prev); return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [user, inputMode, conversations, username]);

  const handleModeInput = async (val: string) => {
    switch (inputMode) {
      case 'login_id': setTempId(val); setInputMode('login_pw'); addSystem('비밀번호:'); return;
      case 'login_pw':
        setInputMode(null);
        try { await login(tempId, val); } catch (e: any) { addSystem('로그인 실패: ' + (e.message || '오류')); }
        return;
      case 'signup_id': setTempId(val); setInputMode('signup_pw'); addSystem('비밀번호:'); return;
      case 'signup_pw':
        setInputMode(null);
        try { await signup(tempId, val); addSystem('가입 완료'); } catch (e: any) { addSystem('가입 실패: ' + (e.message || '오류')); }
        return;
      case 'open': {
        setInputMode(null);
        const idx = parseInt(val) - 1;
        if (isNaN(idx) || idx < 0 || idx >= conversations.length) { addSystem('잘못된 번호'); return; }
        const conv = conversations[idx];
        const msgs = await loadMessages(conv.id);
        setMessages(msgs.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })));
        addSystem(`"${conv.title}" 열림`); return;
      }
      case 'delete': {
        setInputMode(null);
        const idx = parseInt(val) - 1;
        if (isNaN(idx) || idx < 0 || idx >= conversations.length) { addSystem('잘못된 번호'); return; }
        await deleteConversation(conversations[idx].id);
        clearMessages(); addSystem('대화 삭제됨'); return;
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && inputMode) { setInputMode(null); setInput(''); addSystem('취소됨'); return; }
    if (e.key === 'Enter' && input.trim() && !isLoading) {
      const val = input.trim(); setInput('');
      if (inputMode) { handleModeInput(val); return; }
      if (user && !currentConversationId) {
        createConversation(val.slice(0, 50)).then(cId => { if (cId) sendMessageWithSave(val, cId); }); return;
      }
      sendMessageWithSave(val, currentConversationId);
    }
  };

  const sendMessageWithSave = async (content: string, convId: string | null) => {
    if (convId && user) await saveMessage(convId, 'user', content);
    await sendMessage(content, async (assistantContent: string) => {
      if (convId && user) await saveMessage(convId, 'assistant', assistantContent);
    });
  };

  if (authLoading) return null;
  const isPasswordMode = inputMode === 'login_pw' || inputMode === 'signup_pw';

  const menuItemStyle: React.CSSProperties = {
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: colors.text,
    borderBottom: `1px solid ${colors.border}`,
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%', background: colors.bg, color: colors.text,
      fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.6', padding: '10px',
      userSelect: 'text', WebkitUserSelect: 'text', position: 'relative',
    }}>
      {/* Settings button */}
      <div ref={menuRef} style={{ position: 'fixed', top: '12px', right: '16px', zIndex: 100 }}>
        <button
          onClick={() => setShowMenu(prev => !prev)}
          style={{
            background: 'transparent', border: `1px solid ${colors.border}`, color: colors.dim,
            fontFamily: 'monospace', fontSize: '16px', cursor: 'pointer',
            padding: '4px 8px', borderRadius: '4px', lineHeight: 1,
          }}
          title="설정"
        >⚙</button>

        {showMenu && (
          <div style={{
            position: 'absolute', top: '36px', right: 0, background: colors.menuBg,
            border: `1px solid ${colors.menuBorder}`, borderRadius: '6px', minWidth: '160px',
            overflow: 'hidden', boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.1)',
          }}>
            {!user ? (
              <>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setShowMenu(false); setInputMode('login_id'); addSystem('아이디:'); }}>
                  로그인
                </div>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setShowMenu(false); setInputMode('signup_id'); addSystem('아이디:'); }}>
                  회원가입
                </div>
              </>
            ) : (
              <>
                <div style={{ ...menuItemStyle, color: colors.dim, cursor: 'default', fontSize: '12px' }}>
                  {username}
                </div>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setShowMenu(false); clearMessages(); createConversation().then(id => { if (id) addSystem('새 대화 시작'); }); }}>
                  새 대화
                </div>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => {
                    setShowMenu(false);
                    loadConversations().then(list => {
                      if (list.length === 0) { addSystem('대화 없음'); return; }
                      list.forEach((c, i) => addSystem(`${i + 1}. ${c.title}`));
                      setInputMode('open'); addSystem('번호 입력:');
                    });
                  }}>
                  대화 열기
                </div>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setShowMenu(false); logout().then(() => { clearMessages(); setCurrentConversationId(null); addSystem('로그아웃됨'); }); }}>
                  로그아웃
                </div>
              </>
            )}
            <div style={{ ...menuItemStyle, borderBottom: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => { setTheme(prev => prev === 'dark' ? 'light' : 'dark'); setShowMenu(false); }}>
              {isDark ? '☀ 라이트 모드' : '🌙 다크 모드'}
            </div>
          </div>
        )}
      </div>

      {showHelp && (
        <div style={{ color: colors.dimmer, marginBottom: '16px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '8px' }}>
          <div>Ctrl+L 로그인 | Ctrl+R 회원가입 | Ctrl+Q 로그아웃</div>
          <div>Ctrl+N 새 대화 | Ctrl+O 대화 열기 | Ctrl+D 대화 삭제</div>
          <div>Ctrl+K 화면 지우기 | Ctrl+H 도움말 토글 | Esc 취소</div>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={msg.id} style={{ whiteSpace: 'pre-wrap' }}>
          {msg.role === 'user' && i > 0 && <div style={{ height: '32px', borderTop: `1px solid ${colors.border}`, marginBottom: '16px' }} />}
          {msg.role === 'user' && <span style={{ color: colors.dim }}>&gt; </span>}
          <div style={{ display: 'inline' }}>{linkify(msg.content)}</div>
          {msg.role === 'user' && <div style={{ height: '12px' }} />}
          {msg.role === 'assistant' && <div style={{ height: '20px' }} />}
        </div>
      ))}

      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div style={{ color: colors.dim }}>...</div>
      )}

      {systemLines.map((line, i) => (
        <div key={i} style={{ color: colors.system, whiteSpace: 'pre-wrap' }}>{line}</div>
      ))}

      <div style={{ height: '16px' }} />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {inputMode && <span style={{ color: colors.dim, marginRight: '4px' }}>{
          inputMode === 'login_id' ? '[아이디]' :
          inputMode === 'login_pw' ? '[비밀번호]' :
          inputMode === 'signup_id' ? '[아이디]' :
          inputMode === 'signup_pw' ? '[비밀번호]' :
          inputMode === 'open' ? '[번호]' : '[번호]'
        }</span>}
        <input
          ref={inputRef}
          type={isPasswordMode ? 'password' : 'text'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          autoFocus
          spellCheck={false}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'monospace', fontSize: '14px', color: colors.text,
            width: '100%', padding: 0, margin: 0, caretColor: colors.dim,
          }}
        />
      </div>
      <div ref={bottomRef} />
    </div>
  );
};

export default Index;