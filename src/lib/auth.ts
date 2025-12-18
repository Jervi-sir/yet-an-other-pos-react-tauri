
import type { User, CashSession } from '@/types';

const USER_KEY = 'currentUser';
const SESSION_KEY = 'currentSession';

export const getUser = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const setUser = (user: User) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Dispatch event so hooks can react if needed (simple implementation)
  window.dispatchEvent(new Event('auth-change'));
};

export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('auth-change'));
};

export const getSession = (): CashSession | null => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const setSession = (session: CashSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const removeSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

// Simple hook for react components to auto-update on auth change
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUserState] = useState<User | null>(getUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setUserState(getUser());
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  return user;
};
