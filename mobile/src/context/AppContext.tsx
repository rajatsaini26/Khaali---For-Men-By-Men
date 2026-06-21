import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { api } from '../api/client';
import i18n from '../i18n';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AppState {
  isLoading: boolean;
  isOnboarded: boolean;
  userId: string | null;
  token: string | null;
  localName: string | null;   // never sent to server
  language: 'en' | 'hi';
  currentStreak: number;
  longestStreak: number;
}

type AppAction =
  | { type: 'SET_LOADED'; payload: Partial<AppState> }
  | { type: 'SET_ONBOARDED'; payload: { userId: string; token: string; localName: string; language: 'en' | 'hi' } }
  | { type: 'SET_LANGUAGE'; payload: 'en' | 'hi' }
  | { type: 'SET_STREAK'; payload: { current: number; longest: number } }
  | { type: 'CLEAR_SESSION' };

const initialState: AppState = {
  isLoading: true,
  isOnboarded: false,
  userId: null,
  token: null,
  localName: null,
  language: 'en',
  currentStreak: 0,
  longestStreak: 0,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADED': return { ...state, isLoading: false, ...action.payload };
    case 'SET_ONBOARDED': return { ...state, isOnboarded: true, ...action.payload };
    case 'SET_LANGUAGE': return { ...state, language: action.payload };
    case 'SET_STREAK': return { ...state, currentStreak: action.payload.current, longestStreak: action.payload.longest };
    case 'CLEAR_SESSION': return { ...initialState, isLoading: false };
    default: return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  initSession: (localName: string, language: 'en' | 'hi', email?: string) => Promise<void>;
  setLanguage: (lang: 'en' | 'hi') => Promise<void>;
  updateStreak: (current: number, longest: number) => void;
  clearSession: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [token, userId, localName, language, streak] = await Promise.all([
          SecureStore.getItemAsync('khaali_token'),
          SecureStore.getItemAsync('khaali_user_id'),
          SecureStore.getItemAsync('khaali_local_name'),
          SecureStore.getItemAsync('khaali_language'),
          SecureStore.getItemAsync('khaali_streak'),
        ]);

        if (token && userId) {
          const lang = (language as 'en' | 'hi') ?? 'en';
          const streakData = streak ? JSON.parse(streak) : { current: 0, longest: 0 };
          i18n.changeLanguage(lang);
          dispatch({
            type: 'SET_LOADED',
            payload: {
              isOnboarded: true,
              token,
              userId,
              localName: localName ?? null,
              language: lang,
              currentStreak: streakData.current,
              longestStreak: streakData.longest,
            },
          });
        } else {
          dispatch({ type: 'SET_LOADED', payload: {} });
        }
      } catch {
        dispatch({ type: 'SET_LOADED', payload: {} });
      }
    })();
  }, []);

  const initSession = async (localName: string, language: 'en' | 'hi', email?: string) => {
    // Generate or reuse device UUID
    let deviceId = await SecureStore.getItemAsync('khaali_device_id');
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await SecureStore.setItemAsync('khaali_device_id', deviceId);
    }

    // Register with API
    const { data } = await api.post('/auth/init', { device_id: deviceId, language });
    const { token, user_id } = data;

    // Persist everything locally
    await Promise.all([
      SecureStore.setItemAsync('khaali_token', token),
      SecureStore.setItemAsync('khaali_user_id', user_id),
      SecureStore.setItemAsync('khaali_local_name', localName),
      SecureStore.setItemAsync('khaali_language', language),
    ]);

    i18n.changeLanguage(language);

    dispatch({
      type: 'SET_ONBOARDED',
      payload: { userId: user_id, token, localName, language },
    });
  };

  const setLanguage = async (lang: 'en' | 'hi') => {
    await SecureStore.setItemAsync('khaali_language', lang);
    i18n.changeLanguage(lang);
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
  };

  const updateStreak = (current: number, longest: number) => {
    SecureStore.setItemAsync('khaali_streak', JSON.stringify({ current, longest }));
    dispatch({ type: 'SET_STREAK', payload: { current, longest } });
  };

  const clearSession = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('khaali_token'),
      SecureStore.deleteItemAsync('khaali_user_id'),
      SecureStore.deleteItemAsync('khaali_local_name'),
      SecureStore.deleteItemAsync('khaali_language'),
      SecureStore.deleteItemAsync('khaali_streak'),
    ]);
    dispatch({ type: 'CLEAR_SESSION' });
  };

  return (
    <AppContext.Provider value={{ state, initSession, setLanguage, updateStreak, clearSession }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
