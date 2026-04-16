import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  searchResults?: any[];
  isSearching?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`;

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');

  /** Perform a web search and return context string */
  const webSearch = async (query: string): Promise<{ context: string; results: any[] }> => {
    try {
      setIsSearching(true);
      setSearchStatus(`검색 중: "${query}"`);
      const res = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error('검색 실패');
      const data = await res.json();
      const results = data.data?.data || data.data || [];
      const context = results.map((r: any, i: number) => 
        `[${i+1}] ${r.title || r.url}\nURL: ${r.url}\n${(r.markdown || r.description || '').slice(0, 500)}`
      ).join('\n\n');
      setSearchStatus('검색 완료, AI 분석 중...');
      return { context, results };
    } catch (e) {
      console.error('Search error:', e);
      setSearchStatus('');
      return { context: '', results: [] };
    } finally {
      setIsSearching(false);
    }
  };

  /** Scrape a specific URL */
  const scrapeUrl = async (url: string): Promise<{ markdown: string; screenshot?: string }> => {
    try {
      setIsSearching(true);
      setSearchStatus(`사이트 분석 중: ${url}`);
      const res = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ scrape_url: url }),
      });
      if (!res.ok) throw new Error('스크래핑 실패');
      const data = await res.json();
      return {
        markdown: data.data?.markdown || '',
        screenshot: data.data?.screenshot || undefined,
      };
    } catch (e) {
      console.error('Scrape error:', e);
      return { markdown: '' };
    } finally {
      setIsSearching(false);
      setSearchStatus('');
    }
  };

  const sendMessage = useCallback(async (
    content: string,
    onComplete?: (assistantContent: string) => Promise<void>,
    options?: { enableSearch?: boolean }
  ) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let webContext = '';
    let searchResults: any[] = [];

    // Auto web search for questions that seem to need real-time info
    const needsSearch = options?.enableSearch || 
      /검색|찾아|실시간|최신|뉴스|날씨|주가|환율|현재|오늘/.test(content);
    
    if (needsSearch) {
      const { context, results } = await webSearch(content);
      webContext = context;
      searchResults = results;
    }

    let assistantContent = '';

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent, searchResults } : m
          );
        }
        return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: assistantContent, searchResults }];
      });
    };

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          web_context: webContext || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '응답을 받지 못했습니다.');
      }

      if (!response.body) throw new Error('스트림을 받지 못했습니다.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) updateAssistant(c);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) updateAssistant(c);
          } catch { /* ignore */ }
        }
      }

      setSearchStatus('');
      if (onComplete && assistantContent) {
        await onComplete(assistantContent);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error instanceof Error ? error.message : '메시지를 보내지 못했습니다.',
      });
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
      setSearchStatus('');
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, isSearching, searchStatus, sendMessage, clearMessages, setMessages, webSearch, scrapeUrl };
}
