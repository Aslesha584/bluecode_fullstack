const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const AUTH_TOKEN_KEY = 'aiFounderOsAuthToken';

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, { ...options, headers });
  } catch {
    throw new Error(`Cannot reach the AI Founder OS backend at ${API_BASE_URL}. Start the server and check VITE_API_BASE_URL.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function authenticate({ mode, name, email, password }) {
  const path = mode === 'create' ? '/auth/register' : '/auth/login';
  const data = await apiRequest(path, {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
  if (!data.token) throw new Error('The server did not return an authentication token.');
  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  return data;
}

export async function getWorkspace() {
  return apiRequest('/workspace');
}
