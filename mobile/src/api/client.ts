import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// In dev on Android emulator, 10.0.2.2 maps to the host machine's localhost
const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://10.0.2.2:3000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from SecureStore on every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('khaali_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Forward language preference so server AI responses match user language
  const lang = await SecureStore.getItemAsync('khaali_language');
  if (lang) {
    config.headers['Accept-Language'] = lang;
  }
  return config;
});

// ─── Typed API helpers ────────────────────────────────────────────────────────

export const authApi = {
  init: (deviceId: string, language: 'en' | 'hi') =>
    api.post('/auth/init', { device_id: deviceId, language }),
};

export const letterApi = {
  create: (theme?: string, content?: string) =>
    api.post('/letters', { theme, content: content ?? '' }),
  reflect: (id: string) => api.post(`/letters/${id}/reflect`),
  seal: (id: string, destination: 'private' | 'pool') =>
    api.post(`/letters/${id}/seal`, { destination }),
  mine: () => api.get('/letters/mine'),
};

export const checkinApi = {
  today: () => api.get('/checkin/today'),
  submit: (response: string) => api.post('/checkin', { response }),
};

export const bottleApi = {
  throw: (letterId: string) => api.post(`/bottles/throw/${letterId}`),
  sea: () => api.get('/bottles/sea'),
  keep: (bottleId: string) => api.post(`/bottles/${bottleId}/keep`),
  release: (bottleId: string) => api.post(`/bottles/${bottleId}/release`),
};

export const versionApi = {
  check: (platform: 'ios' | 'android', currentVersion: string) =>
    api.get('/app/version', { params: { platform, current_version: currentVersion } }),
};
