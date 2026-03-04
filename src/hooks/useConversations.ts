import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

export interface DbMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export function useConversations(userId: string | undefined) {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const loadConversations = useCallback(async () => {
    if (!userId) return [];
    const { data } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .order('updated_at', { ascending: false });
    const list = (data ?? []) as Conversation[];
    setConversations(list);
    return list;
  }, [userId]);

  const createConversation = useCallback(async (title?: string) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title: title ?? '새 대화' })
      .select('id')
      .single();
    if (error || !data) return null;
    setCurrentConversationId(data.id);
    await loadConversations();
    return data.id;
  }, [userId, loadConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setCurrentConversationId(conversationId);
    return (data ?? []) as DbMessage[];
  }, []);

  const saveMessage = useCallback(async (conversationId: string, role: string, content: string) => {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role,
      content,
    });
    // Update conversation timestamp and title from first user message
    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (role === 'user') {
      const { data: msgs } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('role', 'user')
        .limit(2);
      if (msgs && msgs.length <= 1) {
        updates.title = content.slice(0, 50);
      }
    }
    await supabase.from('conversations').update(updates).eq('id', conversationId);
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await supabase.from('conversations').delete().eq('id', conversationId);
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
    }
    await loadConversations();
  }, [currentConversationId, loadConversations]);

  return {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    loadConversations,
    createConversation,
    loadMessages,
    saveMessage,
    deleteConversation,
  };
}
