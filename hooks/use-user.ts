import { useUser as useClerkUser } from '@clerk/nextjs';

export const useUser = () => {
  const { user } = useClerkUser();
  return user;
};
