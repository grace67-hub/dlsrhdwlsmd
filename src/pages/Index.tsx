import { useRef, useEffect, useState, KeyboardEvent, useMemo } from 'react';
import { useChat, Message } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';

/** Render text with clickable links - strips trailing punctuation from URLs */
const renderContent = (text: string, linkColor: string) => {
  const urlRegex = /(https?:\/\/[^\s<>"\])\},]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      // Strip trailing punctuation that's not part of the URL
      const cleaned = part.replace(/[.,;:!?)}\]]+$/, '');
      const trailing = part.slice(cleaned.length);
      return (
        <span key={i}>
          <a href={cleaned} target="_blank" rel="noopener noreferrer"
            style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-all' }}>
            {cleaned}
          </a>
          {trailing}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

type InputMode = null | 'login_id' | 'login_pw' | 'signup_id' | 'signup_pw' | 'open' | 'delete';
type ThemeMode = 'dark' | 'light';

const Index = () => {
  const { messages, isLoading, sendMessage, clearMessages, setMessages } = useChat();
  const { user, username, loading: authLoading, login, signup, logout } = useAuth();
  const {
    conversations, currentConversationId, loadConversations, createConversation,
    loadMessages, saveMessage, deleteConversation, setCurrentConversationId,
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
  const colors = useMemo(() => ({
    bg: isDark ? '#0a0a0f' : '#fafafa',
    text: isDark ? '#d4d4d8' : '#333',
    dim: isDark ? '#52525b' : '#999',
    dimmer: isDark ? '#71717a' : '#aaa',
    border: isDark ? '#1e1e2a' : '#e4e4e7',
    system: isDark ? '#a1a1aa' : '#666',
    link: isDark ? '#60a5fa' : '#2563eb',
    menuBg: isDark ? '#111118' : '#fff',
    menuHover: isDark ? '#1a1a24' : '#f4f4f5',
    menuBorder: isDark ? '#27273a' : '#d4d4d8',
    sourceBg: isDark ? '#0d0d14' : '#f0f0f0',
    accent: isDark ? '#818cf8' : '#6366f1',
    userPrefix: isDark ? '#a78bfa' : '#7c3aed',
  }), [isDark]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, systemLines]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const hasShownLogin = useRef(false);
  const prevUserId = useRef<string | null>(null);
  useEffect(() => {
    if (user) {
      loadConversations();
      if (prevUserId.current !== user.id && username && !hasShownLogin.current) {
        hasShownLogin.current = true;
        addSystem('로그인됨: ' + username);
      }
      prevUserId.current = user.id;
    } else {
      hasShownLogin.current = false;
      prevUserId.current = null;
    }
  }, [user, username]);

  const addSystem = (text: string) => {
    setSystemLines(prev => [...prev, text]);
    setTimeout(() => setSystemLines(prev => prev.filter(l => l !== text)), 4000);
  };

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (inputMode) return;
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'l': e.preventDefault();
            if (user) { addSystem('이미 로그인됨'); return; }
            setInputMode('login_id'); addSystem('아이디:'); return;
          case 'r': e.preventDefault();
            if (user) { addSystem('이미 로그인됨'); return; }
            setInputMode('signup_id'); addSystem('아이디:'); return;
          case 'q': e.preventDefault();
            if (!user) { addSystem('로그인 안됨'); return; }
            logout().then(() => { clearMessages(); setCurrentConversationId(null); addSystem('로그아웃됨'); }); return;
          case 'n': e.preventDefault();
            if (!user) { addSystem('로그인 필요'); return; }
            clearMessages(); createConversation().then(id => { if (id) addSystem('새 대화'); }); return;
          case 'o': e.preventDefault();
            if (!user) { addSystem('로그인 필요'); return; }
            loadConversations().then(list => {
              if (!list.length) { addSystem('대화 없음'); return; }
              list.forEach((c, i) => addSystem(`${i + 1}. ${c.title}`));
              setInputMode('open'); addSystem('번호:');
            }); return;
          case 'd': e.preventDefault();
            if (!user) { addSystem('로그인 필요'); return; }
            loadConversations().then(list => {
              if (!list.length) { addSystem('대화 없음'); return; }
              list.forEach((c, i) => addSystem(`${i + 1}. ${c.title}`));
              setInputMode('delete'); addSystem('삭제할 번호:');
            }); return;
          case 'k': e.preventDefault(); clearMessages(); addSystem('화면 지움'); return;
          case 'h': e.preventDefault(); setShowHelp(p => !p); return;
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
        try { await login(tempId, val); } catch (e: any) { addSystem('로그인 실패: ' + (e.message || '오류')); } return;
      case 'signup_id': setTempId(val); setInputMode('signup_pw'); addSystem('비밀번호:'); return;
      case 'signup_pw':
        setInputMode(null);
        try { await signup(tempId, val); addSystem('가입 완료'); } catch (e: any) { addSystem('가입 실패: ' + (e.message || '오류')); } return;
      case 'open': {
        setInputMode(null);
        const idx = parseInt(val) - 1;
        if (isNaN(idx) || idx < 0 || idx >= conversations.length) { addSystem('잘못된 번호'); return; }
        const msgs = await loadMessages(conversations[idx].id);
        setMessages(msgs.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })));
        addSystem(`"${conversations[idx].title}" 열림`); return;
      }
      case 'delete': {
        setInputMode(null);
        const idx = parseInt(val) - 1;
        if (isNaN(idx) || idx < 0 || idx >= conversations.length) { addSystem('잘못된 번호'); return; }
        await deleteConversation(conversations[idx].id);
        clearMessages(); addSystem('삭제됨'); return;
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && inputMode) { setInputMode(null); setInput(''); addSystem('취소'); return; }
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
    await sendMessage(content, async (ac: string) => {
      if (convId && user) await saveMessage(convId, 'assistant', ac);
    });
  };

  if (authLoading) return null;
  const isPasswordMode = inputMode === 'login_pw' || inputMode === 'signup_pw';

  const menuItemStyle: React.CSSProperties = {
    padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace',
    fontSize: '13px', color: colors.text, borderBottom: `1px solid ${colors.border}`,
  };

  /** Render assistant message: split body and sources at "---" */
  const renderAssistantContent = (content: string) => {
    const separatorIdx = content.lastIndexOf('---');
    if (separatorIdx === -1) return <div>{renderContent(content, colors.link)}</div>;

    const body = content.slice(0, separatorIdx).trimEnd();
    const sourcesRaw = content.slice(separatorIdx + 3).trim();

    return (
      <div>
        <div>{renderContent(body, colors.link)}</div>
        {sourcesRaw && (
          <div style={{
            marginTop: '12px', paddingTop: '8px',
            borderTop: `1px solid ${colors.border}`,
            fontSize: '12px', color: colors.dimmer, lineHeight: '1.8',
          }}>
            {renderContent(sourcesRaw, colors.link)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%', background: colors.bg, color: colors.text,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '13.5px', lineHeight: '1.8',
      padding: '20px 16px', userSelect: 'text', WebkitUserSelect: 'text', position: 'relative',
    }}>
      {/* Settings */}
      <div ref={menuRef} style={{ position: 'fixed', top: '16px', right: '20px', zIndex: 100 }}>
        <button onClick={() => setShowMenu(p => !p)} style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${colors.border}`, color: colors.dim,
          fontFamily: 'inherit', fontSize: '14px', cursor: 'pointer',
          padding: '6px 10px', borderRadius: '8px', lineHeight: 1,
          transition: 'all 0.2s', backdropFilter: 'blur(8px)',
        }} title="설정">⚙</button>

        {showMenu && (
          <div style={{
            position: 'absolute', top: '40px', right: 0, background: colors.menuBg,
            border: `1px solid ${colors.menuBorder}`, borderRadius: '10px', minWidth: '170px',
            overflow: 'hidden', boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(12px)',
          }}>
            {!user ? (
              <>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setShowMenu(false); setInputMode('login_id'); addSystem('아이디:'); }}>로그인</div>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setShowMenu(false); setInputMode('signup_id'); addSystem('아이디:'); }}>회원가입</div>
              </>
            ) : (
              <>
                <div style={{ ...menuItemStyle, color: colors.accent, cursor: 'default', fontSize: '12px', fontWeight: 600 }}>● {username}</div>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setShowMenu(false); clearMessages(); createConversation().then(id => { if (id) addSystem('새 대화'); }); }}>새 대화</div>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => {
                    setShowMenu(false);
                    loadConversations().then(list => {
                      if (!list.length) { addSystem('대화 없음'); return; }
                      list.forEach((c, i) => addSystem(`${i + 1}. ${c.title}`));
                      setInputMode('open'); addSystem('번호:');
                    });
                  }}>대화 열기</div>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => {
                    setShowMenu(false);
                    loadConversations().then(list => {
                      if (!list.length) { addSystem('대화 없음'); return; }
                      list.forEach((c, i) => addSystem(`${i + 1}. ${c.title}`));
                      setInputMode('delete'); addSystem('삭제할 번호:');
                    });
                  }}>대화 삭제</div>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setShowMenu(false); logout().then(() => { clearMessages(); setCurrentConversationId(null); addSystem('로그아웃됨'); }); }}>로그아웃</div>
              </>
            )}
            <div style={{ ...menuItemStyle, borderBottom: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => { setTheme(p => p === 'dark' ? 'light' : 'dark'); setShowMenu(false); }}>
              {isDark ? '☀ 라이트 모드' : '🌙 다크 모드'}
            </div>
          </div>
        )}
      </div>

      {showHelp && (
        <div style={{ color: colors.dimmer, marginBottom: '20px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px', fontSize: '12px' }}>
          <div>Ctrl+L 로그인 · Ctrl+R 회원가입 · Ctrl+Q 로그아웃</div>
          <div>Ctrl+N 새 대화 · Ctrl+O 대화 열기 · Ctrl+D 대화 삭제</div>
          <div>Ctrl+K 화면 지우기 · Ctrl+H 도움말 · Esc 취소</div>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={msg.id}>
          {msg.role === 'user' && i > 0 && (
            <div style={{
              height: '1px',
              background: `linear-gradient(90deg, transparent, ${colors.border}, transparent)`,
              margin: '32px 0 28px',
            }} />
          )}

          {msg.role === 'user' && (
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '20px' }}>
              <span style={{ color: colors.userPrefix, fontWeight: 600 }}>❯ </span>
              {renderContent(msg.content, colors.link)}
            </div>
          )}

          {msg.role === 'assistant' && (
            <div style={{
              whiteSpace: 'pre-wrap', marginBottom: '28px', paddingLeft: '12px',
              borderLeft: `2px solid ${colors.border}`,
            }}>
              {renderAssistantContent(msg.content)}
            </div>
          )}
        </div>
      ))}

      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div style={{
          color: colors.accent, paddingLeft: '12px', marginBottom: '8px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <span style={{ letterSpacing: '3px' }}>···</span>
        </div>
      )}

      {systemLines.map((line, i) => (
        <div key={i} style={{
          color: colors.system, whiteSpace: 'pre-wrap', fontSize: '12px',
          padding: '2px 8px', borderRadius: '4px',
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          marginBottom: '4px', display: 'inline-block',
        }}>{line}</div>
      ))}

      <div style={{ height: '20px' }} />
      <div style={{
        display: 'flex', alignItems: 'center',
        borderTop: `1px solid ${colors.border}`, paddingTop: '12px',
      }}>
        {inputMode && <span style={{ color: colors.accent, marginRight: '6px', fontSize: '12px', fontWeight: 600 }}>{
          inputMode === 'login_id' || inputMode === 'signup_id' ? '[아이디]' :
          inputMode === 'login_pw' || inputMode === 'signup_pw' ? '[비밀번호]' :
          inputMode === 'open' ? '[번호]' : '[번호]'
        }</span>}
        <span style={{ color: colors.userPrefix, marginRight: '4px' }}>❯</span>
        <input ref={inputRef} type={isPasswordMode ? 'password' : 'text'}
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          disabled={isLoading} autoFocus spellCheck={false}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'inherit', fontSize: '13.5px', color: colors.text,
            width: '100%', padding: 0, margin: 0, caretColor: colors.accent,
          }}
        />
      </div>
      <div ref={bottomRef} />
      <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
    </div>
  );
};

export default Index;