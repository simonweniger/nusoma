import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await createClient().auth.getUser();
      if (error) {
      }

      setUser(data.user);
    };

    fetchUser();
  }, []);

  return user;
};
