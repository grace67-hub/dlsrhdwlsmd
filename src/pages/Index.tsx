import { useRef, useEffect, useState, KeyboardEvent, useMemo } from 'react';
import { useChat, Message } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';

const SECRET_CODE = 'wjddbwnsgv12!!';

/** Render text with clickable links */
const renderContent = (text: string, linkColor: string) => {
  const urlRegex = /(https?:\/\/[^\s<>"\])\},]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
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

/** Render inline images from markdown ![alt](url) */
const renderWithImages = (text: string, linkColor: string) => {
  const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  const previewRegex = /\[PREVIEW:(https?:\/\/[^:]+):([^\]]+)\]/g;
  
  // First split by images
  const segments: { type: 'text' | 'image' | 'preview'; content: string; url?: string; alt?: string }[] = [];
  let lastIdx = 0;
  let match;
  
  const combined = text.replace(imgRegex, (m, alt, url) => `%%IMG%%${alt}%%${url}%%ENDIMG%%`)
    .replace(previewRegex, (m, url, desc) => `%%PREV%%${url}%%${desc}%%ENDPREV%%`);
  
  // Parse segments
  const imgSplit = combined.split(/(%%IMG%%.*?%%ENDIMG%%|%%PREV%%.*?%%ENDPREV%%)/);
  
  return imgSplit.map((seg, i) => {
    if (seg.startsWith('%%IMG%%')) {
      const inner = seg.replace('%%IMG%%', '').replace('%%ENDIMG%%', '');
      const [alt, url] = inner.split('%%');
      return (
        <div key={i} style={{ margin: '12px 0' }}>
          <img src={url} alt={alt} style={{ 
            maxWidth: '100%', maxHeight: '300px', borderRadius: '8px',
            border: '1px solid #333',
          }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          {alt && <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{alt}</div>}
        </div>
      );
    }
    if (seg.startsWith('%%PREV%%')) {
      const inner = seg.replace('%%PREV%%', '').replace('%%ENDPREV%%', '');
      const [url, desc] = inner.split('%%');
      return (
        <div key={i} style={{
          margin: '12px 0', padding: '12px', border: '1px solid #333',
          borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
        }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ 
            color: linkColor, textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' 
          }}>
            🔗 {desc}
          </a>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{url}</div>
        </div>
      );
    }
    return <span key={i}>{renderContent(seg, linkColor)}</span>;
  });
};

type InputMode = null | 'login_id' | 'login_pw' | 'signup_id' | 'signup_pw' | 'open' | 'delete';
type ThemeMode = 'dark' | 'light';
type AppMode = 'disguise' | 'ai';

/** Disguise search page - looks like a normal search engine */
const DisguisePage = ({ onUnlock }: { onUnlock: () => void }) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query === SECRET_CODE) {
      onUnlock();
    } else if (query.trim()) {
      setError('검색 결과를 찾을 수 없습니다.');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%', background: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '72px', fontWeight: 400, margin: 0,
          background: 'linear-gradient(90deg, #4285f4, #ea4335, #fbbc05, #34a853)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-2px',
        }}>Search</h1>
      </div>

      <form onSubmit={handleSearch} style={{ width: '100%', maxWidth: '580px', padding: '0 20px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', border: '1px solid #dfe1e5',
          borderRadius: '24px', padding: '10px 20px', boxShadow: '0 1px 6px rgba(32,33,36,0.08)',
          background: '#fff',
        }}>
          <span style={{ color: '#9aa0a6', marginRight: '12px', fontSize: '18px' }}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setError(''); }}
            autoFocus
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '16px',
              fontFamily: 'Arial, sans-serif', color: '#202124', background: 'transparent',
            }}
            placeholder="검색어를 입력하세요"
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button type="submit" style={{
            background: '#f8f9fa', border: '1px solid #f8f9fa', borderRadius: '4px',
            padding: '8px 16px', fontSize: '14px', color: '#3c4043', cursor: 'pointer',
            marginRight: '8px',
          }}>검색</button>
        </div>
      </form>

      {error && (
        <div style={{
          marginTop: '30px', color: '#ea4335', fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
        }}>{error}</div>
      )}

      <div style={{
        position: 'fixed', bottom: 0, width: '100%', padding: '16px',
        background: '#f2f2f2', borderTop: '1px solid #e4e4e4',
        fontSize: '13px', color: '#70757a', textAlign: 'center',
      }}>
        © 2026 Search Inc.
      </div>
    </div>
  );
};

const Index = () => {
  const { messages, isLoading, isSearching, searchStatus, sendMessage, clearMessages, setMessages } = useChat();
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
  const [appMode, setAppMode] = useState<AppMode>('disguise');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const colors = useMemo(() => ({
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
    sourceBg: isDark ? '#0a0a0a' : '#f0f0f0',
    searchBg: isDark ? '#0d1117' : '#f0f7ff',
    searchBorder: isDark ? '#1a3a5c' : '#b3d4fc',
  }), [isDark]);

  // Escape back to disguise
  const goDisguise = () => {
    setAppMode('disguise');
    clearMessages();
    if (user) logout();
  };

  // Scroll
  useEffect(() => {
    if (appMode !== 'ai') return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, systemLines, searchStatus, appMode]);

  // Click outside menu
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

  // Keyboard shortcuts
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

  // Show disguise page
  if (appMode === 'disguise') {
    return <DisguisePage onUnlock={() => setAppMode('ai')} />;
  }

  // Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, systemLines, searchStatus]);

  // Click outside menu
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

  // Keyboard shortcuts
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
          case 'escape': e.preventDefault(); goDisguise(); return;
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
    if (e.key === 'Escape') {
      if (inputMode) { setInputMode(null); setInput(''); addSystem('취소'); return; }
    }
    if (e.key === 'Enter' && input.trim() && !isLoading) {
      const val = input.trim(); setInput('');
      if (inputMode) { handleModeInput(val); return; }

      // Check for search commands
      const enableSearch = /검색|찾아줘|찾아봐|실시간|서칭|search/i.test(val);

      if (user && !currentConversationId) {
        createConversation(val.slice(0, 50)).then(cId => { if (cId) sendMessageWithSave(val, cId, enableSearch); }); return;
      }
      sendMessageWithSave(val, currentConversationId, enableSearch);
    }
  };

  const sendMessageWithSave = async (content: string, convId: string | null, enableSearch = false) => {
    if (convId && user) await saveMessage(convId, 'user', content);
    await sendMessage(content, async (ac: string) => {
      if (convId && user) await saveMessage(convId, 'assistant', ac);
    }, { enableSearch });
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
    if (separatorIdx === -1) return <div>{renderWithImages(content, colors.link)}</div>;

    const body = content.slice(0, separatorIdx).trimEnd();
    const sourcesRaw = content.slice(separatorIdx + 3).trim();

    return (
      <div>
        <div>{renderWithImages(body, colors.link)}</div>
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
      fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.7', padding: '10px',
      userSelect: 'text', WebkitUserSelect: 'text', position: 'relative',
    }}>
      {/* Settings */}
      <div ref={menuRef} style={{ position: 'fixed', top: '12px', right: '16px', zIndex: 100 }}>
        <button onClick={() => setShowMenu(p => !p)} style={{
          background: 'transparent', border: `1px solid ${colors.border}`, color: colors.dim,
          fontFamily: 'monospace', fontSize: '16px', cursor: 'pointer',
          padding: '4px 8px', borderRadius: '4px', lineHeight: 1,
        }} title="설정">⚙</button>

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
                  onClick={() => { setShowMenu(false); setInputMode('login_id'); addSystem('아이디:'); }}>로그인</div>
                <div style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setShowMenu(false); setInputMode('signup_id'); addSystem('아이디:'); }}>회원가입</div>
              </>
            ) : (
              <>
                <div style={{ ...menuItemStyle, color: colors.dim, cursor: 'default', fontSize: '12px' }}>{username}</div>
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
            <div style={menuItemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => { setTheme(p => p === 'dark' ? 'light' : 'dark'); setShowMenu(false); }}>
              {isDark ? '☀ 라이트 모드' : '🌙 다크 모드'}
            </div>
            <div style={{ ...menuItemStyle, borderBottom: 'none', color: '#e55' }}
              onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => { setShowMenu(false); goDisguise(); }}>위장 모드</div>
          </div>
        )}
      </div>

      {showHelp && (
        <div style={{ color: colors.dimmer, marginBottom: '16px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '8px' }}>
          <div>Ctrl+L 로그인 | Ctrl+R 회원가입 | Ctrl+Q 로그아웃</div>
          <div>Ctrl+N 새 대화 | Ctrl+O 대화 열기 | Ctrl+D 대화 삭제</div>
          <div>Ctrl+K 화면 지우기 | Ctrl+H 도움말 | Esc 취소</div>
          <div style={{ marginTop: '4px', color: colors.dim }}>💡 "검색" 키워드 포함 시 실시간 웹 검색 실행</div>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={msg.id}>
          {msg.role === 'user' && i > 0 && (
            <div style={{ height: '40px', borderTop: `1px solid ${colors.border}`, marginBottom: '20px' }} />
          )}

          {msg.role === 'user' && (
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
              <span style={{ color: colors.dim }}>&gt; </span>
              {renderContent(msg.content, colors.link)}
            </div>
          )}

          {msg.role === 'assistant' && (
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '24px', paddingLeft: '8px' }}>
              {renderAssistantContent(msg.content)}
            </div>
          )}
        </div>
      ))}

      {/* Search progress indicator */}
      {(isSearching || searchStatus) && (
        <div style={{
          padding: '8px 12px', margin: '8px 0', borderRadius: '6px',
          background: colors.searchBg, border: `1px solid ${colors.searchBorder}`,
          fontSize: '12px', color: colors.link, fontFamily: 'monospace',
        }}>
          <span style={{ animation: 'pulse 1.5s infinite' }}>🔍</span> {searchStatus}
          <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
      )}

      {isLoading && messages[messages.length - 1]?.role === 'user' && !searchStatus && (
        <div style={{ color: colors.dim, paddingLeft: '8px' }}>...</div>
      )}

      {systemLines.map((line, i) => (
        <div key={i} style={{ color: colors.system, whiteSpace: 'pre-wrap' }}>{line}</div>
      ))}

      <div style={{ height: '16px' }} />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {inputMode && <span style={{ color: colors.dim, marginRight: '4px' }}>{
          inputMode === 'login_id' || inputMode === 'signup_id' ? '[아이디]' :
          inputMode === 'login_pw' || inputMode === 'signup_pw' ? '[비밀번호]' :
          inputMode === 'open' ? '[번호]' : '[번호]'
        }</span>}
        <input ref={inputRef} type={isPasswordMode ? 'password' : 'text'}
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          disabled={isLoading && !isSearching} autoFocus spellCheck={false}
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
