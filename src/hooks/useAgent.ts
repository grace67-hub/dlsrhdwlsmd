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

  const runStream = async (pending_user_reply?: string) => {
    console.log('[agent] POST', URL, { messages: conversationRef.current.length, pending_user_reply });
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: conversationRef.current, pending_user_reply }),
    });
    console.log('[agent] response', res.status, res.headers.get('content-type'));
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => '');
      console.error('[agent] failed', res.status, t);
      throw new Error(`에이전트 시작 실패 (${res.status}): ${t.slice(0,200)}`);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'step') pushStep({ kind: 'thinking', n: ev.n });
            else if (ev.type === 'tool_call') pushStep({ kind: 'tool_call', tool: ev.tool, args: ev.args });
            else if (ev.type === 'tool_result') pushStep({ kind: 'tool_result', tool: ev.tool, result: ev.result });
            else if (ev.type === 'thought') pushStep({ kind: 'thought', text: ev.text });
            else if (ev.type === 'ask_user') {
              pushStep({ kind: 'ask_user', question: ev.question });
              updateAssistant({ pendingQuestion: ev.question });
            } else if (ev.type === 'error') {
              pushStep({ kind: 'error', message: ev.message });
            } else if (ev.type === 'final') {
              updateAssistant({ content: ev.content, pendingQuestion: undefined });
              conversationRef.current.push({ role: 'assistant', content: ev.content });
            }
          } catch {}
        }
      }
    }
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
    try { await runStream(); }
    catch (e) {
      toast({ variant: 'destructive', title: '오류', description: e instanceof Error ? e.message : '오류' });
    } finally { setIsRunning(false); }
  }, [isRunning]);

  const replyToAgent = useCallback(async (reply: string) => {
    if (!reply.trim() || isRunning) return;
    updateAssistant({ pendingQuestion: undefined });
    setIsRunning(true);
    try { await runStream(reply); }
    catch (e) {
      toast({ variant: 'destructive', title: '에이전트 오류', description: e instanceof Error ? e.message : '오류' });
    } finally { setIsRunning(false); }
  }, [isRunning]);

  const clear = useCallback(() => {
    setMessages([]); conversationRef.current = []; stepsRef.current = [];
  }, []);

  const loadHistory = useCallback((msgs: AgentMessage[]) => {
    setMessages(msgs);
    conversationRef.current = msgs.map(m => ({ role: m.role, content: m.content }));
    stepsRef.current = [];
  }, []);

  const pendingQuestion = messages[messages.length - 1]?.pendingQuestion;

  return { messages, isRunning, sendMessage, replyToAgent, clear, loadHistory, pendingQuestion };
}
