import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await createClient().auth.getUser();

      if (error) {
        console.error(error); //todo: fix this -> we need to implement a logger
      }

      setUser(data.user);
    };

    fetchUser();
  }, []);

  return user;
};
