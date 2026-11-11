import axios from 'axios';

/** Single axios instance. The JWT lives in sessionStorage (documented trade-off). */
const api = axios.create({ baseURL: '/api', timeout: 30000 });

export const TOKEN_KEY = 'certichain_token';
export const USER_KEY = 'certichain_user';

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearSession();
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    return Promise.reject(err);
  }
);

/** Turn an axios error into a readable message (never expose raw internals). */
export function errorMessage(err) {
  return err?.response?.data?.error?.message || err?.message || 'Unexpected error.';
}

export default api;
