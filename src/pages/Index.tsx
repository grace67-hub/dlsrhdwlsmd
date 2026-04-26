import { useRef, useEffect, useState, KeyboardEvent, useMemo } from 'react';
// useChat removed - using agent for everything
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useAgent, AgentStep } from '@/hooks/useAgent';
import { DinoGame } from '@/components/DinoGame';

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
            {desc}
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

  const [focused, setFocused] = useState(false);

  return (
    <div style={{
      minHeight: '100vh', width: '100%', background: '#fff',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'arial, sans-serif',
    }}>
      {/* Top nav */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        padding: '14px 20px', gap: '20px', fontSize: '13px',
      }}>
        <a href="#" onClick={e => e.preventDefault()} style={{ color: '#000', textDecoration: 'none' }}>Gmail</a>
        <a href="#" onClick={e => e.preventDefault()} style={{ color: '#000', textDecoration: 'none' }}>이미지</a>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: '#1a73e8', color: '#fff', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 500,
        }}>S</div>
      </div>

      {/* Main */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', marginTop: '-80px',
      }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '92px', fontWeight: 400, margin: 0, letterSpacing: '-3px',
            display: 'flex', gap: '0',
          }}>
            <span style={{ color: '#4285f4' }}>S</span>
            <span style={{ color: '#ea4335' }}>e</span>
            <span style={{ color: '#fbbc05' }}>a</span>
            <span style={{ color: '#4285f4' }}>r</span>
            <span style={{ color: '#34a853' }}>c</span>
            <span style={{ color: '#ea4335' }}>h</span>
          </h1>
        </div>

        <form onSubmit={handleSearch} style={{ width: '100%', maxWidth: '584px', padding: '0 20px' }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            border: `1px solid ${focused ? 'transparent' : '#dfe1e5'}`,
            borderRadius: '24px', padding: '5px 14px', height: '44px',
            boxShadow: focused ? '0 1px 6px rgba(32,33,36,0.28)' : 'none',
            background: '#fff', transition: 'box-shadow 0.15s',
          }}>
            <svg style={{ width: '20px', height: '20px', marginRight: '13px', flexShrink: 0 }} viewBox="0 0 24 24" fill="#9aa0a6">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setError(''); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: '16px',
                fontFamily: 'arial, sans-serif', color: '#202124', background: 'transparent',
                height: '34px',
              }}
            />
            <svg style={{ width: '24px', height: '24px', marginLeft: '8px', cursor: 'pointer' }} viewBox="0 0 192 192">
              <rect x="0" fill="none" width="192" height="192"/>
              <g>
                <path fill="#4285f4" d="M96 52v60c0 16.5-13.5 30-30 30S36 128.5 36 112V52c0-16.5 13.5-30 30-30s30 13.5 30 30z"/>
                <path fill="#34a853" d="M156 112c0 33.1-26.9 60-60 60s-60-26.9-60-60h12c0 26.5 21.5 48 48 48s48-21.5 48-48h12z"/>
                <path fill="#fbbc05" d="M84 172h24v20H84z"/>
                <path fill="#ea4335" d="M156 112h-12c0-26.5-21.5-48-48-48v-12c33.1 0 60 26.9 60 60z"/>
              </g>
            </svg>
          </div>

          <div style={{ textAlign: 'center', marginTop: '28px' }}>
            <button type="submit" style={{
              background: '#f8f9fa', border: '1px solid #f8f9fa', borderRadius: '4px',
              padding: '0 16px', height: '36px', fontSize: '14px', color: '#3c4043',
              cursor: 'pointer', marginRight: '12px', fontFamily: 'arial, sans-serif',
            }}
              onMouseEnter={e => { e.currentTarget.style.border = '1px solid #dadce0'; e.currentTarget.style.boxShadow = '0 1px 1px rgba(0,0,0,.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.border = '1px solid #f8f9fa'; e.currentTarget.style.boxShadow = 'none'; }}
            >Search 검색</button>
            <button type="button" onClick={() => { setError('운이 없네요. 다시 시도해보세요.'); setTimeout(() => setError(''), 3000); }} style={{
              background: '#f8f9fa', border: '1px solid #f8f9fa', borderRadius: '4px',
              padding: '0 16px', height: '36px', fontSize: '14px', color: '#3c4043',
              cursor: 'pointer', fontFamily: 'arial, sans-serif',
            }}
              onMouseEnter={e => { e.currentTarget.style.border = '1px solid #dadce0'; e.currentTarget.style.boxShadow = '0 1px 1px rgba(0,0,0,.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.border = '1px solid #f8f9fa'; e.currentTarget.style.boxShadow = 'none'; }}
            >I'm Feeling Lucky</button>
          </div>
        </form>

        <div style={{ marginTop: '20px', fontSize: '13px', color: '#4d5156' }}>
          제공 언어: <a href="#" onClick={e => e.preventDefault()} style={{ color: '#1a0dab', textDecoration: 'none', marginLeft: '4px' }}>English</a>
          <a href="#" onClick={e => e.preventDefault()} style={{ color: '#1a0dab', textDecoration: 'none', marginLeft: '12px' }}>日本語</a>
          <a href="#" onClick={e => e.preventDefault()} style={{ color: '#1a0dab', textDecoration: 'none', marginLeft: '12px' }}>中文</a>
        </div>

        {error && (
          <div style={{
            marginTop: '24px', color: '#d93025', fontSize: '14px',
            background: '#fce8e6', padding: '10px 16px', borderRadius: '4px',
          }}>{error}</div>
        )}
      </div>

      <div style={{
        background: '#f2f2f2', borderTop: '1px solid #dadce0',
        fontSize: '14px', color: '#70757a',
      }}>
        <div style={{ padding: '15px 30px', borderBottom: '1px solid #dadce0' }}>대한민국</div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '0 20px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: '24px', padding: '15px 10px' }}>
            <a href="#" onClick={e => e.preventDefault()} style={{ color: '#70757a', textDecoration: 'none' }}>광고</a>
            <a href="#" onClick={e => e.preventDefault()} style={{ color: '#70757a', textDecoration: 'none' }}>비즈니스</a>
            <a href="#" onClick={e => e.preventDefault()} style={{ color: '#70757a', textDecoration: 'none' }}>검색의 원리</a>
          </div>
          <div style={{ display: 'flex', gap: '24px', padding: '15px 10px' }}>
            <a href="#" onClick={e => e.preventDefault()} style={{ color: '#70757a', textDecoration: 'none' }}>개인정보처리방침</a>
            <a href="#" onClick={e => e.preventDefault()} style={{ color: '#70757a', textDecoration: 'none' }}>약관</a>
            <a href="#" onClick={e => e.preventDefault()} style={{ color: '#70757a', textDecoration: 'none' }}>설정</a>
          </div>
        </div>
      </div>
    </div>
  );
};

const AgentStepRow = ({ step, colors }: { step: AgentStep; colors: any }) => {
  const base: React.CSSProperties = { padding: '3px 0', color: colors.text, lineHeight: 1.5 };
  if (step.kind === 'thinking')
    return <div style={{ ...base, color: colors.dim }}>· 단계 {step.n}: 생각 중...</div>;
  if (step.kind === 'thought')
    return <div style={{ ...base, color: colors.dimmer, fontStyle: 'italic' }}>  생각: {step.text}</div>;
  if (step.kind === 'tool_call') {
    const arg = step.tool === 'web_search' ? step.args.query
      : step.tool === 'scrape_url' ? step.args.url
      : step.tool === 'ask_user' ? step.args.question : '';
    const label = step.tool === 'web_search' ? '검색' : step.tool === 'scrape_url' ? '페이지 열기' : step.tool === 'ask_user' ? '질문' : step.tool;
    return <div style={{ ...base, color: colors.link }}>&gt; {label}: <span style={{ color: colors.text }}>{String(arg).slice(0, 100)}</span></div>;
  }
  if (step.kind === 'tool_result') {
    if (step.result?.error) return <div style={{ ...base, color: '#e55' }}>  실패: {step.result.error}</div>;
    if (step.tool === 'web_search') {
      const n = step.result?.results?.length || 0;
      return (
        <div style={{ ...base, color: colors.dim }}>
          {n}개 결과
          {step.result?.results?.slice(0, 3).map((r: any, i: number) => (
            <div key={i} style={{ marginLeft: '12px', fontSize: '11px' }}>
              · <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: colors.link, textDecoration: 'underline' }}>{r.title?.slice(0, 70)}</a>
            </div>
          ))}
        </div>
      );
    }
    if (step.tool === 'scrape_url') {
      const len = (step.result?.markdown || '').length;
      return <div style={{ ...base, color: colors.dim }}>  {len}자 가져옴 {step.result?.title && `- ${step.result.title.slice(0, 60)}`}</div>;
    }
    return <div style={{ ...base, color: colors.dim }}>  완료</div>;
  }
  if (step.kind === 'error')
    return <div style={{ ...base, color: '#e55' }}>오류: {step.message}</div>;
  if (step.kind === 'ask_user')
    return <div style={{ ...base, color: '#fcd34d' }}>질문: {step.question}</div>;
  return null;
};

const Index = () => {
  const agent = useAgent();
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
    agent.clear();
    if (user) logout();
  };

  // Scroll
  useEffect(() => {
    if (appMode !== 'ai') return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [systemLines, appMode, agent.messages, agent.isRunning]);

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
            logout().then(() => { agent.clear(); setCurrentConversationId(null); addSystem('로그아웃됨'); }); return;
          case 'n': e.preventDefault();
            if (!user) { addSystem('로그인 필요'); return; }
            agent.clear(); createConversation().then(id => { if (id) addSystem('새 대화'); }); return;
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
          case 'k': e.preventDefault(); agent.clear(); addSystem('화면 지움'); return;
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
        agent.loadHistory(msgs.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })));
        setCurrentConversationId(conversations[idx].id);
        addSystem(`"${conversations[idx].title}" 열림`); return;
      }
      case 'delete': {
        setInputMode(null);
        const idx = parseInt(val) - 1;
        if (isNaN(idx) || idx < 0 || idx >= conversations.length) { addSystem('잘못된 번호'); return; }
        await deleteConversation(conversations[idx].id);
        agent.clear(); addSystem('삭제됨'); return;
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (inputMode) { setInputMode(null); setInput(''); addSystem('취소'); return; }
    }
    if (e.key === 'Enter' && input.trim() && !agent.isRunning) {
      const val = input.trim(); setInput('');
      if (inputMode) { handleModeInput(val); return; }

      // Reply to agent if waiting
      if (agent.pendingQuestion) { agent.replyToAgent(val); return; }

      // Send to agent (always agent mode)
      if (user && !currentConversationId) {
        createConversation(val.slice(0, 50)).then(cId => {
          if (cId && user) saveMessage(cId, 'user', val);
          agent.sendMessage(val);
        }); return;
      }
      if (currentConversationId && user) saveMessage(currentConversationId, 'user', val);
      agent.sendMessage(val);
    }
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
                  onClick={() => { setShowMenu(false); agent.clear(); createConversation().then(id => { if (id) addSystem('새 대화'); }); }}>새 대화</div>
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
                  onClick={() => { setShowMenu(false); logout().then(() => { agent.clear(); setCurrentConversationId(null); addSystem('로그아웃됨'); }); }}>로그아웃</div>
              </>
            )}
            <div style={menuItemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = colors.menuHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => { setTheme(p => p === 'dark' ? 'light' : 'dark'); setShowMenu(false); }}>
              {isDark ? '라이트 모드' : '다크 모드'}
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
        </div>
      )}

      {agent.messages.map((msg, i) => (
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
            <div style={{ marginBottom: '24px', paddingLeft: '8px' }}>
              {msg.steps && msg.steps.length > 0 && (
                <div style={{
                  background: colors.searchBg, border: `1px solid ${colors.searchBorder}`,
                  borderRadius: '6px', padding: '10px 12px', marginBottom: '12px',
                  fontSize: '12px', fontFamily: 'monospace',
                }}>
                  <div style={{ color: colors.link, marginBottom: '6px', fontWeight: 'bold' }}>
                    작업 과정
                  </div>
                  {msg.steps.map((s, si) => <AgentStepRow key={si} step={s} colors={colors} />)}
                </div>
              )}
              {msg.content && (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {renderAssistantContent(msg.content)}
                </div>
              )}
              {msg.pendingQuestion && (
                <div style={{
                  marginTop: '12px', padding: '10px 12px', borderRadius: '6px',
                  background: isDark ? '#2a1f0a' : '#fff8e1',
                  border: `1px solid ${isDark ? '#5c4a1a' : '#fcd34d'}`,
                  color: isDark ? '#fcd34d' : '#92400e', fontSize: '13px',
                }}>
                  질문: {msg.pendingQuestion}
                  <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                    아래 입력창에 답변을 입력하세요
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {agent.isRunning && (
        <div style={{ color: colors.link, paddingLeft: '8px', fontSize: '12px' }}>
          <span style={{ animation: 'pulse 1.5s infinite' }}>·</span> 작업 중...
          <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
      )}

      {systemLines.map((line, i) => (
        <div key={i} style={{ color: colors.system, whiteSpace: 'pre-wrap' }}>{line}</div>
      ))}

      <div style={{ height: '16px' }} />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {!inputMode && agent.pendingQuestion && (
          <span style={{ color: colors.link, marginRight: '6px', fontSize: '12px' }}>
            [답변]
          </span>
        )}
        {inputMode && <span style={{ color: colors.dim, marginRight: '4px' }}>{
          inputMode === 'login_id' || inputMode === 'signup_id' ? '[아이디]' :
          inputMode === 'login_pw' || inputMode === 'signup_pw' ? '[비밀번호]' :
          inputMode === 'open' ? '[번호]' : '[번호]'
        }</span>}
        <input ref={inputRef} type={isPasswordMode ? 'password' : 'text'}
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          disabled={agent.isRunning && !agent.pendingQuestion}
          autoFocus spellCheck={false}
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
