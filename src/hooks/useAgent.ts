import { useCallback, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';

export type AgentStep =
  | { kind: 'thinking'; n: number }
  | { kind: 'tool_call'; tool: string; args: any }
  | { kind: 'tool_result'; tool: string; result: any }
  | { kind: 'thought'; text: string }
  | { kind: 'ask_user'; question: string }
  | { kind: 'error'; message: string };

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: AgentStep[];
  pendingQuestion?: string;
}

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent`;

export function useAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const conversationRef = useRef<{ role: string; content: string }[]>([]);
  const stepsRef = useRef<AgentStep[]>([]);
  const currentAssistantId = useRef<string>('');

  const updateAssistant = (patch: Partial<AgentMessage>) => {
    setMessages(prev => prev.map(m => m.id === currentAssistantId.current ? { ...m, ...patch } : m));
  };

  const pushStep = (s: AgentStep) => {
    stepsRef.current = [...stepsRef.current, s];
    updateAssistant({ steps: [...stepsRef.current] });
  };

  const showAssistantError = (message: string) => {
    updateAssistant({ content: `오류: ${message}`, pendingQuestion: undefined });
  };

  const runStream = async (pending_user_reply?: string, attempt = 0): Promise<void> => {
    console.log('[agent] POST', URL, { attempt, msgs: conversationRef.current.length, pending_user_reply });

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 90_000);
    let res: Response;

    try {
      res = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: conversationRef.current, pending_user_reply }),
        signal: ctrl.signal,
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      const isAbort = e?.name === 'AbortError';
      console.error('[agent] fetch failed', e);
      if (!isAbort && attempt < 1) {
        console.log('[agent] retrying once...');
        await new Promise(r => setTimeout(r, 800));
        return runStream(pending_user_reply, attempt + 1);
      }
      throw new Error(isAbort ? '응답 시간 초과 (90초). 더 짧게 질문해보세요.' : '네트워크 연결 실패. 인터넷을 확인하세요.');
    }

    console.log('[agent] response', res.status);
    if (!res.ok || !res.body) {
      clearTimeout(timeoutId);
      const t = await res.text().catch(() => '');
      throw new Error(`서버 오류 (${res.status}): ${t.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let textBuffer = '';
    let gotAnyEvent = false;
    let gotTerminalEvent = false;
    let finalContent = '';
    let streamError = '';

    const handleEvent = (ev: any) => {
      gotAnyEvent = true;

      if (ev.type === 'step') {
        pushStep({ kind: 'thinking', n: ev.n });
        return;
      }
      if (ev.type === 'tool_call') {
        pushStep({ kind: 'tool_call', tool: ev.tool, args: ev.args });
        return;
      }
      if (ev.type === 'tool_result') {
        pushStep({ kind: 'tool_result', tool: ev.tool, result: ev.result });
        return;
      }
      if (ev.type === 'thought') {
        pushStep({ kind: 'thought', text: ev.text });
        return;
      }
      if (ev.type === 'ask_user') {
        gotTerminalEvent = true;
        pushStep({ kind: 'ask_user', question: ev.question });
        updateAssistant({ pendingQuestion: ev.question });
        return;
      }
      if (ev.type === 'error') {
        streamError = ev.message || '알 수 없는 오류';
        pushStep({ kind: 'error', message: streamError });
        return;
      }
      if (ev.type === 'final') {
        gotTerminalEvent = true;
        finalContent = typeof ev.content === 'string' ? ev.content : '';
        updateAssistant({ content: finalContent, pendingQuestion: undefined });
        conversationRef.current.push({ role: 'assistant', content: finalContent });
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += dec.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            gotTerminalEvent = true;
            continue;
          }

          try {
            handleEvent(JSON.parse(jsonStr));
          } catch {
            textBuffer = `${line}\n${textBuffer}`;
            break;
          }
        }
      }

      const flushed = dec.decode();
      if (flushed) textBuffer += flushed;

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '' || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            handleEvent(JSON.parse(jsonStr));
          } catch {
            console.warn('[agent] leftover parse skipped', raw);
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (streamError) throw new Error(streamError);
    if (!gotAnyEvent) throw new Error('응답을 받지 못했습니다. 다시 시도해보세요.');
    if (!gotTerminalEvent && !finalContent) throw new Error('응답이 중간에 끊겼습니다. 다시 시도해보세요.');
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isRunning) return;

    const userMsg: AgentMessage = { id: crypto.randomUUID(), role: 'user', content };
    const aId = crypto.randomUUID();
    currentAssistantId.current = aId;
    stepsRef.current = [];
    conversationRef.current.push({ role: 'user', content });
    setMessages(prev => [...prev, userMsg, { id: aId, role: 'assistant', content: '', steps: [] }]);
    setIsRunning(true);

    try {
      await runStream();
    } catch (e) {
      const message = e instanceof Error ? e.message : '오류';
      showAssistantError(message);
      toast({ variant: 'destructive', title: '오류', description: message });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  const replyToAgent = useCallback(async (reply: string) => {
    if (!reply.trim() || isRunning) return;

    updateAssistant({ pendingQuestion: undefined });
    setIsRunning(true);

    try {
      await runStream(reply);
    } catch (e) {
      const message = e instanceof Error ? e.message : '오류';
      showAssistantError(message);
      toast({ variant: 'destructive', title: '에이전트 오류', description: message });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  const clear = useCallback(() => {
    setMessages([]);
    conversationRef.current = [];
    stepsRef.current = [];
  }, []);

  const loadHistory = useCallback((msgs: AgentMessage[]) => {
    setMessages(msgs);
    conversationRef.current = msgs.map(m => ({ role: m.role, content: m.content }));
    stepsRef.current = [];
  }, []);

  const pendingQuestion = messages[messages.length - 1]?.pendingQuestion;

  return { messages, isRunning, sendMessage, replyToAgent, clear, loadHistory, pendingQuestion };
}
