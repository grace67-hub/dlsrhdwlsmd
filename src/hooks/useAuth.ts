import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', session.user.id)
          .single();
        setUsername(data?.username ?? null);
      } else {
        setUsername(null);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', session.user.id)
          .single();
        setUsername(data?.username ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUsernameExists = useCallback(async (uname: string): Promise<boolean> => {
    const { data } = await supabase.rpc('check_username_exists', { p_username: uname });
    return !!data;
  }, []);

  const signup = useCallback(async (uname: string, password: string) => {
    // Check duplicate username
    const exists = await checkUsernameExists(uname);
    if (exists) throw new Error('이미 사용 중인 아이디입니다.');

    // Use internal email pattern
    const email = `${uname}@internal.local`;
    const { data: authData, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        username: uname,
      });
      if (profileError) throw profileError;
      setUsername(uname);
    }
  }, [checkUsernameExists]);

  const login = useCallback(async (uname: string, password: string) => {
    const email = `${uname}@internal.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUsername(null);
  }, []);

  return { user, username, loading, login, signup, logout, checkUsernameExists };
}
