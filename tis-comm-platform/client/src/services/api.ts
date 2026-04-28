import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let inMemoryToken: string | null = null;
export function setAuthToken(t: string | null) {
  inMemoryToken = t;
  if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
  else delete api.defaults.headers.common['Authorization'];
}
export function getAuthToken() {
  return inMemoryToken;
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      setAuthToken(null);
    }
    return Promise.reject(err);
  }
);
