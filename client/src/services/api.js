// All backend calls live here. The JWT is in an HTTP-only cookie, so the browser
// sends it automatically; we never touch the token from JavaScript.
async function request(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* response had no JSON body */
  }

  if (!res.ok) {
    const err = new Error((data && data.message) || `Request failed (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const authApi = {
  register: (form) => request('POST', '/api/auth/register', form),
  login: (form) => request('POST', '/api/auth/login', form),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me'),
};

export const applicationsApi = {
  list: ({ search = '', status = '' } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const qs = params.toString();
    return request('GET', `/api/applications${qs ? `?${qs}` : ''}`);
  },
  create: (data) => request('POST', '/api/applications', data),
  update: (id, data) => request('PUT', `/api/applications/${id}`, data),
  remove: (id) => request('DELETE', `/api/applications/${id}`),
};
